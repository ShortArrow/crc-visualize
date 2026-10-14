import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { registerValue, toRegister, type Bit, type Step } from "../domain/trace";
import { bitsToString, toBinary, toHex } from "./format";
import { useMessages } from "../i18n/I18n";
import { logEntries, type LogEntry } from "./log";

/** 画面に残すログの行数。 */
const LOG_LIMIT = 40;

/** 行が上下へ滑る時間と、見出しの文字の大きさが変わる時間（ms）。 */
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

/** 完了時の結果。入力の後ろに CRC を連結したビット列と、検査値との照合。 */
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
 * ステップのログ。最新を一番上に大きく出し、それより前は同じ大きさで下へ並べる。
 * ステップが進むと、最新だった行は文字が小さくなりながら下へ送られ、戻すと逆に動く。
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
 * 描画のたびに、前の描画から位置の変わった行（data-index で同じ行とみなす）を、前の位置から今の位置へ滑らせる。
 * 新しく現れた行は、上から降りながら浮かび上がらせる。
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
