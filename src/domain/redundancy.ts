import { period, remainder, type Generator } from "./cyclic";
import type { Bit } from "./trace";

/** Verdict on a received sequence: clean means no error, detected means a nonzero remainder caught the error, missed means the remainder is 0 despite an error. */
export type Verdict = "clean" | "detected" | "missed";

/** An error of length n that flips no bits. */
export const noError = (n: number): Bit[] => Array<Bit>(n).fill(0);

/** bits with bit i flipped. */
export const flip = (bits: readonly Bit[], i: number): Bit[] => bits.map((b, j) => (j === i ? ((1 - b) as Bit) : b));

/** Bitwise XOR of a and b. */
export const xorBits = (a: readonly Bit[], b: readonly Bit[]): Bit[] => a.map((x, i) => (x ^ (b[i] ?? 0)) as Bit);

/** Number of bits from the first flipped bit to the last; 0 if none are flipped. */
export function burstLength(error: readonly Bit[]): number {
  const first = error.indexOf(1);
  return first < 0 ? 0 : error.lastIndexOf(1) - first + 1;
}

/** Verdict on a sequence with error applied; the remainder of the received sequence equals error modulo g(x), so it depends only on error. */
export function verdict(g: Generator, error: readonly Bit[]): Verdict {
  if (!error.includes(1)) return "clean";
  return remainder(g, error) === 0 ? "missed" : "detected";
}

/** An error of length n with g(x) placed at the low end (x^width down to x^0); it is divisible by g(x), so it is missed. */
export function generatorError({ width, poly }: Generator, n: number): Bit[] {
  const g = 2 ** width + poly;
  return Array.from({ length: n }, (_, i): Bit => ((g >> (n - 1 - i)) & 1 ? 1 : 0));
}

/** bits (first is the MSB) as an integer. */
export const bitsValue = (bits: readonly Bit[]): number => bits.reduce<number>((v, b) => v * 2 + b, 0);

/** Every codeword value of length n (the period) divisible by g(x); it checks all 2^n sequences, so use it only for small n. */
export function codewordValues(g: Generator): Set<number> {
  const n = period(g);
  const values = new Set<number>();
  for (let v = 0; v < 2 ** n; v++) {
    const bits = Array.from({ length: n }, (_, i): Bit => ((v >> (n - 1 - i)) & 1 ? 1 : 0));
    if (remainder(g, bits) === 0) values.add(v);
  }
  return values;
}
