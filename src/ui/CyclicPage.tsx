import { useState, type CSSProperties } from "react";
import {
  codeword,
  period,
  powerCycle,
  remainder,
  rotate,
  stateRingSettings,
  wordRingSettings,
  type Generator,
} from "../domain/cyclic";
import type { Preset } from "../domain/presets";
import { useMessages } from "../i18n/I18n";
import { Docked } from "./Dock";
import { powerText } from "./format";

const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = 130;

/** The point for degree d at radius r from the ring's centre. x^0 is at the top, and higher degrees go clockwise. */
const at = (d: number, n: number, r: number) => {
  const angle = (2 * Math.PI * d) / n;
  return { x: CENTER + r * Math.sin(angle), y: CENTER - r * Math.cos(angle) };
};

const binary = (value: number, width: number) => value.toString(2).padStart(width, "0");

/**
 * Shows the codeword ring and the state ring of the generator polynomial generator side by side, sharing the rotation count k.
 * The rotate buttons and the rotated codeword with its remainder are docked. onOpen opens settings in the visualizer.
 */
export function CyclicPage({
  generator,
  onOpen,
}: Readonly<{ generator: Generator; onOpen: (settings: Pick<Preset, "params" | "input">) => void }>) {
  const m = useMessages();
  const [turns, setTurns] = useState(0);
  const n = period(generator);
  const k = ((turns % n) + n) % n;
  const rotated = rotate(codeword(generator), k);
  return (
    <div className="cyclic-page">
      <h2>{m.cyclic.heading}</h2>
      <div className="page-columns cyclic-rings">
        <figure className="card">
          <figcaption>{m.cyclic.wordRing}</figcaption>
          <WordRing generator={generator} turns={turns} />
          <p className="note">{m.cyclic.wordNote}</p>
          <button type="button" className="see-in-visualizer" onClick={() => onOpen(wordRingSettings(generator, k))}>
            {m.cyclic.seeWord}
          </button>
          <p className="note crc-legend">{m.cyclic.crcBit}</p>
        </figure>
        <figure className="card">
          <figcaption>{m.cyclic.stateRing}</figcaption>
          <StateRing generator={generator} k={k} />
          <p className="note">{m.cyclic.stateNote}</p>
          <button type="button" className="see-in-visualizer" onClick={() => onOpen(stateRingSettings(generator))}>
            {m.cyclic.seeState}
          </button>
        </figure>
        <section className="card cyclic-side">
          <Docked className="cyclic-dock">
            <div className="cyclic-controls">
              <button
                type="button"
                className="rotate-back"
                title={m.cyclic.back}
                aria-label={m.cyclic.back}
                onClick={() => setTurns(turns - 1)}
              >
                ◀
              </button>
              <span className="rotated">{m.cyclic.rotated(k)}</span>
              <button
                type="button"
                className="rotate-forward"
                title={m.cyclic.forward}
                aria-label={m.cyclic.forward}
                onClick={() => setTurns(turns + 1)}
              >
                ▶
              </button>
            </div>
            <dl className="cyclic-result">
              <dt>{m.cyclic.word}</dt>
              <dd className="cyclic-word">
                {rotated.map((bit, i) => (
                  <span key={i} className={bit ? "one" : ""}>
                    {bit}
                  </span>
                ))}
              </dd>
              <dt>{m.cyclic.remainder}</dt>
              <dd className="cyclic-remainder">{binary(remainder(generator, rotated), generator.width)}</dd>
            </dl>
          </Docked>
          <p className="cyclic-explain">{m.cyclic.explain(n)}</p>
          <p className="note">{m.cyclic.shortened}</p>
        </section>
      </div>
    </div>
  );
}

/**
 * Codeword ring. Draws each bit at its original degree and rotates the whole ring by turns bits (the angle changes continuously with each rotation, so wrap-around also moves along the ring).
 * Draws a wrap-around boundary between x^(n−1) and x^0.
 */
