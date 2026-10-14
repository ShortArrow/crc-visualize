import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { parseConfig, type ConfigForm } from "./domain/parse";
import { fitPath, matching } from "./domain/narrow";
import { CATALOGUE, findPreset, TUTORIAL, type Preset } from "./domain/presets";
import { bitsFromBytes, trace, type Bit, type CrcParams, type ParamName } from "./domain/trace";
import { animationMs, initialPlayer, stepDurations, updatePlayer, type PlayerMsg, type SpeedMode } from "./playback/playback";
import { CodeView } from "./ui/CodeView";
import { ConfigPanel, formFromPreset } from "./ui/ConfigPanel";
import { Controls } from "./ui/Controls";
import { LfsrView } from "./ui/LfsrView";
import { logEntries } from "./ui/log";
import { NamesPage, NamesToc } from "./ui/NamesPage";
import { NarrowPage, NarrowSidebar } from "./ui/NarrowPage";
import { ParamHelp } from "./ui/ParamHelp";
import type { ParamFocus } from "./ui/paramFocus";
import type { FieldName } from "./ui/paramInfo";
import { parseRoute, type Route } from "./ui/route";
import { Splitter } from "./ui/Splitter";
import { StepLog } from "./ui/StepLog";
import { Workbench } from "./ui/Workbench";
import { fitLayout, loadLayout, saveLayout, type PaneLayout } from "./ui/panes";
import { initialSettings, persistSettings, type Settings } from "./settings";

