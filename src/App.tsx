import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { parseConfig, type ConfigForm, type ConfigResult } from "./domain/parse";
import { fitPath, matching } from "./domain/narrow";
import { CATALOGUE, findPreset, TUTORIAL, type Preset } from "./domain/presets";
import { MessagesProvider, useMessages } from "./i18n/I18n";
import { pickLocale, type Locale } from "./i18n/locale";
import { MESSAGES } from "./i18n/messages";
import { bitsFromBytes, trace, type Bit, type CrcParams, type ParamName } from "./domain/trace";
import { breakIndices, toggleBit, toggleByte, toggleLine, type Breakpoint } from "./playback/breakpoints";
import { animationMs, initialPlayer, stepDurations, updatePlayer, type PlayerMsg, type SpeedMode } from "./playback/playback";
import { BreakpointList } from "./ui/BreakpointList";
import type { CodeLang } from "./ui/code";
import { CodeLangSelect, CodeView } from "./ui/CodeView";
import { ConfigPanel, formFromParams, formFromPreset } from "./ui/ConfigPanel";
import { Controls } from "./ui/Controls";
import { Docked } from "./ui/Dock";
import { followElements } from "./ui/follow";
import { LfsrView } from "./ui/LfsrView";
import { logEntries } from "./ui/log";
import { NamesPage, NamesToc } from "./ui/NamesPage";
import { CyclicPage } from "./ui/CyclicPage";
import { RedundancyPage } from "./ui/RedundancyPage";
import { EquivalencePage } from "./ui/EquivalencePage";
import { CheckPage } from "./ui/CheckPage";
import { EstimatePage, EstimateSidebar } from "./ui/EstimatePage";
import { TablePage } from "./ui/TablePage";
import { CurrentSettingsSidebar } from "./ui/CurrentSettingsSidebar";
import { GeneratorSidebar, generatorStatus } from "./ui/GeneratorSidebar";
import { NarrowPage, NarrowSidebar } from "./ui/NarrowPage";
import { ParamHelp } from "./ui/ParamHelp";
import type { ParamFocus } from "./ui/paramFocus";
import type { FieldName } from "./ui/paramInfo";
import { parseRoute, type Route } from "./ui/route";
import { Splitter } from "./ui/Splitter";
import { SidebarSections } from "./ui/SidebarSections";
import { FramePanel } from "./ui/FramePanel";
import { StepLog } from "./ui/StepLog";
import { VariablesView } from "./ui/VariablesView";
import { Workbench } from "./ui/Workbench";
import { fitLayout, loadLayout, saveLayout, type PaneLayout } from "./ui/panes";
import { usePhone } from "./ui/phone";
import { screenZoom, viewWidth } from "./ui/zoom";
import { initialSettings, persistSettings, type Settings } from "./settings";

