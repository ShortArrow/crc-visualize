import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { registerValue, toRegister, type Bit, type Step } from "../domain/trace";
import { bitsToString, toBinary, toHex } from "./format";
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

/** Result on completion: the bit string of the input followed by the CRC, and the comparison with the check value. */
function Result({ step, input, check }: { step: Step; input: readonly Bit[]; check: number | undefined }) {
  const m = useMessages();
  const crc = registerValue(step.reg);
  return (
    <div className="log-result">
      <div className="state-row">
        <span className="key">{m.log.inputPlusCrc}</span>
        <code className="framed">
          {bitsToString(input)}
          <span className="crc-tail">{toBinary(step.reg)}</span>
        </code>
      </div>
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
 * Newly appearing rows fade in while dropping from above.
 */
function useSlidingRows(current: number) {
  const ref = useRef<HTMLOListElement>(null);
  const tops = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const rows = [...(ref.current?.children ?? [])] as HTMLElement[];
    const next = new Map(rows.map((row) => [row.dataset.index ?? "", row.offsetTop]));
    for (const row of rows) {
      const before = tops.current.get(row.dataset.index ?? "");
      const after = next.get(row.dataset.index ?? "")!;
      if (before === undefined) {
        row.animate([{ opacity: 0, transform: "translateY(-8px)" }, {}], { duration: MOTION_MS, easing: "ease-out" });
        continue;
      }
      if (before === after) continue;
      row.animate([{ transform: `translateY(${before - after}px)` }, { transform: "none" }], {
        duration: MOTION_MS,
        easing: "ease-out",
      });
    }
    tops.current = next;
  }, [current]);
  return ref;
}
