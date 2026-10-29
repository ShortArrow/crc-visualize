import { reflectValue, type Bit, type CrcParams } from "./trace";

/** Direction of the table method: right shift when refin and refout are both true, left shift otherwise. */
export type TableDirection = "left" | "right";

/**
 * One clock while making a table value: the bit fed in, the feedback bit (the bit shifted out XOR bit), the register after
 * the shift by one, the value XORed in (poly, reversed for right shift, when feedback is 1, else 0) and the register afterwards.
 */
export type EntryClock = Readonly<{ bit: Bit; feedback: Bit; shifted: number; xor: number; reg: number }>;

/** One byte of the byte-at-a-time computation: crc before, table index, table value at that index, and crc after. */
export type TableStep = Readonly<{ byte: number; before: number; index: number; entry: number; after: number }>;

/** The byte-at-a-time computation: the starting register, one step per byte, and the CRC after the output reflection and xorout. */
export type TableRun = Readonly<{ start: number; steps: readonly TableStep[]; result: number }>;

const mask = (width: number) => 2 ** width - 1;

/** Direction of the table used for params. */
export const tableDirection = ({ refin, refout }: CrcParams): TableDirection => (refin && refout ? "right" : "left");

/**
 * The 8 clocks that make table value i, starting from a zero register: left shift feeds the bits of i MSB first into the
 * register of chapter 3, right shift feeds them LSB first into a register that shifts right with poly reversed.
 */
export function entryClocks(params: CrcParams, i: number): EntryClock[] {
  const { width } = params;
  const right = tableDirection(params) === "right";
  const poly = right ? reflectValue(params.poly, width) : params.poly;
  const clocks: EntryClock[] = [];
  let reg = 0;
  for (let k = 0; k < 8; k++) {
    const bit: Bit = (right ? (i >> k) & 1 : (i >> (7 - k)) & 1) ? 1 : 0;
    const feedback: Bit = ((right ? reg : reg >>> (width - 1)) & 1) ^ bit ? 1 : 0;
    const shifted = right ? reg >>> 1 : (reg * 2) & mask(width);
    const xor = feedback ? poly : 0;
    reg = (shifted ^ xor) >>> 0;
    clocks.push({ bit, feedback, shifted, xor, reg });
  }
  return clocks;
}

/** Table T of the 256 values used by the byte-at-a-time computation. */
export const crcTable = (params: CrcParams): number[] => Array.from({ length: 256 }, (_, i) => entryClocks(params, i)[7]!.reg);

/** Index into the table and the part of crc kept by the shift, for one byte. */
function update(params: CrcParams, crc: number, byte: number): Readonly<{ index: number; kept: number }> {
  const { width } = params;
  if (tableDirection(params) === "right") return { index: (crc ^ byte) & 0xff, kept: crc >>> 8 };
  if (width < 8) return { index: ((crc << (8 - width)) ^ byte) & 0xff, kept: 0 };
  return { index: ((crc >>> (width - 8)) ^ byte) & 0xff, kept: width === 8 ? 0 : ((crc * 256) % 2 ** width) >>> 0 };
}

/**
 * Computes input a byte at a time with the table. Left shift reverses each byte first when refin is true and the result
 * when refout is true; right shift starts from init reversed. undefined when input is not a multiple of 8 bits.
 */
export function tableRun(params: CrcParams, input: readonly Bit[]): TableRun | undefined {
  if (input.length % 8 !== 0) return undefined;
  const { width } = params;
  const right = tableDirection(params) === "right";
  const table = crcTable(params);
  const start = right ? reflectValue(params.init, width) : params.init;
  const steps: TableStep[] = [];
  let crc = start;
  for (let base = 0; base < input.length; base += 8) {
    const bits = input.slice(base, base + 8);
    const fed = !right && params.refin ? bits.toReversed() : bits;
    const byte = fed.reduce<number>((v, b) => v * 2 + b, 0);
    const { index, kept } = update(params, crc, byte);
    const entry = table[index]!;
    const after = (kept ^ entry) >>> 0;
    steps.push({ byte, before: crc, index, entry, after });
    crc = after;
  }
  const out = !right && params.refout ? reflectValue(crc, width) : crc;
  return { start, steps, result: (out ^ params.xorout) >>> 0 };
}

