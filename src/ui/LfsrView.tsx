import { useEffect, useRef, type CSSProperties } from "react";
import { streamPosition, toRegister, type Bit, type CrcParams, type ParamName, type Step } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { lfsrLayout, type Point } from "./layout";
import { routeKeyframes } from "./motion";
import { heldFeedback, particleWire, particles, upcomingValues, wireLevels, type Particle } from "./signals";

const STREAM_PITCH = 22;
const BYTE_GAP = 8;
/**
 * Fraction of the step's animation time that a particle takes to travel its path, in each of the first and second halves.
 * Second-half particles arrive at twice this point; the after-gate and flip timings in styles.css match it.
 */
const PHASE_SHARE = 0.4;
/** How far the glow region extends beyond the diagram. Boxes and gates are drawn in translated coordinates, so this leaves room for them. */
const GLOW_MARGIN = 200;

/** x coordinate of bit position k on the stream (relative to the input XOR as origin). */
const streamX = (k: number, grouped: boolean) => k * STREAM_PITCH + (grouped ? Math.floor(k / 8) * BYTE_GAP : 0);

/** Animation name applied to a register box for each step. */
function boxAnimation(params: CrcParams, step: Step, bit: number): string | undefined {
  switch (step.kind) {
    case "shift":
      return "slide";
    case "xor":
      return toRegister(params.poly, params.width)[bit] === 1 ? "flip" : undefined;
    case "reflectOut":
      return "mirror";
    case "xorOut":
      return toRegister(params.xorout, params.width)[bit] === 1 ? "flip-now" : undefined;
    default:
      return undefined;
  }
}

/** XOR gate (⊕). id is "input" or the number of the register at its entry. active means it is used in this step's computation. */
export function XorGate(props: { at: Point; r: number; id: "input" | number; active: boolean; highlight: boolean }) {
  const { at, r, id, active, highlight } = props;
  return (
    <g
      className={`gate ${active ? "active" : ""} ${highlight ? "param-hl" : ""}`}
      data-gate={id}
      transform={`translate(${at.x} ${at.y})`}
    >
      <circle r={r} />
      <line x1={-r} x2={r} y1={0} y2={0} />
      <line x1={0} x2={0} y1={-r} y2={r} />
    </g>
  );
}

/** Box showing the value of the variable feedback. Filled with the value's colour; in the feedback step the value and colour appear when the result particle arrives. */
function FeedbackBox(props: { at: Point & { size: number }; value: Bit | undefined; arriving: boolean; stepIndex: number }) {
  const { at, value, arriving, stepIndex } = props;
  const half = at.size / 2;
  return (
    <g className={`fb-box ${arriving ? "arriving" : ""}`} data-level={value ?? "none"} transform={`translate(${at.x} ${at.y})`}>
      <rect x={-half} y={-half} width={at.size} height={at.size} rx={5} />
      <text key={arriving ? `flip-${stepIndex}` : "static"} className={`reg-bit ${arriving ? "flip" : ""}`} y={7}>
        {value ?? ""}
      </text>
      <text className="reg-name" x={-half - 6} y={4}>
        feedback
      </text>
    </g>
  );
}

/** How a particle travels. Shared by the particle and the trail that paints the wire behind it. */
type Travel = Readonly<{ delayMs: number; durationMs: number }>;

const toPoints = (points: readonly Point[]) => points.map((p) => `${p.x},${p.y}`).join(" ");

/**
 * A wire carrying a value. If level is undefined, nothing flows.
 * With travel, the wire stays grey and is painted in the value's colour from its start, at the same pace as the particle.
 */
function Wire(props: {
  name: string;
  points: readonly Point[];
  level: Bit | undefined;
  travel?: Travel | undefined;
  className?: string;
}) {
  const { name, points, level, travel, className = "" } = props;
  return (
    <g data-wire={name} data-level={level ?? "none"}>
      <polyline
        className={`wire ${className}`}
        data-level={travel ? "none" : (level ?? "none")}
        points={toPoints(points)}
        fill="none"
      />
      {travel && level !== undefined ? <Trail points={points} level={level} travel={travel} /> : null}
    </g>
  );
}

/** Trail that paints the wire behind a particle. Treats the length as 1 and extends the drawn range to follow the particle. */
function Trail(props: { points: readonly Point[]; level: Bit; travel: Travel }) {
  const { points, level, travel } = props;
  const ref = useRef<SVGPolylineElement>(null);
  useEffect(() => {
    ref.current?.animate([{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }], {
      delay: travel.delayMs,
      duration: travel.durationMs,
      easing: "ease-in-out",
      fill: "both",
    });
  }, []);
  return <polyline ref={ref} className="wire trail" data-level={level} pathLength={1} points={toPoints(points)} fill="none" />;
}

/** Time from a particle's arrival until it fully vanishes. The wire, gate or box takes over the arrived value, so it vanishes quickly. */
const VANISH_MS = 60;

