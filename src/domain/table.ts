import { reflectValue, type Bit, type CrcParams } from "./trace";

/** Direction of the table method: right shift when refin and refout are both true, left shift otherwise. */
export type TableDirection = "left" | "right";

/**
 * One clock while making a table value: the bit fed in, the feedback bit (the bit shifted out XOR bit), the register after
 * the shift by one, the value XORed in (poly, reversed for right shift, when feedback is 1, else 0) and the register afterwards.
 */
export type EntryClock = Readonly<{ bit: Bit; feedback: Bit; shifted: bigint; xor: bigint; reg: bigint }>;

/** One byte of the byte-at-a-time computation: crc before, table index, table value at that index, and crc after. */
export type TableStep = Readonly<{ byte: number; before: bigint; index: number; entry: bigint; after: bigint }>;

/** The byte-at-a-time computation: the starting register, one step per byte, and the CRC after the output reflection and xorout. */
export type TableRun = Readonly<{ start: bigint; steps: readonly TableStep[]; result: bigint }>;

const mask = (width: number) => (1n << BigInt(width)) - 1n;

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
  let reg = 0n;
  for (let k = 0; k < 8; k++) {
    const bit: Bit = (right ? (i >> k) & 1 : (i >> (7 - k)) & 1) ? 1 : 0;
    const feedback: Bit = Number((right ? reg : reg >> BigInt(width - 1)) & 1n) ^ bit ? 1 : 0;
    const shifted = right ? reg >> 1n : (reg << 1n) & mask(width);
    const xor = feedback ? poly : 0n;
    reg = shifted ^ xor;
    clocks.push({ bit, feedback, shifted, xor, reg });
  }
  return clocks;
}

/** Table T of the 256 values used by the byte-at-a-time computation. */
export const crcTable = (params: CrcParams): bigint[] => Array.from({ length: 256 }, (_, i) => entryClocks(params, i)[7]!.reg);

/** Index into the table and the part of crc kept by the shift, for one byte. */
function update(params: CrcParams, crc: bigint, byte: number): Readonly<{ index: number; kept: bigint }> {
  const { width } = params;
  const low8 = (v: bigint) => Number(v & 0xffn) ^ byte;
  if (tableDirection(params) === "right") return { index: low8(crc), kept: crc >> 8n };
  if (width < 8) return { index: low8(crc << BigInt(8 - width)), kept: 0n };
  return { index: low8(crc >> BigInt(width - 8)), kept: (crc << 8n) & mask(width) };
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
    const after = kept ^ entry;
    steps.push({ byte, before: crc, index, entry, after });
    crc = after;
  }
  const out = !right && params.refout ? reflectValue(crc, width) : crc;
  return { start, steps, result: out ^ params.xorout };
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
