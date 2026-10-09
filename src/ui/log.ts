import type { Step } from "../domain/trace";
import { toBinary, toHex } from "./format";

const TITLE: Record<Step["kind"], string> = {
  init: "初期化",
  reflectIn: "入力バイトを反転（refin）",
  feedback: "フィードバックビットの計算",
  shift: "シフト",
  xor: "多項式と XOR",
  reflectOut: "出力を反転（refout）",
  xorOut: "最終 XOR（xorout）",
  done: "完了",
};

/**
 * ログ 1 行分。index は元のステップ番号、bitNo は関わる入力ビットの 1 始まりの番号。
 * bin と hex はそのステップを処理した後の crc。
 */
export type LogEntry = Readonly<{
  index: number;
  kind: Step["kind"];
  title: string;
  detail?: string;
  bitNo?: number;
  bin: string;
  hex: string;
}>;

function detailOf(step: Step): string | undefined {
  switch (step.kind) {
    case "reflectIn":
      return `${step.byteIndex + 1} バイト目`;
    case "feedback":
      return `msb ${step.msb} ⊕ bit ${step.inBit} = feedback ${step.fb}`;
    case "shift":
      return step.fb === 1 ? "feedback = 1 なので次に poly と XOR する" : "feedback = 0 なので XOR しない";
    default:
      return undefined;
  }
}

function bitNoOf(step: Step): number | undefined {
  switch (step.kind) {
    case "feedback":
      return step.cursor + 1;
    case "shift":
    case "xor":
      return step.cursor;
    default:
      return undefined;
  }
}

/** 先頭から current までのステップを、新しい順に最大 limit 行のログにする。 */
export function logEntries(steps: readonly Step[], current: number, limit: number): LogEntry[] {
  const from = Math.max(0, current - limit + 1);
  return steps
    .slice(from, current + 1)
    .map((step, k): LogEntry => {
      const detail = detailOf(step);
      const bitNo = bitNoOf(step);
      return {
        index: from + k,
        kind: step.kind,
        title: TITLE[step.kind],
        bin: `0b${toBinary(step.reg)}`,
        hex: toHex(step.reg),
        ...(detail === undefined ? {} : { detail }),
        ...(bitNo === undefined ? {} : { bitNo }),
      };
    })
    .toReversed();
}