/**
 * A value particle moving along the path points. Invisible until delayMs; vanishes on reaching the end after durationMs.
 * The wire's colour takes over the arrived value. Invisible in renders before the animation starts.
 */
function ParticleDot(props: { route: string; value: Bit; points: readonly Point[] } & Travel) {
  const { route, value, points, delayMs, durationMs } = props;
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.animate(routeKeyframes(points), { delay: delayMs, duration: durationMs, easing: "ease-in-out", fill: "both" });
    el?.animate([{ opacity: 0 }, { opacity: 1 }], { delay: delayMs, duration: 1, fill: "both" });
    el?.animate([{ opacity: 1 }, { opacity: 0 }], { delay: delayMs + durationMs, duration: VANISH_MS, fill: "forwards" });
  }, []);
  const start = points[0]!;
  return (
    <g
      ref={ref}
      className={`particle v${value}`}
      data-route={route}
      style={{ transform: `translate(${start.x}px, ${start.y}px)`, opacity: 0 }}
    >
      <circle r={10} />
      <text y={5}>{value}</text>
    </g>
  );
}

type Props = Readonly<{
  params: CrcParams;
  step: Step;
  /** The next step. Used to show a preview of the value entering each box. */
  next: Step | undefined;
  stepIndex: number;
  /** Animation time of this step. */
  animMs: number;
  /** The focused parameter, or input while the input field is hovered or focused. */
  focused: ParamName | "input" | undefined;
  /** Byte breakpoints by byte number: true if enabled, false if disabled. */
  byteBreaks: ReadonlyMap<number, boolean>;
  onToggleByte: (byte: number) => void;
  /** Bit breakpoints by bit number of the input stream: true if enabled, false if disabled. */
  bitBreaks: ReadonlyMap<number, boolean>;
  onToggleBit: (bit: number) => void;
  /** The zoomed scale in CSS px per unit of the view box; undefined draws it at the automatic size its area gives it. */
  scale: number | undefined;
}>;

/** Where in the diagram the focused parameter, or the input, takes effect. */
const PARAM_TARGET: Record<ParamName | "input", "registers" | "taps" | "stream"> = {
  width: "registers",
  poly: "taps",
  init: "registers",
  refin: "stream",
  refout: "registers",
  xorout: "registers",
  input: "stream",
};

/**
 * LFSR (hardware representation). Rendering depends only on step, and the animation replays for each stepIndex.
 * Value flow is shown by wire colours (wireLevels) and particles (particles); no formula text is shown.
 * Pressing a bit of the input stream sets or removes a breakpoint on it, marked above the bit. When the input is whole bytes, a
 * line under each byte does the same for the byte, and the mark is drawn on that line.
 */
