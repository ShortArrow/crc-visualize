import { useEffect, useRef, type CSSProperties } from "react";
import { toRegister, type Bit, type CrcParams, type ParamName, type Step } from "../domain/trace";
import { lfsrLayout, type Point } from "./layout";
import { routeKeyframes } from "./motion";
import { particles, wireLevels, type Particle } from "./signals";

const STREAM_PITCH = 22;
const BYTE_GAP = 8;
/** 幅の大きい CRC でも文字が読める最小の表示倍率。超える分は横スクロール。 */
const MIN_SCALE = 0.8;

/**
 * 前半・後半それぞれで粒が経路を進む時間の、ステップのアニメーション時間に対する割合。
 * 後半の粒が届くのは 2 倍の時点で、styles.css の after-gate と flip の時間をこれに揃える。
 */
const PHASE_SHARE = 0.4;
/** 光彩の範囲を図の外側へ広げる量。箱やゲートは translate した座標で描くため、その分の余白を取る。 */
const GLOW_MARGIN = 200;

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
function XorGate(props: { at: Point; r: number; id: "input" | number; active: boolean; highlight: boolean }) {
  const { at, r, id, active, highlight } = props;
  return (
    <g className={`gate ${active ? "active" : ""} ${highlight ? "param-hl" : ""}`} data-gate={id} transform={`translate(${at.x} ${at.y})`}>
      <circle r={r} />
      <line x1={-r} x2={r} y1={0} y2={0} />
      <line x1={0} x2={0} y1={-r} y2={r} />
    </g>
  );
}

/** 値の流れる配線。level が undefined なら何も流れていない。 */
function Wire(props: { name: string; points: readonly Point[]; level: Bit | undefined; className?: string }) {
  const { name, points, level, className = "" } = props;
  return (
    <polyline
      className={`wire ${className}`}
      data-wire={name}
      data-level={level ?? "none"}
      points={points.map((p) => `${p.x},${p.y}`).join(" ")}
      fill="none"
    />
  );
}

/**
 * 経路 points に沿って動く値の粒。delayMs までは見えず、durationMs で終点に届いたら消える。
 * 届いた値は配線の色が引き継ぐ。
 */
function ParticleDot(props: { route: string; value: Bit; points: readonly Point[]; delayMs: number; durationMs: number }) {
  const { route, value, points, delayMs, durationMs } = props;
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.animate(routeKeyframes(points), { delay: delayMs, duration: durationMs, easing: "ease-in-out", fill: "both" });
    el?.animate([{ opacity: 0 }, { opacity: 1 }], { delay: delayMs, duration: 1, fill: "both" });
    el?.animate([{ opacity: 1 }, { opacity: 0 }], { delay: delayMs + durationMs, duration: durationMs / 2, fill: "forwards" });
  }, []);
  const start = points[0]!;
  return (
    <g ref={ref} className={`particle v${value}`} data-route={route} style={{ transform: `translate(${start.x}px, ${start.y}px)` }}>
      <circle r={10} />
      <text y={5}>{value}</text>
    </g>
  );
}

type Props = Readonly<{
  params: CrcParams;
  step: Step;
  stepIndex: number;
  /** このステップのアニメーション時間。 */
  animMs: number;
  focused: ParamName | undefined;
}>;

/** 注目中のパラメータが図のどこに効くか。 */
const PARAM_TARGET: Record<ParamName, "registers" | "taps" | "stream"> = {
  width: "registers",
  poly: "taps",
  init: "registers",
  refin: "stream",
  refout: "registers",
  xorout: "registers",
};

/**
 * LFSR（ハードウェア表現）。描画は step だけで決まり、アニメーションは stepIndex ごとに再生し直す。
 * 値の流れは配線の色（wireLevels）と粒（particles）で示し、計算式の文字列は出さない。
 */
