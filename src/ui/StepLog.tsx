import { Fragment, useLayoutEffect, useRef, type CSSProperties } from "react";
import { registerValue, type Bit, type Step } from "../domain/trace";
import { bitGroups, groupsHex, valueHex } from "./format";
import { useMessages } from "../i18n/I18n";
import type { Messages } from "../i18n/messages";
import { logBlocks, type LogBlock, type LogRow } from "./log";

/** Number of steps kept on screen. */
const LOG_LIMIT = 40;

/** Duration (ms) of blocks sliding up or down, rows fading in and the values resizing. */
const MOTION_MS = 240;

type Props = Readonly<{ steps: readonly Step[]; current: number; input: readonly Bit[]; check: bigint | undefined }>;

const ROW_LABELS: Readonly<Record<Exclude<LogRow["label"], "before" | "reflected" | "result">, string>> = {
  init: "init",
  shift: "shift",
  poly: "⊕ poly",
  xor: "= xor",
  xorout: "⊕ xorout",
};

/** The label of a row in the language of m; the names the pseudocode uses are not translated. */
const labelOf = (label: LogRow["label"], m: Messages): string =>
  label === "before" || label === "reflected" || label === "result" ? m.log.rows[label] : ROW_LABELS[label];

/** A value 0 or 1 in the colour the diagram gives it. */
const Value = ({ bit }: { bit: Bit }) => <span className={`log-value v${bit}`}>{bit}</span>;

/**
 * The binary of row, split into groups of 4 counted from the least significant bit, after a two-character slot that holds, in a
 * shift, the bit pushed out and an arrow. Changed bits are marked flip and the bit a shift brings in enter.
 */
function Bits({ row }: { row: LogRow }) {
  const n = row.bits.length;
  return (
    <code className="log-bits">
      <span className="log-out">
        {row.dropped === undefined ? null : (
          <>
            <s className="drop">{row.dropped}</s>←
          </>
        )}
      </span>
      {[...row.bits].map((bit, i) => {
        const mark = row.changed?.[i] ? "flip" : row.label === "shift" && i === n - 1 ? "enter" : undefined;
        return (
          <Fragment key={i}>
            {i > 0 && (n - i) % 4 === 0 ? " " : null}
            {mark ? <span className={mark}>{bit}</span> : bit}
          </Fragment>
        );
      })}
    </code>
  );
}

/** One block of Progress; current is the current step when the block holds it. */
function Block({ block, current }: { block: LogBlock; current: number | undefined }) {
  const m = useMessages();
  const className = `log-block log-${block.kind} ${current === undefined ? "" : "current"}`;
  if (block.kind === "reflectIn") {
    const hex = (v: number) => `0x${v.toString(16).toUpperCase().padStart(2, "0")}`;
    return (
      <li className={className} data-key={block.key}>
        {m.log.byteFed(block.byteNo, hex(block.entered), hex(block.fed))}
      </li>
    );
  }
  return (
    <li className={className} data-key={block.key}>
      <div className="log-block-head">
        {block.kind === "bit" ? (
          <>
            <span className="log-block-title">{m.log.inputBit(block.bitNo)}</span>
            <span className="log-tag log-formula">
              msb <Value bit={block.msb} /> ⊕ bit <Value bit={block.inBit} /> = feedback <Value bit={block.fb} />
            </span>
            <span className={`log-tag ${block.fb ? "xor-next" : ""}`}>{block.fb ? m.log.xorNext : m.log.noXorNext}</span>
          </>
        ) : (
          <span className="log-block-title">{m.steps[block.kind]}</span>
        )}
      </div>
      {block.rows.map((row) => (
        <div
          key={row.label}
          className={`log-row ${row.index === current ? "now" : ""}`}
          data-row={row.label}
          data-index={row.index}
        >
          <span className="log-label">{labelOf(row.label, m)}</span>
          <Bits row={row} />
          <code className="log-hex">{row.hex}</code>
        </div>
      ))}
    </li>
  );
}

/**
 * Result on completion: the bits of the input followed by the CRC in groups of 8, the same groups in hexadecimal when they are
 * whole bytes, and the comparison with the check value.
 */
