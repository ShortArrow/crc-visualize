import { useState, type CSSProperties } from "react";
import { codeword, remainder, type Generator } from "../domain/cyclic";
import { bitsValue, burstLength, codewordValues, flip, generatorError, noError, verdict, xorBits } from "../domain/redundancy";
import type { Bit } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { powerOfTwoText, powerText } from "./format";

const GRID_LIMIT = 128;

const binary = (value: number, width: number) => value.toString(2).padStart(width, "0");

/** 生成多項式 generator の符号語で、CRC が付け足した冗長なビットであることと、それで誤りを見つける様子を示す。 */
export function RedundancyPage({ generator }: Readonly<{ generator: Generator }>) {
  const m = useMessages();
  const sent = codeword(generator);
  const n = sent.length;
  const k = n - generator.width;
  const [error, setError] = useState<Bit[]>(() => noError(n));
  const received = xorBits(sent, error);
  const result = verdict(generator, error);
  const rowStyle = { "--bits": n } as CSSProperties;
  return (
    <div className="redundancy-page">
      <h2>{m.redundancy.heading}</h2>
      <section>
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
        <p className="note">{m.redundancy.whatNote}</p>
      </section>
      <section>
        <h3>{m.redundancy.spaceSection}</h3>
        <dl className="space-counts">
          <dt>{m.redundancy.allWords(n)}</dt>
          <dd>{powerOfTwoText(n)}</dd>
          <dt>{m.redundancy.codewords}</dt>
          <dd>{powerOfTwoText(k)}</dd>
          <dt>{m.redundancy.ratio}</dt>
          <dd>1/{2 ** generator.width}</dd>
        </dl>
        {2 ** n <= GRID_LIMIT ? <WordGrid generator={generator} received={bitsValue(received)} /> : null}
        <p className="note">{m.redundancy.spaceNote(generator.width)}</p>
      </section>
      <section>
        <h3>{m.redundancy.checkSection}</h3>
        <p className="row-label">{m.redundancy.received}</p>
        <div className="bit-row received-row" style={rowStyle}>
          <BitCells bits={received} width={generator.width} flipped={error} onFlip={(i) => setError(flip(error, i))} />
        </div>
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
        <div className="check-actions">
          <button type="button" className="reset-error" onClick={() => setError(noError(n))}>
            {m.redundancy.reset}
          </button>
          <button type="button" className="missed-example" onClick={() => setError(generatorError(generator, n))}>
            {m.redundancy.missedExample}
          </button>
        </div>
        <p className="note">{m.redundancy.remainderNote}</p>
        <p className="note">{m.redundancy.guarantee(generator.width)}</p>
      </section>
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
 * ビットを最高次から 1 つずつ並べる。末尾の width ビットを CRC とし、onFlip を渡すと各ビットを選んで反転できる。
 * range を渡すと、bits のうち from 番目から to 番目の手前までだけを並べる。
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

/** n ビットの並びの全てを値の順に格子に並べ、符号語と受け取った並び received（値）を示す。 */
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