/**
 * One step of playing the Table page. start: only T[0] is filled. clock: the clock-th (0 to 7) clock of making T[entry], which
 * fills it at clock 7. fill: T[entry] is filled in one step. index, lookup and update: the three steps of the byte-th input byte.
 * reflectOut, xorOut and done: the output reflection, xorout, and the result.
 */
export type TablePlayStep = Readonly<
  | { kind: "start" }
  | { kind: "clock"; entry: number; clock: number }
  | { kind: "fill"; entry: number }
  | { kind: "index" | "lookup" | "update"; byte: number }
  | { kind: "reflectOut" | "xorOut" | "done" }
>;

/** The values made clock by clock; the others are filled one step each, in index order. */
export const CLOCKED_ENTRIES: readonly number[] = [1, 2];

/**
 * The steps of making table T and then computing input a byte at a time with it. When input is not a multiple of 8 bits, the
 * steps end with filling T[255].
 */
export function tablePlay(params: CrcParams, input: readonly Bit[]): TablePlayStep[] {
  const making: TablePlayStep[] = [
    { kind: "start" },
    ...CLOCKED_ENTRIES.flatMap((entry) => Array.from({ length: 8 }, (_, clock) => ({ kind: "clock" as const, entry, clock }))),
    ...Array.from({ length: 256 - 1 - CLOCKED_ENTRIES.length }, (_, k) => ({
      kind: "fill" as const,
      entry: k + 1 + CLOCKED_ENTRIES.length,
    })),
  ];
  const run = tableRun(params, input);
  if (!run) return making;
  const reflects = tableDirection(params) === "left" && params.refout;
  return [
    ...making,
    ...run.steps.flatMap((_, byte) => (["index", "lookup", "update"] as const).map((kind) => ({ kind, byte }))),
    ...(reflects ? [{ kind: "reflectOut" as const }] : []),
    { kind: "xorOut" },
    { kind: "done" },
  ];
}

/** What the Table page plays: making one value, making the table, or using it a byte at a time. */
export type PlayMode = "value" | "table" | "use";

/**
 * One step of a Table page playback. clocks: done of the 8 clocks of making a value have run. filled: T[0] to T[count - 1] are
 * filled. index, lookup and update: the three steps of the byte-th input byte. reflectOut, xorOut and done: the output
 * reflection, xorout, and the result.
 */
export type PlayStep = Readonly<
  | { kind: "clocks"; done: number }
  | { kind: "filled"; count: number }
  | { kind: "index" | "lookup" | "update"; byte: number }
  | { kind: "reflectOut" | "xorOut" | "done" }
>;

/** The steps of making one value: none of its 8 clocks run, then one more each step. */
export const valueSteps = (): PlayStep[] => Array.from({ length: 9 }, (_, done) => ({ kind: "clocks", done }));

/** The steps of making table T: only T[0] filled, then one more cell each step, in index order. */
export const fillSteps = (): PlayStep[] => Array.from({ length: 256 }, (_, k) => ({ kind: "filled", count: k + 1 }));

/**
 * The steps of computing input a byte at a time with table T, ending with the output reflection (left shift with refout), xorout
 * and the result; undefined when input is not a multiple of 8 bits.
 */
export function useSteps(params: CrcParams, input: readonly Bit[]): PlayStep[] | undefined {
  const run = tableRun(params, input);
  if (!run) return undefined;
  const reflects = tableDirection(params) === "left" && params.refout;
  return [
    ...run.steps.flatMap((_, byte) => (["index", "lookup", "update"] as const).map((kind) => ({ kind, byte }))),
    ...(reflects ? [{ kind: "reflectOut" as const }] : []),
    { kind: "xorOut" },
    { kind: "done" },
  ];
}

/** Number of values of table T filled at step: T[0] to T[filledEntries - 1]. */
export function filledEntries(step: TablePlayStep): number {
  switch (step.kind) {
    case "start":
      return 1;
    case "clock":
      return step.clock === 7 ? step.entry + 1 : step.entry;
    case "fill":
      return step.entry + 1;
    default:
      return 256;
  }
}