export function LfsrView(props: Props) {
  const { params, step, next, stepIndex, animMs, focused, byteBreaks, onToggleByte, bitBreaks, onToggleBit, scale } = props;
  const m = useMessages();
  const layout = lfsrLayout(params);
  const { box, regY, streamY, gateR, inputGate: ig, feedbackBox: fb, taps, entry } = layout;
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
  const routeOf = (route: Particle["route"]) => {
    if (route === "input") return layout.inputRoute;
    if (route === "msb") return layout.msbRoute;
    if (route === "result") return layout.resultRoute;
    const [kind, n] = route.split("-");
    const i = Number(n);
    if (kind === "tap") return layout.tapRoute(i);
    if (kind === "in") return layout.tapInRoute(i);
    return layout.outRoute(i);
  };
  const phaseMs = animMs * PHASE_SHARE;
  const moving = particles(params, step);
  const travelOf = (wire: string): Travel | undefined => {
    const p = moving.find((m) => particleWire(m.route) === wire);
    return p && { delayMs: p.phase * phaseMs, durationMs: phaseMs };
  };
  const wireProps = (name: string, points: readonly Point[], level: Bit | undefined) => ({
    name,
    points,
    level,
    travel: travelOf(name),
  });
  const target = focused ? PARAM_TARGET[focused] : undefined;
  const hl = (kind: typeof target) => (target === kind ? "param-hl" : "");

  return (
    <svg
      className="lfsr"
      data-step={step.kind}
      viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
      style={
        {
          "--view-width": layout.viewWidth,
          ...(scale === undefined
            ? {}
            : { width: layout.viewWidth * scale, height: layout.viewHeight * scale, minWidth: 0, minHeight: 0 }),
        } as CSSProperties
      }
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
          {step.stream.map((_, p) => {
            const x = streamX(p, grouped);
            const k = streamPosition(step, params.refin, p);
            const mark = bitBreaks.get(k);
            return (
              <g key={`bit-${p}`}>
                <rect
                  className="bit-hit"
                  data-bit={k}
                  x={x - STREAM_PITCH / 2}
                  y={streamY - 18}
                  width={STREAM_PITCH}
                  height={22}
                  onClick={() => onToggleBit(k)}
                >
                  <title>{m.debug.toggleBit(k)}</title>
                </rect>
                {mark === undefined ? null : (
                  <circle className={`bit-bp ${mark ? "" : "off"}`} data-bit={k} cx={x} cy={streamY - 18} r={2.5} />
                )}
              </g>
            );
          })}
          {grouped
            ? Array.from({ length: step.stream.length / 8 }, (_, k) => {
                const [left, right] = [streamX(k * 8, true) - STREAM_PITCH / 2, streamX(k * 8 + 7, true) + STREAM_PITCH / 2];
                const mark = byteBreaks.get(k);
                return (
                  <g key={`byte-${k}`}>
                    <rect className="byte-rail" x={left + 2} y={streamY + 7} width={right - left - 4} height={3} rx={1.5} />
                    <rect
                      className="byte-hit"
                      data-byte={k}
                      x={left}
                      y={streamY + 4}
                      width={right - left}
                      height={10}
                      onClick={() => onToggleByte(k)}
                    >
                      <title>{m.debug.toggleByte(k)}</title>
                    </rect>
                    {mark === undefined ? null : (
                      <rect
                        className={`byte-bp ${mark ? "" : "off"}`}
                        data-byte={k}
                        x={left + 2}
                        y={streamY + 7}
                        width={right - left - 4}
                        height={3}
                        rx={1.5}
                      />
                    )}
                  </g>
                );
              })
            : null}
        </g>
      </g>
      <text className="label" x={8} y={streamY - 22}>
        {m.visualizer.inputBits(step.cursor, step.stream.length)}
      </text>

      <Wire key={`input-${stepIndex}`} {...wireProps("input", layout.inputRoute, levels.input)} />
      <Wire key={`msb-${stepIndex}`} {...wireProps("msb", layout.msbRoute, levels.msb)} />
      <Wire key={`result-${stepIndex}`} {...wireProps("result", layout.resultRoute, levels.result)} />
      {taps.map((i) => (
        <Wire
          key={`feedback-${i}-${stepIndex}`}
          {...wireProps(`feedback-${i}`, layout.tapRoute(i), levels.feedback)}
          className={hl("taps")}
        />
      ))}
      <line className="wire" x1={entry(0).x} y1={midY} x2={layout.boxes[0]!.x + box} y2={midY} />
      {layout.boxes.slice(1).map(({ bit, x }) => (
        <line key={bit} className="wire" x1={layout.boxes[bit - 1]!.x} y1={midY} x2={x + box} y2={midY} />
      ))}
      {taps.map((i) => (
        <g key={i}>
          <Wire key={`tap-in-${i}-${stepIndex}`} {...wireProps(`tap-in-${i}`, layout.tapInRoute(i), levels.tapIn[i])} />
          <Wire key={`tap-out-${i}-${stepIndex}`} {...wireProps(`tap-out-${i}`, layout.outRoute(i), levels.tapOut[i])} />
        </g>
      ))}

      <XorGate at={ig} r={gateR} id="input" active={activeGates.has("input")} highlight={false} />
      <FeedbackBox at={fb} value={heldFeedback(step)} arriving={step.kind === "feedback"} stepIndex={stepIndex} />
      {layout.gates.map((g) => (
        <XorGate key={g.bit} at={g} r={gateR} id={g.bit} active={activeGates.has(g.bit)} highlight={target === "taps"} />
      ))}

      {layout.boxes.map(({ bit, x, y }) => {
        const anim = boxAnimation(params, step, bit);
        const isMsb = bit === w - 1 && step.kind === "feedback";
        const flags = [isMsb && "msb", anim === "flip" && "hit", done && "done", hl("registers")];
        const classes = ["reg", ...flags].filter(Boolean).join(" ");
        const style = { "--slide-from": `${layout.pitch}px` } as CSSProperties;
        return (
          <g key={bit} className={classes} data-bit={bit} transform={`translate(${x} ${y})`}>
            <rect width={box} height={box} rx={6} />
            {anim === "flip" || anim === "flip-now" ? (
              <text key={`old-${stepIndex}`} className={`reg-bit ${anim}-old`} x={box / 2} y={box / 2 + 8}>
                {step.reg[bit]! ^ 1}
              </text>
            ) : null}
            {step.kind === "shift" && bit === w - 1 ? (
              <text
                key={`drop-${stepIndex}`}
                className="reg-bit drop"
                style={{ "--drop-to": `${-layout.pitch}px` } as CSSProperties}
                x={box / 2}
                y={box / 2 + 8}
              >
                {step.dropped}
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

      {Object.entries(upcomingValues(next)).map(([bit, value]) => {
        const at = entry(0);
        return (
          <g key={bit} className={`upcoming v${value}`} data-bit={bit} transform={`translate(${at.x} ${at.y})`}>
            <circle r={9} />
            <text y={4}>{value}</text>
          </g>
        );
      })}
      {moving.map(({ route, value, phase }) => (
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
