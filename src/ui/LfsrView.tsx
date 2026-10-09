import type { CSSProperties } from "react";
import { toRegister, type CrcParams, type Step } from "../domain/trace";
import { gateEquations } from "./gates";
import { lfsrLayout, type Point } from "./layout";

const GATE_R = 13;
const STREAM_PITCH = 22;
const BYTE_GAP = 8;
/** 幅の大きい CRC でも文字が読める最小の表示倍率。超える分は横スクロール。 */
const MIN_SCALE = 0.8;

type FeedbackState = "on" | "off" | "idle";

function feedbackState(step: Step): FeedbackState {
  switch (step.kind) {
    case "feedback":
    case "shift":
      return step.fb === 1 ? "on" : "off";
    case "xor":
      return "on";
    default:
      return "idle";
  }
}

/** ストリーム上のビット位置 k の x 座標（入力 XOR を原点とした相対値）。 */
const streamX = (k: number, grouped: boolean) => k * STREAM_PITCH + (grouped ? Math.floor(k / 8) * BYTE_GAP : 0);

/** ステップごとにレジスタ箱へ付けるアニメーション名。 */
function boxAnimation(params: CrcParams, step: Step, bit: number): string | undefined {
  switch (step.kind) {
    case "shift":
      return "slide";
    case "xor":
      return toRegister(params.poly, params.width)[bit] === 1 ? "flip" : undefined;
    case "reflectOut":
      return "mirror";
    case "xorOut":
      return toRegister(params.xorout, params.width)[bit] === 1 ? "flip" : undefined;
    default:
      return undefined;
  }
}

/** XOR ゲート（⊕）。id は "input" か入口にあるレジスタの番号。active はこのステップで計算に使われていること。 */
function XorGate({ at, id, active }: { at: Point; id: "input" | number; active: boolean }) {
  return (
    <g className={`gate ${active ? "active" : ""}`} data-gate={id} transform={`translate(${at.x} ${at.y})`}>
      <circle r={GATE_R} />
      <line x1={-GATE_R} x2={GATE_R} y1={0} y2={0} />
      <line x1={0} x2={0} y1={-GATE_R} y2={GATE_R} />
    </g>
  );
}

type Props = Readonly<{ params: CrcParams; step: Step; stepIndex: number }>;

/** LFSR（ハードウェア表現）。描画は step だけで決まり、アニメーションは stepIndex ごとに再生し直す。 */
export function LfsrView({ params, step, stepIndex }: Props) {
  const layout = lfsrLayout(params);
  const { box, regY, streamY, busY, busEndX, inputGate: ig, taps, entry } = layout;
  const w = params.width;
  const fbState = feedbackState(step);
  const fbClass = `wire fb-${fbState}`;
  const midY = regY + box / 2;
  const msbBoxX = layout.boxes[w - 1]!.x;
  const grouped = step.stream.length % 8 === 0 && step.stream.length > 0;
  const streamShift = -streamX(step.cursor, grouped);
  const reflectedByte = step.kind === "reflectIn" ? step.byteIndex : -1;
  const done = step.kind === "done";
  const equations = gateEquations(params, step);
  const activeGates = new Set(equations.map((e) => e.gate));

  return (
    <svg
      className="lfsr"
      viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
      style={{ minWidth: layout.viewWidth * MIN_SCALE }}
      role="img"
      aria-label="LFSR"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="stream-clip">
          <rect x={0} y={0} width={layout.viewWidth} height={streamY + 24} />
        </clipPath>
      </defs>

      <g clipPath="url(#stream-clip)">
        <g className="stream" style={{ transform: `translateX(${ig.x + streamShift}px)` }}>
          {step.stream.map((b, k) => {
            const state = k < step.cursor ? "used" : k === step.cursor ? "next" : "pending";
            const flip = Math.floor(k / 8) === reflectedByte;
            return (
              <text
                key={flip ? `${k}-${stepIndex}` : k}
                className={`stream-bit ${state} ${flip ? "flip-x" : ""}`}
                x={streamX(k, grouped)}
                y={streamY}
              >
                {b}
              </text>
            );
          })}
        </g>
      </g>
      <text className="label" x={8} y={streamY - 22}>
        入力 ({step.cursor}/{step.stream.length})
      </text>

      <line className="wire" x1={ig.x} y1={streamY + 8} x2={ig.x} y2={ig.y - GATE_R} />
      <line className="wire" x1={msbBoxX} y1={midY} x2={ig.x + GATE_R} y2={midY} />
      <polyline
        className={fbClass}
        points={`${ig.x},${ig.y + GATE_R} ${ig.x},${busY} ${busEndX},${busY}`}
        fill="none"
      />
      {taps.map((i) => {
        const e = entry(i);
        const points =
          i === 0
            ? `${e.x},${busY} ${e.x},${midY} ${layout.boxes[0]!.x + box},${midY}`
            : `${e.x},${busY} ${e.x},${midY + GATE_R}`;
        return <polyline key={i} className={fbClass} points={points} fill="none" />;
      })}
      {taps.includes(0) ? null : (
        <text className="label" x={entry(0).x - 4} y={midY + 5}>
          0
        </text>
      )}
      {layout.boxes.slice(1).map(({ bit, x }) => (
        <line key={bit} className="wire" x1={layout.boxes[bit - 1]!.x} y1={midY} x2={x + box} y2={midY} />
      ))}

      <XorGate at={ig} id="input" active={activeGates.has("input")} />
      {layout.gates.map((g) => (
        <XorGate key={g.bit} at={g} id={g.bit} active={activeGates.has(g.bit)} />
      ))}

      {layout.boxes.map(({ bit, x, y }) => {
        const anim = boxAnimation(params, step, bit);
        const isMsb = bit === w - 1 && step.kind === "feedback";
        const classes = ["reg", isMsb ? "msb" : "", anim === "flip" ? "hit" : "", done ? "done" : ""].join(" ");
        const style = { "--slide-from": `${layout.pitch}px` } as CSSProperties;
        return (
          <g key={bit} className={classes} data-bit={bit} transform={`translate(${x} ${y})`}>
            <rect width={box} height={box} rx={6} />
            <text
              key={anim ? `${anim}-${stepIndex}` : "static"}
              className={`reg-bit ${anim ?? ""}`}
              style={style}
              x={box / 2}
              y={box / 2 + 8}
            >
              {step.reg[bit]}
            </text>
            <text className="reg-name" x={box / 2} y={-8}>
              r{bit}
            </text>
          </g>
        );
      })}

      {equations.map(({ gate, text }) =>
        gate === "input" ? (
          <text
            key={`${gate}-${stepIndex}`}
            className="gate-eq"
            data-gate={gate}
            x={ig.x + GATE_R + 6}
            y={busY - 10}
          >
            msb⊕b=fb : {text}
          </text>
        ) : (
          <text
            key={`${gate}-${stepIndex}`}
            className="gate-eq tap"
            data-gate={gate}
            x={entry(gate).x}
            y={regY - 26}
          >
            {text}
          </text>
        ),
      )}
      <FeedbackLabel step={step} at={{ x: ig.x + GATE_R + 6, y: busY - 10 }} />
    </svg>
  );
}

/** shift と xor の間、確定したフィードバック値 fb を入力ゲートの下に残す。 */
function FeedbackLabel({ step, at }: { step: Step; at: Point }) {
  if (step.kind === "shift" || step.kind === "xor") {
    const fb = step.kind === "xor" ? 1 : step.fb;
    return (
      <text className={`fb-label fb-${fb === 1 ? "on" : "off"}`} x={at.x} y={at.y}>
        fb {fb}
      </text>
    );
  }
  return null;
}
