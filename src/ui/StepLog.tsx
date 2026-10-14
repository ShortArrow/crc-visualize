import { registerValue, toRegister, type Bit, type Step } from "../domain/trace";
import { bitsToString, toBinary, toHex } from "./format";
import { useMessages } from "../i18n/I18n";
import { logEntries, type LogEntry } from "./log";

/** 画面に残すログの行数。 */
const LOG_LIMIT = 40;

type Props = Readonly<{ steps: readonly Step[]; current: number; input: readonly Bit[]; check: number | undefined }>;

function Entry({ entry, age }: { entry: LogEntry; age: number }) {
  const m = useMessages();
  return (
    <li className={`log-entry log-${entry.kind} ${age === 0 ? "latest" : ""}`}>
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

/** ステップのログ。最新を一番上に大きく出し、それより前は同じ大きさで下へ並べる。 */
export function StepLog({ steps, current, input, check }: Props) {
  const m = useMessages();
  const step = steps[current]!;
  return (
    <div className="log">
      {step.kind === "done" ? <Result step={step} input={input} check={check} /> : null}
      <ol className="log-list">
        {logEntries(steps, current, LOG_LIMIT, m).map((entry, age) => (
          <Entry key={entry.index} entry={entry} age={age} />
        ))}
      </ol>
    </div>
  );
}
