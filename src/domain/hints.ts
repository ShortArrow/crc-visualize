import type { LogRow } from "./compare";
import { crcOf } from "./equivalence";
import { frameSpan } from "./frames";
import type { Frames } from "./parse";
import { sameParams, type Preset } from "./presets";
import { bitsFromBytes, reflectValue, type Bit, type CrcParams } from "./trace";

/**
 * Hints 1 to 5 of spec chapter 16, in their order: the bytes in the other order, the bits reflected, an XOR with xorout, an XOR with
 * all ones, and the first two each followed by one of the XORs.
 */
export const VALUE_HINTS = [
  "order",
  "reflect",
  "xorout",
  "ones",
  "order+xorout",
  "order+ones",
  "reflect+xorout",
  "reflect+ones",
] as const;
export type ValueHint = (typeof VALUE_HINTS)[number];

/** Hints are given only from this width up; below it a transformed value matches by chance too often. */
export const HINT_MIN_WIDTH = 8;

/** value taken as ⌈width/8⌉ bytes, with their order reversed. */
function otherOrder(value: bigint, width: number): bigint {
  let [rest, swapped] = [value, 0n];
  for (let i = 0; i < Math.ceil(width / 8); i++) {
    swapped = (swapped << 8n) | (rest & 0xffn);
    rest >>= 8n;
  }
  return swapped;
}

/**
 * The hints that would turn yours into computed, in the order of VALUE_HINTS. xorout is that of the settings, or undefined for a
 * value no final XOR goes into (an entry of table T), which gets only the order and reflection hints. Empty when the two are equal
 * or width is below HINT_MIN_WIDTH.
 */
export function valueHints(yours: bigint, computed: bigint, width: number, xorout: bigint | undefined): ValueHint[] {
  if (yours === computed || width < HINT_MIN_WIDTH) return [];
  const ones = (1n << BigInt(width)) - 1n;
  const reorders: Record<"order" | "reflect", ((v: bigint) => bigint) | undefined> = {
    order: Math.ceil(width / 8) >= 2 ? (v) => otherOrder(v, width) : undefined,
    reflect: (v) => reflectValue(v, width),
  };
  const xors: Record<"xorout" | "ones", bigint | undefined> = {
    xorout: xorout === undefined || xorout === 0n ? undefined : xorout,
    ones: xorout === undefined || xorout === ones ? undefined : ones,
  };
  const turns = (hint: ValueHint): boolean => {
    const [first, second] = hint.split("+") as [keyof typeof reorders | keyof typeof xors, (keyof typeof xors)?];
    if (first === "xorout" || first === "ones") return xors[first] !== undefined && (yours ^ xors[first]) === computed;
    const reorder = reorders[first];
    if (reorder === undefined) return false;
    if (second === undefined) return reorder(yours) === computed;
    return xors[second] !== undefined && (reorder(yours) ^ xors[second]) === computed;
  };
  return VALUE_HINTS.filter(turns);
}

/**
 * One hint as it is listed under a value that differs: one of hints 1 to 5, the CRC range ending by bytes earlier (negative) or
 * later, the row before or after, or other presets of the same width.
 */
export type Hint =
  | Readonly<{ kind: "value"; hint: ValueHint }>
  | Readonly<{ kind: "range"; by: number }>
  | Readonly<{ kind: "row"; side: "before" | "after" }>
  | Readonly<{ kind: "preset"; names: readonly string[] }>;

/** hints 1 to 5 as listed hints. */
export const asHints = (hints: readonly ValueHint[]): Hint[] => hints.map((hint) => ({ kind: "value", hint }));

/**
 * The CRC range of a compared CRC among the bytes around it: from and to are byte numbers in bytes, both ends included, and the
 * range may end as late as last.
 */
export type CrcRange = Readonly<{ bytes: readonly number[]; from: number; to: number; last: number }>;

/**
 * The range of the selected frame of hex input, which may end as late as the frame's last byte, or with no frames the whole input
 * bits, which cannot end later; undefined when the range does not fit the frame or the input is not whole bytes.
 */
export function crcRange(bits: readonly Bit[], frames: Frames | undefined, width: number): CrcRange | undefined {
  if (frames) {
    const frame = frames.list[frames.selected];
    const span = frame && frameSpan(frame.length, frames.layout, width);
    return span ? { bytes: frame, from: span.from, to: span.to, last: frame.length - 1 } : undefined;
  }
  if (bits.length === 0 || bits.length % 8 !== 0) return undefined;
  const bytes = Array.from({ length: bits.length / 8 }, (_, i) =>
    bits.slice(8 * i, 8 * i + 8).reduce<number>((b, bit) => (b << 1) | bit, 0),
  );
  return { bytes, from: 0, to: bytes.length - 1, last: bytes.length - 1 };
}

/**
 * Hint 6 for a CRC: by how many bytes the range would end earlier (negative) or later for its CRC to be yours, up to ⌈width/8⌉
 * bytes, never shorter than one byte nor past last. The earlier ends come first, the nearer first. Empty below HINT_MIN_WIDTH.
 */
export function rangeHints(params: CrcParams, range: CrcRange, yours: bigint): number[] {
  if (params.width < HINT_MIN_WIDTH) return [];
  const n = Math.ceil(params.width / 8);
  const shifts = [...Array.from({ length: n }, (_, i) => -(i + 1)), ...Array.from({ length: n }, (_, i) => i + 1)];
  return shifts.filter((by) => {
    const to = range.to + by;
    return to >= range.from && to <= range.last && crcOf(params, bitsFromBytes(range.bytes.slice(range.from, to + 1))) === yours;
  });
}

/** Hint 6 for a row of your log: whether the value computed for the row before or after is the one pasted at index. */
export function rowHints(rows: readonly LogRow[], index: number, width: number): ("before" | "after")[] {
  if (width < HINT_MIN_WIDTH) return [];
  const yours = rows[index]!.yours;
  return (["before", "after"] as const).filter((side) => rows[index + (side === "before" ? -1 : 1)]?.computed === yours);
}

/**
 * Hint 7: the presets of the width of params, other than one with params, whose CRC, as crc gives it, is yours; in the order of
 * presets. Empty below HINT_MIN_WIDTH.
 */
export function presetHints(presets: readonly Preset[], params: CrcParams, yours: bigint, crc: (p: Preset) => bigint): Preset[] {
  if (params.width < HINT_MIN_WIDTH) return [];
  return presets.filter((p) => p.params.width === params.width && !sameParams(p.params, params) && crc(p) === yours);
}
