import { reflectValue, type Bit, type CrcParams } from "./trace";

/** Direction of the table method: right shift when refin and refout are both true, left shift otherwise. */
export type TableDirection = "left" | "right";

/** One clock while making a table value: the bit fed in and the register afterwards. */
export type EntryClock = Readonly<{ bit: Bit; reg: number }>;

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
    if (right) {
      const feedback = (reg ^ bit) & 1;
      reg = ((reg >>> 1) ^ (feedback ? poly : 0)) >>> 0;
    } else {
      const feedback = ((reg >>> (width - 1)) & 1) ^ bit;
      reg = (((reg * 2) & mask(width)) ^ (feedback ? poly : 0)) >>> 0;
    }
    clocks.push({ bit, reg });
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