function Result({ step, input, check }: { step: Step; input: readonly Bit[]; check: bigint | undefined }) {
  const m = useMessages();
  const crc = registerValue(step.reg);
  const groups = bitGroups(input, step.reg);
  const hex = groupsHex(groups);
  return (
    <div className="log-result">
      <div className="state-row">
        <span className="key">{m.log.inputPlusCrc}</span>
        <code className="framed result-bits">
          {groups.map((g, i) => (
            <Fragment key={i}>
              {i === 0 ? "" : " "}
              {g.input}
              {g.crc ? <span className="crc-tail">{g.crc}</span> : null}
            </Fragment>
          ))}
        </code>
      </div>
      {hex ? (
        <div className="state-row">
          <span className="key">{m.log.inHex}</span>
          <code className="framed result-hex">
            {hex.map((h, i) => (
              <Fragment key={i}>
                {i === 0 ? "" : " "}
                {groups[i]!.input ? h : <span className="crc-tail">{h}</span>}
              </Fragment>
            ))}
          </code>
        </div>
      ) : null}
      {check === undefined ? null : (
        <div className={`check ${check === crc ? "ok" : "ng"}`}>
          {m.log.check(valueHex(check, step.reg.length), check === crc)}
        </div>
      )}
    </div>
  );
}

/**
 * Step log under a heading of title (no title text when omitted) with buttons that scroll it to its newest and oldest lines.
 * Shows the steps in blocks, the block of the current step large at the top and earlier ones below at a uniform size.
 * A step that starts a block slides it in while the previous current block shrinks its text moving down; a step that adds a row
 * fades the row in; stepping back reverses this.
 */
export function StepLog({ steps, current, input, check, title }: Props & Readonly<{ title?: string }>) {
  const m = useMessages();
  const step = steps[current]!;
  const list = useSlidingRows(current);
  const log = useRef<HTMLDivElement>(null);
  const scrollTo = (end: "newest" | "oldest") =>
    log.current?.scrollTo({ top: end === "newest" ? 0 : log.current.scrollHeight, behavior: "smooth" });
  return (
    <>
      <h2 className="log-heading">
        {title}
        <span className="log-jump">
          <button type="button" data-jump="newest" onClick={() => scrollTo("newest")}>
            ↑ {m.log.newest}
          </button>
          <button type="button" data-jump="oldest" onClick={() => scrollTo("oldest")}>
            ↓ {m.log.oldest}
          </button>
        </span>
      </h2>
      <div ref={log} className="log">
        {step.kind === "done" ? <Result step={step} input={input} check={check} /> : null}
        <ol ref={list} className="log-list" style={{ "--log-ms": `${MOTION_MS}ms` } as CSSProperties}>
          {logBlocks(steps, current, LOG_LIMIT).map((block, i) => (
            <Block key={block.key} block={block} current={i === 0 && step.kind !== "done" ? current : undefined} />
          ))}
        </ol>
      </div>
    </>
  );
}

/**
 * On each render, slides blocks whose position changed since the previous render (identified by data-key) from their old position
 * to the new one, and fades in the rows that appeared in a block that was already there. A newly appearing block slides as far as
 * its nearest block that was already there, so they move together without overlapping; with no such block (the first render) it
 * fades in.
 */
function useSlidingRows(current: number) {
  const ref = useRef<HTMLOListElement>(null);
  const tops = useRef(new Map<string, number>());
  const rowKeys = useRef(new Set<string>());
  useLayoutEffect(() => {
    const blocks = [...(ref.current?.children ?? [])] as HTMLElement[];
    const next = new Map(blocks.map((block) => [block.dataset.key ?? "", block.offsetTop]));
    const shiftOf = (block: HTMLElement | undefined) => {
      const before = tops.current.get(block?.dataset.key ?? "");
      return before === undefined ? undefined : before - block!.offsetTop;
    };
    const fade = [{ opacity: 0 }, {}];
    const motion = { duration: MOTION_MS, easing: "ease-out" };
    const rowKey = (row: HTMLElement) => `${row.closest<HTMLElement>(".log-block")?.dataset.key}:${row.dataset.row}`;
    blocks.forEach((block, i) => {
      const shift = shiftOf(block) ?? shiftOf(blocks[i + 1]) ?? shiftOf(blocks[i - 1]);
      const keyframes =
        shift === undefined ? fade : shift === 0 ? undefined : [{ transform: `translateY(${shift}px)` }, { transform: "none" }];
      if (keyframes) block.animate(keyframes, motion);
      if (tops.current.has(block.dataset.key ?? ""))
        block.querySelectorAll<HTMLElement>(".log-row").forEach((row) => {
          if (!rowKeys.current.has(rowKey(row))) row.animate(fade, motion);
        });
    });
    tops.current = next;
    rowKeys.current = new Set([...(ref.current?.querySelectorAll<HTMLElement>(".log-row") ?? [])].map(rowKey));
  }, [current]);
  return ref;
}
