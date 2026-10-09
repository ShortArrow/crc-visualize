import { registerValue, toRegister, type Bit, type Step } from "../domain/trace";
import { bitsToString, toBinary, toHex } from "./format";
import { logEntries, type LogEntry } from "./log";

/** 画面に残すログの行数。 */
const LOG_LIMIT = 40;

type Props = Readonly<{ steps: readonly Step[]; current: number; input: readonly Bit[]; check: number | undefined }>;

function Entry({ entry, age }: { entry: LogEntry; age: number }) {
  return (
    <li
      className={`log-entry log-${entry.kind} ${age === 0 ? "latest" : ""}`}
      style={{ opacity: Math.max(1 - age * 0.12, 0.25) }}
    >
      <div className="log-head">
        {entry.bitNo === undefined ? null : <span className="log-bit">入力ビット {entry.bitNo}</span>}
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
  const crc = registerValue(step.reg);
  return (
    <div className="log-result">
      <div className="state-row">
        <span className="key">入力 + CRC</span>
        <code className="framed">
          {bitsToString(input)}
          <span className="crc-tail">{toBinary(step.reg)}</span>
        </code>
      </div>
      {check === undefined ? null : (
        <div className={`check ${check === crc ? "ok" : "ng"}`}>
          検査値 {toHex(toRegister(check, step.reg.length))} {check === crc ? "と一致" : "と不一致"}
        </div>
      )}
    </div>
  );
}

/** ステップのログ。最新を一番上に大きく出し、古いものほど小さく薄くして下へ流す。 */
export function StepLog({ steps, current, input, check }: Props) {
  const step = steps[current]!;
  return (
    <div className="log">
      {step.kind === "done" ? <Result step={step} input={input} check={check} /> : null}
      <ol className="log-list">
        {logEntries(steps, current, LOG_LIMIT).map((entry, age) => (
          <Entry key={entry.index} entry={entry} age={age} />
        ))}
      </ol>
    </div>
  );
}
