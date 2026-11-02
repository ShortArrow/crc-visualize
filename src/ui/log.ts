import type { Bit, Register, Step } from "../domain/trace";
import type { Messages } from "../i18n/messages";
import { toBinary, toHex } from "./format";

/**
 * One log line. index is the original step number; bitNo is the 1-based number of the input bit involved.
 * bin and hex are crc after that step is processed.
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

/** Turns the steps from the start up to current into at most limit log lines, newest first. Text is written in the language of m. */
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

/**
 * One value row of a Progress block: index is the step it belongs to, bits the value MSB first and hex the same value.
 * changed (MSB first) marks the bits that differ from the value the row was computed from, on the rows that result from an XOR or a
 * reflection; dropped is the bit a shift pushes out on the left.
 */
export type LogRow = Readonly<{
  index: number;
  label: "init" | "before" | "shift" | "poly" | "xor" | "reflected" | "xorout" | "result";
  bits: string;
  hex: string;
  changed?: readonly boolean[];
  dropped?: Bit;
}>;

/**
 * One block of Progress, keyed by the index of its first step. A bit block holds the feedback, shift and xor of one input bit
 * (bitNo is 1-based); init, reflectOut and xorOut are blocks of their own; reflectIn is one line naming the byte (byteNo is
 * 1-based), its value as entered and the value fed.
 */
export type LogBlock = Readonly<
  | { kind: "bit"; key: number; bitNo: number; msb: Bit; inBit: Bit; fb: Bit; rows: readonly LogRow[] }
  | { kind: "init" | "reflectOut" | "xorOut"; key: number; rows: readonly LogRow[] }
  | { kind: "reflectIn"; key: number; byteNo: number; entered: number; fed: number }
>;

const rowOf = (index: number, label: LogRow["label"], reg: Register): LogRow => ({
  index,
  label,
  bits: toBinary(reg),
  hex: toHex(reg),
});

const changedFrom = (from: Register, to: Register): boolean[] => to.map((bit, i) => bit !== from[i]).toReversed();

const xorOf = (a: Register, b: Register): Register => a.map((bit, i) => (bit ^ b[i]!) as Bit);

const byteOf = (stream: readonly Bit[], byteIndex: number): number =>
  stream.slice(byteIndex * 8, byteIndex * 8 + 8).reduce<number>((v, b) => v * 2 + b, 0);

/**
 * Groups the steps up to current into Progress blocks, newest block first, keeping only whole blocks among the newest limit steps.
 * The done step adds no block.
 */
export function logBlocks(steps: readonly Step[], current: number, limit: number): LogBlock[] {
  let from = Math.max(0, current - limit + 1);
  while (from <= current && (steps[from]!.kind === "shift" || steps[from]!.kind === "xor")) from++;
  const blocks: LogBlock[] = [];
  let rows: LogRow[] = [];
  for (let index = from; index <= current; index++) {
    const step = steps[index]!;
    const before = steps[index - 1]?.reg ?? step.reg;
    switch (step.kind) {
      case "init":
        blocks.push({ kind: "init", key: index, rows: [rowOf(index, "init", step.reg)] });
        break;
      case "reflectIn":
        blocks.push({
          kind: "reflectIn",
          key: index,
          byteNo: step.byteIndex + 1,
          entered: byteOf(steps[index - 1]!.stream, step.byteIndex),
          fed: byteOf(step.stream, step.byteIndex),
        });
        break;
      case "feedback":
        blocks.push({
          kind: "bit",
          key: index,
          bitNo: step.cursor + 1,
          msb: step.msb,
          inBit: step.inBit,
          fb: step.fb,
          rows: (rows = [rowOf(index, "before", step.reg)]),
        });
        break;
      case "shift":
        rows.push({ ...rowOf(index, "shift", step.reg), dropped: step.dropped });
        break;
      case "xor":
        rows.push(rowOf(index, "poly", xorOf(before, step.reg)), {
          ...rowOf(index, "xor", step.reg),
          changed: changedFrom(before, step.reg),
        });
        break;
      case "reflectOut":
        blocks.push({
          kind: "reflectOut",
          key: index,
          rows: [
            rowOf(index, "before", before),
            { ...rowOf(index, "reflected", step.reg), changed: changedFrom(before, step.reg) },
          ],
        });
        break;
      case "xorOut":
        blocks.push({
          kind: "xorOut",
          key: index,
          rows: [
            rowOf(index, "before", before),
            rowOf(index, "xorout", xorOf(before, step.reg)),
            { ...rowOf(index, "result", step.reg), changed: changedFrom(before, step.reg) },
          ],
        });
        break;
      case "done":
        break;
    }
  }
  return blocks.toReversed();
}
