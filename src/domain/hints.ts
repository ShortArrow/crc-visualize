import { reflectValue } from "./trace";

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