const CHECK_BITS = bitsFromBytes([...new TextEncoder().encode("123456789")]);
const DEFAULT_SETTINGS: Settings = { form: formFromPreset(TUTORIAL), speedMode: "auto", rate: 1, loop: false };
const sameBits = (a: readonly Bit[], b: readonly Bit[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** エディタ領域とステータスバーの中身を受け取り、画面の枠に収める。 */
type Frame = (editor: ReactNode, status: ReactNode) => ReactNode;

export function App() {
  const [restored] = useState(() => initialSettings(DEFAULT_SETTINGS));
  const [form, setForm] = useState<ConfigForm>(restored.form);
  const [speedMode, setSpeedMode] = useState<SpeedMode>(restored.speedMode);
  const [rate, setRate] = useState(restored.rate);
  const [loop, setLoop] = useState(restored.loop);
  useEffect(() => persistSettings({ form, speedMode, rate, loop }), [form, speedMode, rate, loop]);
  const [layout, setLayout] = useLayout();
  const [focused, setFocused] = useState<ParamName | undefined>(undefined);
  const focus: ParamFocus = { focused, onFocus: setFocused };
  const [hoveredField, setHoveredField] = useState<FieldName | undefined>(undefined);
  const config = useMemo(() => parseConfig(form), [form]);
  const preset = config.ok ? findPreset(config.params) : undefined;
  const route = useRoute();

  const settingsSidebar = (
    <>
      <h2>設定</h2>
      <ConfigPanel
        form={form}
        presetName={preset?.name}
        errors={config.ok ? {} : config.errors}
        onChange={setForm}
        focus={focus}
        onFieldHover={setHoveredField}
      />
      <ParamHelp topic={focused ?? hoveredField} params={config.ok ? config.params : undefined} />
    </>
  );
  const frame =
    (sidebar: ReactNode): Frame =>
    (editor, status) => (
      <Workbench route={route} layout={layout} onLayout={setLayout} sidebar={sidebar} editor={editor} status={status} />
    );

  if (route.page === "names") {
    return frame(<NamesToc />)(<NamesPage target={route.param} />, <span>名前の規則</span>);
  }
  if (route.page === "narrow") {
    const path = fitPath(CATALOGUE, route.path);
    const open = (p: Preset) => {
      setForm(formFromPreset(p));
      location.hash = "";
    };
    const props = { presets: CATALOGUE, path, onOpen: open };
    return frame(<NarrowSidebar {...props} />)(
      <NarrowPage {...props} />,
      <span>絞り込み: 候補 {matching(CATALOGUE, path.fixed).length}</span>,
    );
  }
  if (!config.ok) {
    return frame(settingsSidebar)(
      <p className="invalid-config">設定に誤りがあります。赤い項目を直してください。</p>,
      <span>設定に誤りがあります</span>,
    );
  }
  return (
    <Visualizer
      key={JSON.stringify([config.params, config.bits])}
      params={config.params}
      bits={config.bits}
      presetName={preset?.name ?? "custom"}
      check={preset && sameBits(config.bits, CHECK_BITS) ? preset.check : undefined}
      speedMode={speedMode}
      rate={rate}
      loop={loop}
      focus={focus}
      layout={layout}
      frame={frame(settingsSidebar)}
      onSpeedMode={setSpeedMode}
      onRate={setRate}
      onLoop={setLoop}
      onLayout={setLayout}
    />
  );
}

/** 画面割り。localStorage から復元して今の画面に収め、変えるたびに保存する。Ctrl+B（⌘+B）でサイドバーを開閉する。 */
function useLayout(): [PaneLayout, (layout: PaneLayout) => void] {
  const [layout, setLayout] = useState(() => fitLayout(loadLayout(), innerWidth));
  useEffect(() => saveLayout(layout), [layout]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "b") return;
      e.preventDefault();
      setLayout((l) => ({ ...l, sidebarOpen: !l.sidebarOpen }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return [layout, setLayout];
}

/** URL のフラグメントが指すページ。フラグメントが変わるたびに読み直す。 */
function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

type VisualizerProps = Readonly<{
  params: CrcParams;
  bits: Bit[];
  presetName: string;
  check: number | undefined;
  speedMode: SpeedMode;
  rate: number;
  loop: boolean;
  focus: ParamFocus;
  layout: PaneLayout;
  frame: Frame;
  onSpeedMode: (mode: SpeedMode) => void;
  onRate: (rate: number) => void;
  onLoop: (loop: boolean) => void;
  onLayout: (layout: PaneLayout) => void;
}>;

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);

const KEY_MSG: Record<string, PlayerMsg> = {
  " ": { type: "toggle" },
  ArrowLeft: { type: "prev" },
  ArrowRight: { type: "next" },
  Home: { type: "first" },
  End: { type: "last" },
};

/** 1 つの設定に対するステップ列と再生状態。設定が変わると key で作り直され、先頭・停止に戻る。 */
function Visualizer(props: VisualizerProps) {
  const { params, bits, presetName, check, speedMode, rate, loop, focus, layout, frame, onSpeedMode, onRate, onLoop, onLayout } =
    props;
  const split = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const ratioIn = (el: HTMLElement | null, f: (rect: DOMRect) => number) => (el ? f(el.getBoundingClientRect()) : 0.5);
  const steps = useMemo(() => trace(params, bits), [params, bits]);
  const durations = useMemo(() => stepDurations(steps, speedMode), [steps, speedMode]);
  const [player, setPlayer] = useState(initialPlayer);
  const send = (msg: PlayerMsg) => setPlayer((p) => updatePlayer(p, msg, steps.length));
  const step = steps[player.index]!;
  const stepMs = durations[player.index]! / rate;
  const animMs = animationMs(stepMs);

  useEffect(() => {
    if (!player.playing) return;
    const timer = setTimeout(() => send({ type: "tick", loop }), stepMs);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const msg = KEY_MSG[e.key];
      if (msg) send(msg);
      else if (e.key.toLowerCase() === "l") onLoop(!loop);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const [latest] = logEntries(steps, player.index, 1);

  return frame(
    <div className="visualizer" style={{ "--anim-ms": `${animMs}ms` } as CSSProperties}>
      <Controls
        player={player}
        length={steps.length}
        speedMode={speedMode}
        rate={rate}
        loop={loop}
        send={send}
        onSpeedMode={onSpeedMode}
        onRate={onRate}
        onLoop={onLoop}
      />
      <div
        className="viz-split"
        ref={split}
        style={{ gridTemplateRows: `minmax(0, ${1 - layout.panelRatio}fr) auto minmax(0, ${layout.panelRatio}fr)` }}
      >
        <section className="hardware">
          <h2>
            ハードウェア（LFSR）
            <span className="legend">
              ⊕ = XOR（2 入力が異なれば 1）
              <span className="swatch hot">赤 = 値 1</span>
              <span className="swatch zero">白 = 値 0</span>
              <span className="swatch warn">黄 = 計算中</span>
              <span className="swatch ok">緑 = CRC</span>
              <span className="swatch param">水色 = 注目中のパラメータ</span>
            </span>
          </h2>
          <LfsrView
            params={params}
            step={step}
            next={steps[player.index + 1]}
            stepIndex={player.index}
            animMs={animMs}
            focused={focus.focused}
          />
        </section>
        <Splitter
          axis="y"
          name="panel"
          onMove={(y) =>
            onLayout(fitLayout({ ...layout, panelRatio: ratioIn(split.current, (r) => (r.bottom - y) / r.height) }, innerWidth))
          }
        />
        <section
          className="panel"
          ref={panel}
          style={{ gridTemplateColumns: `minmax(0, ${layout.codeRatio}fr) auto minmax(0, ${1 - layout.codeRatio}fr)` }}
        >
          <div className="software">
            <h2>ソフトウェア</h2>
            <CodeView params={params} step={step} focus={focus} />
          </div>
          <Splitter
            axis="x"
            name="code"
            onMove={(x) =>
              onLayout(fitLayout({ ...layout, codeRatio: ratioIn(panel.current, (r) => (x - r.left) / r.width) }, innerWidth))
            }
          />
          <div className="log-pane">
            <h2>経過</h2>
            <StepLog steps={steps} current={player.index} input={bits} check={check} />
          </div>
        </section>
      </div>
    </div>,
    <>
      <span className="status-preset">{presetName}</span>
      <span className="status-step">{latest!.title}</span>
      <span className="status-crc">
        crc = {latest!.bin} {latest!.hex}
      </span>
    </>,
  );
}