function WordRing({ generator, turns }: Readonly<{ generator: Generator; turns: number }>) {
  const word = codeword(generator);
  const n = word.length;
  const dot = Math.min(14, (0.8 * Math.PI * RADIUS) / n);
  const style = { transform: `rotate(${(turns * 360) / n}deg)`, transformOrigin: `${CENTER}px ${CENTER}px` } as CSSProperties;
  const seamIn = at(-0.5, n, RADIUS - dot - 6);
  const seamOut = at(-0.5, n, RADIUS + dot + 6);
  return (
    <svg className="word-ring" viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
      <circle className="track" cx={CENTER} cy={CENTER} r={RADIUS} />
      <line className="seam" x1={seamIn.x} y1={seamIn.y} x2={seamOut.x} y2={seamOut.y} />
      {Array.from({ length: n }, (_, d) => {
        const p = at(d, n, RADIUS + dot + 14);
        return (
          <text key={d} className="degree" x={p.x} y={p.y} fontSize={n > 15 ? 11 : 15}>
            {powerText(d)}
          </text>
        );
      })}
      <g className="ring-bits" style={style}>
        {word.map((bit, i) => {
          const d = n - 1 - i;
          const p = at(d, n, RADIUS);
          return (
            <circle
              key={i}
              className={`ring-bit ${bit ? "one" : ""} ${i >= n - generator.width ? "crc-bit" : ""}`}
              data-degree={(((d + turns) % n) + n) % n}
              data-value={bit}
              cx={p.x}
              cy={p.y}
              r={dot}
            />
          );
        })}
      </g>
    </svg>
  );
}

/**
 * State ring. Places x^j mod g(x) clockwise in order of j, joins them with arrows, and highlights the state x^k. The arrow from x^(n−1) back to x^0 uses the wrap-around colour.
 * Labels run along the ring's radius, since horizontal text overlaps its neighbours when there are many states.
 */
function StateRing({ generator, k }: Readonly<{ generator: Generator; k: number }>) {
  const states = powerCycle(generator);
  const n = states.length;
  const inner = RADIUS - 24;
  const crowded = n > 15;
  return (
    <svg className="state-ring" viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
      <defs>
        {["step", "wrap"].map((kind) => (
          <marker
            key={kind}
            id={`state-arrow-${kind}`}
            viewBox="0 0 6 6"
            refX="5"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path className={`arrow-head ${kind}`} d="M0,0 L6,3 L0,6 z" />
          </marker>
        ))}
      </defs>
      {states.map((_, j) => {
        const from = at(j + 0.2, n, inner);
        const to = at(j + 0.8, n, inner);
        const kind = j === n - 1 ? "wrap" : "step";
        return (
          <line
            key={j}
            className={`state-edge ${kind}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            markerEnd={`url(#state-arrow-${kind})`}
          />
        );
      })}
      {states.map((state, j) => {
        const p = at(j, n, RADIUS);
        const angle = (360 * j) / n;
        const radial = crowded ? `rotate(${angle < 180 ? angle - 90 : angle + 90} ${p.x} ${p.y})` : undefined;
        return (
          <g key={j} className={`ring-state ${j === k ? "current" : ""}`} data-power={j}>
            {j === k ? (
              crowded ? (
                <rect x={p.x - 18} y={p.y - 7} width={36} height={14} rx={7} transform={radial} />
              ) : (
                <circle cx={p.x} cy={p.y} r={20} />
              )
            ) : null}
            <text x={p.x} y={p.y} fontSize={crowded ? 10 : 13} transform={radial}>
              {binary(state, generator.width)}
            </text>
          </g>
        );
      })}
      <text className="state-caption" x={CENTER} y={CENTER}>
        {`${powerText(k)} mod g(x)`}
      </text>
      <text className="state-caption value" x={CENTER} y={CENTER + 20}>
        {`= ${binary(states[k] ?? 0, generator.width)}`}
      </text>
    </svg>
  );
}
