import type { Step } from "../domain/trace";
import type { Messages } from "../i18n/messages";
import { toBinary, toHex } from "./format";

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

function detailOf(step: Step, m: Messages): string | undefined {
  switch (step.kind) {
    case "reflectIn":
      return m.log.byteNo(step.byteIndex + 1);
    case "feedback":
      return `msb ${step.msb} ⊕ bit ${step.inBit} = feedback ${step.fb}`;
    case "shift":
      return step.fb === 1 ? m.log.willXor : m.log.noXor;
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

/** 先頭から current までのステップを、新しい順に最大 limit 行のログにする。文は m の言語で書く。 */
export function logEntries(steps: readonly Step[], current: number, limit: number, m: Messages): LogEntry[] {
  const from = Math.max(0, current - limit + 1);
  return steps
    .slice(from, current + 1)
    .map((step, k): LogEntry => {
      const detail = detailOf(step, m);
      const bitNo = bitNoOf(step);
      return {
        index: from + k,
        kind: step.kind,
        title: m.steps[step.kind],
        bin: `0b${toBinary(step.reg)}`,
        hex: toHex(step.reg),
        ...(detail === undefined ? {} : { detail }),
        ...(bitNo === undefined ? {} : { bitNo }),
      };
    })
    .toReversed();
}
