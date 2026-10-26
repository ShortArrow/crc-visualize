import { useState, type CSSProperties } from "react";
import { codeword, remainder, type Generator } from "../domain/cyclic";
import {
  bitsValue,
  burstLength,
  codewordValues,
  crcStrip,
  flip,
  generatorError,
  noError,
  verdict,
  xorBits,
} from "../domain/redundancy";
import type { Bit } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { Docked, DockedResult } from "./Dock";
import { powerOfTwoText, powerText } from "./format";
import { Explanation } from "./Explanation";
import { useReveal } from "./reveal";

const GRID_LIMIT = 128;

const binary = (value: number, width: number) => value.toString(2).padStart(width, "0");

/**
 * Uses codewords of the generator polynomial generator to show that the CRC is redundant bits appended to the message, and how they detect errors.
 * The received sequence and the buttons that set its error are docked.
 */
export function RedundancyPage({ generator }: Readonly<{ generator: Generator }>) {
  const m = useMessages();
  const sent = codeword(generator);
  const n = sent.length;
  const k = n - generator.width;
  const [error, setError] = useState<Bit[]>(() => noError(n));
  const grids = useReveal<HTMLDivElement>([error]);
  const received = xorBits(sent, error);
  const result = verdict(generator, error);
  const rowStyle = { "--bits": n } as CSSProperties;
  const pageStyle = { "--n": n } as CSSProperties;
  return (
    <div className="redundancy-page" style={pageStyle}>
      <h2>{m.redundancy.heading}</h2>
      <div className="page-columns">
        <section className="card redundancy-summary">
          <h3>{m.redundancy.whatSection}</h3>
          <div className="sent-row">
            <div className="part">
              <div className="bit-row" style={{ "--bits": k } as CSSProperties}>
                <BitCells bits={sent} width={generator.width} range={[0, k]} />
              </div>
              <span className="part-label message">{m.redundancy.message(k)}</span>
            </div>
            <div className="part">
              <div className="bit-row" style={{ "--bits": generator.width } as CSSProperties}>
                <BitCells bits={sent} width={generator.width} range={[k, n]} />
              </div>
              <span className="part-label crc">{m.redundancy.crc(generator.width)}</span>
            </div>
          </div>
          <Explanation>{m.redundancy.whatNote}</Explanation>
        </section>
        <section className="card">
          <h3>{m.redundancy.spaceSection}</h3>
          <dl className="space-counts">
            <dt>{m.redundancy.allWords(n)}</dt>
            <dd>{powerOfTwoText(n)}</dd>
            <dt>{m.redundancy.codewords}</dt>
            <dd>{powerOfTwoText(k)}</dd>
            <dt>{m.redundancy.ratio}</dt>
            <dd>1/{2 ** generator.width}</dd>
          </dl>
          <div className="space-figures" ref={grids}>
            {2 ** n <= GRID_LIMIT ? <WordGrid generator={generator} received={bitsValue(received)} /> : null}
            <CrcStripFigure generator={generator} received={received} />
          </div>
          <Explanation>{m.redundancy.spaceNote(generator.width)}</Explanation>
        </section>
        <section className="card">
          <h3>{m.redundancy.checkSection}</h3>
          <Docked className="redundancy-page" style={pageStyle}>
            <p className="row-label">{m.redundancy.received}</p>
            <div className="bit-row received-row" style={rowStyle}>
              <BitCells bits={received} width={generator.width} flipped={error} onFlip={(i) => setError(flip(error, i))} />
            </div>
          </Docked>
          <DockedResult className="redundancy-page" style={pageStyle}>
            <p className="verdict dock-result" data-dock-result data-verdict={result}>
              {m.redundancy.verdict[result]}
            </p>
          </DockedResult>
          <dl className="check-result">
            <dt>{m.redundancy.error}</dt>
            <dd className="error-bits">{error.join("")}</dd>
            <dt>{m.redundancy.burst}</dt>
            <dd className="burst-length">{burstLength(error)}</dd>
            <dt>{m.redundancy.remainder}</dt>
            <dd className="received-remainder">{binary(remainder(generator, received), generator.width)}</dd>
          </dl>
          <p className="verdict" data-verdict={result}>
            {m.redundancy.verdict[result]}
          </p>
          <Docked className="redundancy-page" style={pageStyle}>
            <div className="check-actions">
              <button type="button" className="reset-error" onClick={() => setError(noError(n))}>
                {m.redundancy.reset}
              </button>
              <button type="button" className="missed-example" onClick={() => setError(generatorError(generator, n))}>
                {m.redundancy.missedExample}
              </button>
            </div>
          </Docked>
          <Explanation>
            {m.redundancy.remainderNote}
            {m.redundancy.guarantee(generator.width)}
          </Explanation>
        </section>
      </div>
    </div>
  );
}