const CHECK_BITS = bitsFromBytes([...new TextEncoder().encode("123456789")]);
const DEFAULT_SETTINGS: Settings = {
  form: formFromPreset(TUTORIAL),
  speedMode: "auto",
  rate: 1,
  loop: false,
  codeLang: "pseudo",
  locale: pickLocale(navigator.languages),
  breakpoints: [],
};
const sameBits = (a: readonly Bit[], b: readonly Bit[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Takes the editor area and status bar contents and fits them into the screen frame. */
type Frame = (editor: ReactNode, status: ReactNode) => ReactNode;

export function App() {
  const [restored] = useState(() => initialSettings(DEFAULT_SETTINGS));
  const [locale, setLocale] = useState<Locale>(restored.locale);
  return (
    <MessagesProvider value={MESSAGES[locale]}>
      <Screen restored={restored} locale={locale} onLocale={setLocale} />
    </MessagesProvider>
  );
}

type ScreenProps = Readonly<{ restored: Settings; locale: Locale; onLocale: (locale: Locale) => void }>;

/** Assembles the page and screen frame within the display language. */
function Screen({ restored, locale, onLocale }: ScreenProps) {
  const [form, setForm] = useState<ConfigForm>(restored.form);
  const [speedMode, setSpeedMode] = useState<SpeedMode>(restored.speedMode);
  const [rate, setRate] = useState(restored.rate);
  const [loop, setLoop] = useState(restored.loop);
  const [codeLang, setCodeLang] = useState<CodeLang>(restored.codeLang);
  const [breakpoints, setBreakpoints] = useState<readonly Breakpoint[]>(restored.breakpoints);
  const [estimateCount, setEstimateCount] = useState<number | undefined>(undefined);
  useEffect(
    () => persistSettings({ form, speedMode, rate, loop, codeLang, locale, breakpoints }),
    [form, speedMode, rate, loop, codeLang, locale, breakpoints],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const m = useMessages();
  const [layout, setLayout] = useLayout();
  const [focused, setFocused] = useState<ParamName | undefined>(undefined);
  const focus: ParamFocus = { focused, onFocus: setFocused };
  const [hoveredField, setHoveredField] = useState<FieldName | undefined>(undefined);
  const config = useMemo(() => parseConfig(form), [form]);
  const shown = useLastValid(config);
  const preset = config.ok ? findPreset(config.params) : undefined;
  const route = useRoute();

  const settingsBody = (
    <>
      <ConfigPanel
        form={form}
        params={config.ok ? config.params : undefined}
        presetName={preset?.name}
        errors={config.ok ? {} : config.errors}
        onChange={setForm}
        focus={focus}
        onFieldHover={setHoveredField}
      />
      <FramePanel
        form={form}
        params={config.ok ? config.params : undefined}
        rangeError={config.ok ? undefined : config.errors.range}
        onChange={setForm}
        onFieldHover={setHoveredField}
      />
      <ParamHelp topic={focused ?? hoveredField} params={config.ok ? config.params : undefined} />
    </>
  );
  const frame =
    (sidebar: ReactNode): Frame =>
    (editor, status) => (
      <Workbench
        route={route}
        layout={layout}
        onLayout={setLayout}
        locale={locale}
        onLocale={onLocale}
        sidebar={sidebar}
        editor={editor}
        status={status}
      />
    );

  if (route.page === "names") {
    return frame(<NamesToc />)(<NamesPage target={route.param} />, <span>{m.pages.names}</span>);
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
      <span>{m.narrow.status(matching(CATALOGUE, path.fixed).length)}</span>,
    );
  }
  if (route.page === "cyclic" || route.page === "redundancy") {
    const { page, generator } = route;
    const key = `${generator.width}/${generator.poly}`;
    return frame(<GeneratorSidebar page={page} generator={generator} />)(
      page === "cyclic" ? <CyclicPage key={key} generator={generator} /> : <RedundancyPage key={key} generator={generator} />,
      <span>{generatorStatus(generator)}</span>,
    );
  }
  if (route.page === "estimate") {
    const open = (params: CrcParams, input: Preset["input"]) => {
      setForm(formFromParams(params, input));
      location.hash = "";
    };
    return frame(<EstimateSidebar />)(
      <EstimatePage onOpen={open} onCount={setEstimateCount} />,
      <span>{estimateCount === undefined ? m.pages.estimate : m.estimate.status(estimateCount)}</span>,
    );
  }
  if (route.page === "equivalence" || route.page === "check" || route.page === "table") {
    return frame(<CurrentSettingsSidebar config={config} />)(
      {
        check: <CheckPage key={JSON.stringify(config)} config={config} preset={preset} />,
        table: <TablePage key={JSON.stringify(config)} config={config} />,
        equivalence: <EquivalencePage config={config} />,
      }[route.page],
      <span>{config.ok ? (preset?.name ?? "custom") : m.settings.invalidStatus}</span>,
    );
  }
  return (
    <Visualizer
      params={shown.params}
      bits={shown.bits}
      invalid={!config.ok}
      presetName={preset?.name ?? "custom"}
      check={preset && sameBits(shown.bits, CHECK_BITS) ? preset.check : undefined}
      speedMode={speedMode}
      rate={rate}
      loop={loop}
      codeLang={codeLang}
      focus={focus}
      inputHovered={hoveredField === "input"}
      layout={layout}
      settings={settingsBody}
      breakpoints={breakpoints}
      onBreakpoints={setBreakpoints}
      frame={frame}
      onSpeedMode={setSpeedMode}
      onRate={setRate}
      onLoop={setLoop}
      onCodeLang={setCodeLang}
      onLayout={setLayout}
    />
  );
}

/**
 * The parameters and bits of config, or while config is invalid, those of the last valid config (CRC-3/TUTORIAL with no input
 * before there was one). The visualizer keeps them so it stays mounted, and the field being typed in keeps its focus.
 */
function useLastValid(config: ConfigResult): Readonly<{ params: CrcParams; bits: Bit[] }> {
  const last = useRef(config.ok ? config : { params: TUTORIAL.params, bits: [] as Bit[] });
  if (config.ok) last.current = config;
  return last.current;
}

/** Screen layout; restored from localStorage and fitted to the current screen, saved on every change. Ctrl+B (⌘+B) toggles the sidebar. */
function useLayout(): [PaneLayout, (layout: PaneLayout) => void] {
  const [layout, setLayout] = useState(() => fitLayout(loadLayout(), viewWidth()));
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

/** The page the URL fragment points to; re-read whenever the fragment changes. */
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
  /** The settings are invalid: params and bits are the last valid ones, and only the settings are shown. */
  invalid: boolean;
  presetName: string;
  check: number | undefined;
  speedMode: SpeedMode;
  rate: number;
  loop: boolean;
  codeLang: CodeLang;
  focus: ParamFocus;
  /** Whether the input field is under the mouse or focus, which highlights the input stream. */
  inputHovered: boolean;
  layout: PaneLayout;
  /** The settings panel and the description pane, shown in the Settings section of the sidebar. */
  settings: ReactNode;
  breakpoints: readonly Breakpoint[];
  onBreakpoints: (breakpoints: readonly Breakpoint[]) => void;
  /** Fits the editor area and status bar into the screen frame with the given sidebar. */
  frame: (sidebar: ReactNode) => Frame;
  onSpeedMode: (mode: SpeedMode) => void;
  onRate: (rate: number) => void;
  onLoop: (loop: boolean) => void;
  onCodeLang: (lang: CodeLang) => void;
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

/** Parts of the diagram that take part in the step shown. */
const ACTIVE_PARTS = ".reg.msb, .reg.hit, .gate.active, .fb-box.arriving";

/**
 * Step sequence and playback state for one configuration; when the configuration changes, playback goes back to the first step and
 * stops. While the settings are invalid, the sidebar has only the settings and the editor area says so.
 * On a phone it has no splitters: the controls are docked, the diagram stays on top at a readable size, and the code and the log
 * scroll below it. On any screen, a diagram wider than its area scrolls sideways, and at each step it is scrolled to bring the parts
 * being computed (ACTIVE_PARTS) into view.
 */
function Visualizer(props: VisualizerProps) {
  const {
    params,
    bits,
    invalid,
    presetName,
    check,
    speedMode,
    rate,
    loop,
    codeLang,
    focus,
    inputHovered,
    layout,
    settings,
    breakpoints,
    frame,
  } = props;
  const { onSpeedMode, onRate, onLoop, onCodeLang, onLayout, onBreakpoints } = props;
  const m = useMessages();
  const phone = usePhone();
  const split = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const hardware = useRef<HTMLElement>(null);
  const ratioIn = (el: HTMLElement | null, f: (rect: DOMRect) => number) => {
    if (!el) return 0.5;
    const [r, z] = [el.getBoundingClientRect(), screenZoom()];
    return f(new DOMRect(r.x / z, r.y / z, r.width / z, r.height / z));
  };
  const run = JSON.stringify([params, bits]);
  const steps = useMemo(() => trace(params, bits), [run]);
  const durations = useMemo(() => stepDurations(steps, speedMode), [steps, speedMode]);
  const [playerState, setPlayer] = useState(initialPlayer);
  const [playerRun, setPlayerRun] = useState(run);
  if (playerRun !== run) {
    setPlayerRun(run);
    setPlayer(initialPlayer);
  }
  const player = playerRun === run ? playerState : initialPlayer;
  const send = (msg: PlayerMsg) => setPlayer((p) => updatePlayer(p, msg, steps.length));
  const breaks = useMemo(() => breakIndices(steps, breakpoints), [steps, breakpoints]);
  const lineBreaks = new Map(breakpoints.flatMap((b) => (b.kind === "line" ? [[b.runs, b.enabled] as const] : [])));
  const byteBreaks = new Map(breakpoints.flatMap((b) => (b.kind === "byte" ? [[b.byte, b.enabled] as const] : [])));
  const bitBreaks = new Map(breakpoints.flatMap((b) => (b.kind === "bit" ? [[b.bit, b.enabled] as const] : [])));
  const step = steps[player.index]!;
  const stepMs = durations[player.index]! / rate;
  const animMs = animationMs(stepMs);

  useEffect(() => {
    if (!player.playing) return;
    const timer = setTimeout(() => send({ type: "tick", loop, breaks }), stepMs);
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

  useEffect(() => {
    if (hardware.current) followElements(hardware.current, ACTIVE_PARTS);
  }, [phone, player.index]);

  const [latest] = logEntries(steps, player.index, 1, m);
  const variables = <VariablesView steps={steps} index={player.index} />;
  const sidebar = (
    <SidebarSections
      sections={[
        { id: "settings", title: m.settings.heading, body: settings },
        ...(phone || invalid ? [] : [{ id: "variables", title: m.debug.variables, body: variables }]),
        ...(invalid
          ? []
          : [
              {
                id: "breakpoints",
                title: m.debug.breakpoints,
                body: (
                  <BreakpointList
                    breakpoints={breakpoints}
                    params={params}
                    steps={steps}
                    index={player.index}
                    lang={codeLang}
                    onChange={onBreakpoints}
                  />
                ),
              },
            ]),
      ]}
    />
  );
  if (invalid) {
    return frame(sidebar)(<p className="invalid-config">{m.settings.invalid}</p>, <span>{m.settings.invalidStatus}</span>);
  }

  return frame(sidebar)(
    <div className="visualizer" style={{ "--anim-ms": `${animMs}ms` } as CSSProperties}>
      <Docked>
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
      </Docked>
      <div
        className="viz-split"
        ref={split}
        style={
          phone ? undefined : { gridTemplateRows: `minmax(0, ${1 - layout.panelRatio}fr) auto minmax(0, ${layout.panelRatio}fr)` }
        }
      >
        <section className="hardware" ref={hardware}>
          <h2>
            {m.visualizer.hardware}
            <span className="legend">
              {m.visualizer.legend.xor}
              <span className="swatch hot">{m.visualizer.legend.one}</span>
              <span className="swatch zero">{m.visualizer.legend.zero}</span>
              <span className="swatch warn">{m.visualizer.legend.busy}</span>
              <span className="swatch ok">{m.visualizer.legend.crc}</span>
              <span className="swatch param">{m.visualizer.legend.param}</span>
            </span>
          </h2>
          <LfsrView
            params={params}
            step={step}
            next={steps[player.index + 1]}
            stepIndex={player.index}
            animMs={animMs}
            focused={focus.focused ?? (inputHovered ? "input" : undefined)}
            byteBreaks={byteBreaks}
            onToggleByte={(k) => onBreakpoints(toggleByte(breakpoints, k))}
            bitBreaks={bitBreaks}
            onToggleBit={(n) => onBreakpoints(toggleBit(breakpoints, n))}
          />
        </section>
        {phone ? null : (
          <Splitter
            axis="y"
            name="panel"
            onMove={(y) =>
              onLayout(
                fitLayout({ ...layout, panelRatio: ratioIn(split.current, (r) => (r.bottom - y) / r.height) }, viewWidth()),
              )
            }
          />
        )}
        <section
          className="panel"
          ref={panel}
          style={{ gridTemplateColumns: `minmax(0, ${layout.codeRatio}fr) auto minmax(0, ${1 - layout.codeRatio}fr)` }}
        >
          <div className="software">
            <h2>
              {m.visualizer.software}
              <CodeLangSelect value={codeLang} onChange={onCodeLang} />
            </h2>
            <CodeView
              params={params}
              step={step}
              focus={focus}
              lang={codeLang}
              lineBreaks={lineBreaks}
              onToggleLine={(runs) => onBreakpoints(toggleLine(breakpoints, runs))}
            />
          </div>
          {phone ? (
            <div className="variables-pane">
              <h2>{m.debug.variables}</h2>
              {variables}
            </div>
          ) : null}
          {phone ? null : (
            <Splitter
              axis="x"
              name="code"
              onMove={(x) =>
                onLayout(fitLayout({ ...layout, codeRatio: ratioIn(panel.current, (r) => (x - r.left) / r.width) }, viewWidth()))
              }
            />
          )}
          <div className="log-pane">
            <h2>{m.visualizer.log}</h2>
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
