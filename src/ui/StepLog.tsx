import { Fragment, useLayoutEffect, useRef, type CSSProperties } from "react";
import { registerValue, toRegister, type Bit, type Step } from "../domain/trace";
import { bitGroups, groupsHex, toHex } from "./format";
import { useMessages } from "../i18n/I18n";
import { logEntries, type LogEntry } from "./log";

/** Number of log rows kept on screen. */
const LOG_LIMIT = 40;

/** Duration (ms) of rows sliding up or down and of the heading text resizing. */
const MOTION_MS = 240;

type Props = Readonly<{ steps: readonly Step[]; current: number; input: readonly Bit[]; check: number | undefined }>;

function Entry({ entry, age }: { entry: LogEntry; age: number }) {
  const m = useMessages();
  return (
    <li className={`log-entry log-${entry.kind} ${age === 0 ? "latest" : ""}`} data-index={entry.index}>
      <div className="log-head">
        {entry.bitNo === undefined ? null : <span className="log-bit">{m.log.inputBit(entry.bitNo)}</span>}
        <span className="log-title">{entry.title}</span>
        <code className="log-crc">
          crc = {entry.bin} {entry.hex}
        </code>
      </div>
      {entry.detail ? <div className="log-detail">{entry.detail}</div> : null}
    </li>
  );
}

/**
 * Result on completion: the bits of the input followed by the CRC in groups of 8, the same groups in hexadecimal when they are
 * whole bytes, and the comparison with the check value.
 */
function Result({ step, input, check }: { step: Step; input: readonly Bit[]; check: number | undefined }) {
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
          {m.log.check(toHex(toRegister(check, step.reg.length)), check === crc)}
        </div>
      )}
    </div>
  );
}

/**
 * Step log. Shows the latest step large at the top, and earlier ones below at a uniform size.
 * When the step advances, the previous latest row shrinks its text while moving down; stepping back reverses this.
 */
export function StepLog({ steps, current, input, check }: Props) {
  const m = useMessages();
  const step = steps[current]!;
  const list = useSlidingRows(current);
  return (
    <div className="log">
      {step.kind === "done" ? <Result step={step} input={input} check={check} /> : null}
      <ol ref={list} className="log-list" style={{ "--log-ms": `${MOTION_MS}ms` } as CSSProperties}>
        {logEntries(steps, current, LOG_LIMIT, m).map((entry, age) => (
          <Entry key={entry.index} entry={entry} age={age} />
        ))}
      </ol>
    </div>
  );
}

/**
 * On each render, slides rows whose position changed since the previous render (identified by data-index) from their old position to the new one.
 * A newly appearing row slides as far as its nearest row that was already there, so they move together without overlapping;
 * with no such row (the first render) it fades in.
 */
function useSlidingRows(current: number) {
  const ref = useRef<HTMLOListElement>(null);
  const tops = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const rows = [...(ref.current?.children ?? [])] as HTMLElement[];
    const next = new Map(rows.map((row) => [row.dataset.index ?? "", row.offsetTop]));
    const shiftOf = (row: HTMLElement | undefined) => {
      const before = tops.current.get(row?.dataset.index ?? "");
      return before === undefined ? undefined : before - row!.offsetTop;
    };
    rows.forEach((row, i) => {
      const shift = shiftOf(row) ?? shiftOf(rows[i + 1]) ?? shiftOf(rows[i - 1]);
      const keyframes =
        shift === undefined
          ? [{ opacity: 0 }, {}]
          : shift === 0
            ? undefined
            : [{ transform: `translateY(${shift}px)` }, { transform: "none" }];
      if (keyframes) row.animate(keyframes, { duration: MOTION_MS, easing: "ease-out" });
    });
    tops.current = next;
  }, [current]);
  return ref;
}