type CellsProps = Readonly<{
  bits: readonly Bit[];
  width: number;
  range?: readonly [from: number, to: number];
  flipped?: readonly Bit[];
  onFlip?: (i: number) => void;
}>;

/**
 * Lays out bits one by one from the highest degree. The last width bits are the CRC; with onFlip, each bit can be selected to flip it.
 * With range, lays out only bits from index from up to, but not including, index to.
 */
function BitCells({ bits, width, range = [0, bits.length], flipped, onFlip }: CellsProps) {
  const n = bits.length;
  const [from, to] = range;
  return bits.slice(from, to).map((bit, offset) => {
    const i = from + offset;
    const className = ["bit-cell", i < n - width ? "message" : "crc", bit ? "one" : "", flipped?.[i] ? "flipped" : ""].join(" ");
    const title = powerText(n - 1 - i);
    return onFlip ? (
      <button key={i} type="button" className={className} data-index={i} title={title} onClick={() => onFlip(i)}>
        {bit}
      </button>
    ) : (
      <span key={i} className={className} data-index={i} title={title}>
        {bit}
      </span>
    );
  });
}

/**
 * Lays out the CRCs that could follow the message of received by value, marking the one that fits the message and the one received.
 * Sets --columns and --rows for laying them out in a near-square grid.
 */
function CrcStripFigure({ generator, received }: Readonly<{ generator: Generator; received: readonly Bit[] }>) {
  const m = useMessages();
  const strip = crcStrip(generator, received);
  const style = {
    "--columns": 2 ** Math.ceil(generator.width / 2),
    "--rows": 2 ** Math.floor(generator.width / 2),
  } as CSSProperties;
  return (
    <figure className="crc-strip">
      <figcaption>{m.redundancy.stripTitle(received.length - generator.width, strip.size)}</figcaption>
      <div className="strip-cells" style={style}>
        {Array.from({ length: strip.size }, (_, v) => (
          <span
            key={v}
            className={`strip-cell ${v === strip.fitting ? "fitting" : ""} ${v === strip.received ? "received" : ""}`}
          >
            {binary(v, generator.width)}
          </span>
        ))}
      </div>
      <p className="note">{m.redundancy.stripLegend}</p>
    </figure>
  );
}

/** Lays out every n-bit sequence in a grid by value, marking the codewords and the received sequence received (a value). */
function WordGrid({ generator, received }: Readonly<{ generator: Generator; received: number }>) {
  const m = useMessages();
  const codewords = codewordValues(generator);
  const n = codeword(generator).length;
  const style = { "--columns": 2 ** Math.ceil(n / 2) } as CSSProperties;
  return (
    <figure className="word-grid-figure">
      <div className="word-grid" style={style}>
        {Array.from({ length: 2 ** n }, (_, v) => (
          <span
            key={v}
            className={`word-dot ${codewords.has(v) ? "codeword" : ""} ${v === received ? "received" : ""}`}
            title={binary(v, n)}
          />
        ))}
      </div>
      <figcaption className="note">{m.redundancy.gridLegend}</figcaption>
    </figure>
  );
}