export function LfsrView({ params, step, stepIndex, animMs, focused }: Props) {
  const layout = lfsrLayout(params);
  const { box, regY, streamY, busY, busEndX, gateR, inputGate: ig, taps, entry } = layout;
  const w = params.width;
  const levels = wireLevels(params, step);
  const midY = regY + box / 2;
  const grouped = step.stream.length % 8 === 0 && step.stream.length > 0;
  const streamShift = -streamX(step.cursor, grouped);
  const reflectedByte = step.kind === "reflectIn" ? step.byteIndex : -1;
  const done = step.kind === "done";
  const activeGates = new Set<"input" | number>(
    step.kind === "feedback" ? ["input"] : step.kind === "xor" ? layout.gates.map((g) => g.bit) : [],
  );
  const afterGate = step.kind === "feedback" ? "after-gate" : "";
  const routeOf = (route: Particle["route"]) => {
    if (route === "input") return layout.inputRoute;
    if (route === "msb") return layout.msbRoute;
    const [kind, i] = route.split("-");
    return kind === "tap" ? layout.tapRoute(Number(i)) : layout.outRoute(Number(i));
  };
  const phaseMs = animMs * PHASE_SHARE;
  const target = focused ? PARAM_TARGET[focused] : undefined;
  const hl = (kind: typeof target) => (target === kind ? "param-hl" : "");

  return (
    <svg
      className="lfsr"
      viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
      style={{ minWidth: layout.viewWidth * MIN_SCALE }}
      role="img"
      aria-label="LFSR"
    >
      <defs>
        <filter
          id="glow"
          filterUnits="userSpaceOnUse"
          x={-GLOW_MARGIN}
          y={-GLOW_MARGIN}
          width={layout.viewWidth + 2 * GLOW_MARGIN}
          height={layout.viewHeight + 2 * GLOW_MARGIN}
        >
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
        <g className={`stream ${hl("stream")}`} style={{ transform: `translateX(${ig.x + streamShift}px)` }}>
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
        入力ビット（{step.cursor}/{step.stream.length}）
      </text>

      <Wire name="input" points={layout.inputRoute} level={levels.input} />
      <Wire name="msb" points={layout.msbRoute} level={levels.msb} />
      <Wire
        name="feedback"
        points={[{ x: ig.x, y: ig.y + gateR }, { x: ig.x, y: busY }, { x: busEndX, y: busY }]}
        level={levels.feedback}
        className={afterGate}
      />
      {taps.map((i) => (
        <Wire
          key={i}
          name="feedback"
          points={layout.tapRoute(i).slice(2)}
          level={levels.feedback}
          className={`${afterGate} ${hl("taps")}`}
        />
      ))}
      {taps.includes(0) ? (
        <Wire name="tap-out-0" points={layout.outRoute(0)} level={levels.tapOut[0]} className="after-gate" />
      ) : (
        <text className="label" x={entry(0).x - 4} y={midY + 5}>
          0
        </text>
      )}
      {layout.boxes.slice(1).map(({ bit, x }) =>
        taps.includes(bit) ? (
          <g key={bit}>
            <Wire name={`tap-in-${bit}`} points={layout.tapInRoute(bit)} level={levels.tapIn[bit]} />
            <Wire name={`tap-out-${bit}`} points={layout.outRoute(bit)} level={levels.tapOut[bit]} className="after-gate" />
          </g>
        ) : (
          <line key={bit} className="wire" x1={layout.boxes[bit - 1]!.x} y1={midY} x2={x + box} y2={midY} />
        ),
      )}

      <XorGate at={ig} r={gateR} id="input" active={activeGates.has("input")} highlight={false} />
      {layout.gates.map((g) => (
        <XorGate key={g.bit} at={g} r={gateR} id={g.bit} active={activeGates.has(g.bit)} highlight={target === "taps"} />
      ))}

      {layout.boxes.map(({ bit, x, y }) => {
        const anim = boxAnimation(params, step, bit);
        const isMsb = bit === w - 1 && step.kind === "feedback";
        const flags = [isMsb && "msb", anim === "flip" && "hit", done && "done", hl("registers")];
        const classes = ["reg", ...flags].filter(Boolean).join(" ");
        const slideFrom = (layout.boxes[bit - 1]?.x ?? entry(0).x) - x;
        const style = { "--slide-from": `${slideFrom}px` } as CSSProperties;
        return (
          <g key={bit} className={classes} data-bit={bit} transform={`translate(${x} ${y})`}>
            <rect width={box} height={box} rx={6} />
            {anim === "flip" ? (
              <text key={`old-${stepIndex}`} className="reg-bit flip-old" x={box / 2} y={box / 2 + 8}>
                {step.reg[bit]! ^ 1}
              </text>
            ) : null}
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

      {particles(params, step).map(({ route, value, phase }) => (
        <ParticleDot
          key={`${route}-${stepIndex}`}
          route={route}
          value={value}
          points={routeOf(route)}
          delayMs={phase * phaseMs}
          durationMs={phaseMs}
        />
      ))}
    </svg>
  );
}
