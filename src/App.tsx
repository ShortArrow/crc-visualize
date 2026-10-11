import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { parseConfig, type ConfigForm } from "./domain/parse";
import { findPreset, TUTORIAL } from "./domain/presets";
import { bitsFromBytes, trace, type Bit, type CrcParams, type ParamName } from "./domain/trace";
import { initialPlayer, stepDurations, updatePlayer, type PlayerMsg, type SpeedMode } from "./playback/playback";
import { CodeView } from "./ui/CodeView";
import { ConfigPanel, formFromPreset } from "./ui/ConfigPanel";
import { Controls } from "./ui/Controls";
import { LfsrView } from "./ui/LfsrView";
import { ParamHelp } from "./ui/ParamHelp";
import type { ParamFocus } from "./ui/paramFocus";
import { StepLog } from "./ui/StepLog";

const CHECK_BITS = bitsFromBytes([...new TextEncoder().encode("123456789")]);
const sameBits = (a: readonly Bit[], b: readonly Bit[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function App() {
  const [form, setForm] = useState<ConfigForm>(() => formFromPreset(TUTORIAL));
  const [speedMode, setSpeedMode] = useState<SpeedMode>("auto");
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [focused, setFocused] = useState<ParamName | undefined>(undefined);
  const focus: ParamFocus = { focused, onFocus: setFocused };
  const config = useMemo(() => parseConfig(form), [form]);
  const preset = config.ok ? findPreset(config.params) : undefined;

  return (
    <main>
      <header>
        <h1>CRC 可視化</h1>
        <p>LFSR の 1 クロックと、ビット単位 CRC 実装の 1 行を同期させて表示します。</p>
      </header>
      <ConfigPanel form={form} presetName={preset?.name} errors={config.ok ? {} : config.errors} onChange={setForm} focus={focus} />
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
    </main>
  );
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
  const animMs = Math.min(stepMs * 0.8, 600);

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
        <LfsrView params={params} step={step} next={steps[player.index + 1]} stepIndex={player.index} animMs={animMs} focused={focus.focused} />
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
