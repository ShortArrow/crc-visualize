import { FoldHorizontal, UnfoldHorizontal } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { parseConfig, type ConfigForm } from "./domain/parse";
import { findPreset, TUTORIAL } from "./domain/presets";
import { bitsFromBytes, trace, type Bit, type CrcParams, type ParamName } from "./domain/trace";
import { animationMs, initialPlayer, stepDurations, updatePlayer, type PlayerMsg, type SpeedMode } from "./playback/playback";
import { CodeView } from "./ui/CodeView";
import { ConfigPanel, formFromPreset } from "./ui/ConfigPanel";
import { Controls } from "./ui/Controls";
import { LfsrView } from "./ui/LfsrView";
import { NamesPage } from "./ui/NamesPage";
import { ParamHelp } from "./ui/ParamHelp";
import type { ParamFocus } from "./ui/paramFocus";
import { parseRoute, namesHash, type Route } from "./ui/route";
import { StepLog } from "./ui/StepLog";
import { initialSettings, persistSettings, type Settings } from "./settings";

const CHECK_BITS = bitsFromBytes([...new TextEncoder().encode("123456789")]);
const DEFAULT_SETTINGS: Settings = { form: formFromPreset(TUTORIAL), speedMode: "auto", rate: 1, loop: false, wide: false };
const sameBits = (a: readonly Bit[], b: readonly Bit[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function App() {
  const [restored] = useState(() => initialSettings(DEFAULT_SETTINGS));
  const [form, setForm] = useState<ConfigForm>(restored.form);
  const [speedMode, setSpeedMode] = useState<SpeedMode>(restored.speedMode);
  const [rate, setRate] = useState(restored.rate);
  const [loop, setLoop] = useState(restored.loop);
  const [wide, setWide] = useState(restored.wide);
  useEffect(() => persistSettings({ form, speedMode, rate, loop, wide }), [form, speedMode, rate, loop, wide]);
  const [focused, setFocused] = useState<ParamName | undefined>(undefined);
  const focus: ParamFocus = { focused, onFocus: setFocused };
  const config = useMemo(() => parseConfig(form), [form]);
  const preset = config.ok ? findPreset(config.params) : undefined;
  const route = useRoute();

  return (
    <main className={wide ? "wide" : ""}>
      <header>
        <div className="title">
          <h1>CRC 可視化</h1>
          <nav className="pages">
            <a href="#" className={route.page === "visualizer" ? "current" : ""}>
              可視化
            </a>
            <a href={namesHash()} className={route.page === "names" ? "current" : ""}>
              名前の規則
            </a>
          </nav>
          <button
            type="button"
            className="width-toggle"
            title={wide ? "横幅を制限する" : "横幅いっぱいに広げる"}
            aria-pressed={wide}
            onClick={() => setWide(!wide)}
          >
            {wide ? <FoldHorizontal size={18} /> : <UnfoldHorizontal size={18} />}
          </button>
        </div>
        <p>
          {route.page === "names"
            ? "プリセットの名前の付け方と、パラメータの呼び名の違いを示します。"
            : "LFSR の 1 クロックと、ビット単位 CRC 実装の 1 行を同期させて表示します。"}
        </p>
      </header>
      {route.page === "names" ? (
        <NamesPage target={route.param} />
      ) : (
        <>
          <ConfigPanel
            form={form}
            presetName={preset?.name}
            errors={config.ok ? {} : config.errors}
            onChange={setForm}
            focus={focus}
          />
          <ParamHelp focused={focused} params={config.ok ? config.params : undefined} />
          {config.ok ? (
            <Visualizer
              key={JSON.stringify([config.params, config.bits])}
              params={config.params}
              bits={config.bits}
              check={preset && sameBits(config.bits, CHECK_BITS) ? preset.check : undefined}
              speedMode={speedMode}
              rate={rate}
              loop={loop}
              focus={focus}
              onSpeedMode={setSpeedMode}
              onRate={setRate}
              onLoop={setLoop}
            />
          ) : (
            <p className="invalid-config">設定に誤りがあります。赤い項目を直してください。</p>
          )}
        </>
      )}
    </main>
  );
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
  check: number | undefined;
  speedMode: SpeedMode;
  rate: number;
  loop: boolean;
  focus: ParamFocus;
  onSpeedMode: (mode: SpeedMode) => void;
  onRate: (rate: number) => void;
  onLoop: (loop: boolean) => void;
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
  const { params, bits, check, speedMode, rate, loop, focus, onSpeedMode, onRate, onLoop } = props;
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

  return (
    <div className="visualizer" style={{ "--anim-ms": `${animMs}ms` } as CSSProperties}>
      <section className="pane hardware">
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
      <section className="pane software">
        <div>
          <h2>ソフトウェア</h2>
          <CodeView params={params} step={step} focus={focus} />
        </div>
        <div>
          <h2>経過</h2>
          <StepLog steps={steps} current={player.index} input={bits} check={check} />
        </div>
      </section>
    </div>
  );
}
