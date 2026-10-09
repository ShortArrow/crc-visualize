import { registerValue, toRegister, type Step } from "../domain/trace";
import { bitsToString, toBinary, toHex } from "./format";

const KIND_LABEL: Record<Step["kind"], string> = {
  init: "初期化",
  reflectIn: "入力バイトを反転 (refin)",
  feedback: "フィードバック判定",
  shift: "シフト",
  xor: "多項式と XOR",
  reflectOut: "出力を反転 (refout)",
  xorOut: "最終 XOR (xorout)",
  done: "完了",
};

type Props = Readonly<{ step: Step; input: readonly (0 | 1)[]; check: number | undefined }>;

/** レジスタ値と進行状況。完了時は「入力 + CRC」と check 値との照合を示す。 */
export function StatePanel({ step, input, check }: Props) {
  const crc = registerValue(step.reg);
  return (
    <div className="state">
      <div className="state-kind">{KIND_LABEL[step.kind]}</div>
      <div className="state-row">
        <span className="key">crc</span>
        <code>0b{toBinary(step.reg)}</code>
        <code>{toHex(step.reg)}</code>
      </div>
      {step.kind === "done" ? (
        <>
          <div className="state-row">
            <span className="key">入力 + CRC</span>
            <code className="framed">
              {bitsToString(input)}
              <span className="crc-tail">{toBinary(step.reg)}</span>
            </code>
          </div>
          {check === undefined ? null : (
            <div className={`check ${check === crc ? "ok" : "ng"}`}>
              check 値 {toHex(toRegister(check, step.reg.length))}{" "}
              {check === crc ? "と一致" : "と不一致"}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
