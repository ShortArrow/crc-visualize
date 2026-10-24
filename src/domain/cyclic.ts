import type { Preset } from "./presets";
import type { Bit } from "./trace";

/** Generator polynomial g(x) = x^width + poly(x); poly holds the coefficients without the x^width term, and the constant term (the LSB of poly) is 1. */
export type Generator = Readonly<{ width: number; poly: number }>;

/** Generator polynomials small enough to draw as a ring, selectable on the cyclic page; the first is the default. */
export const GENERATORS: readonly Generator[] = [
  { width: 3, poly: 0x3 },
  { width: 3, poly: 0x5 },
  { width: 4, poly: 0x3 },
  { width: 4, poly: 0xf },
  { width: 5, poly: 0x5 },
];

export const DEFAULT_GENERATOR: Generator = GENERATORS[0]!;

const MESSAGE_PATTERN: readonly Bit[] = [1, 1, 0, 1];

/** The entry of GENERATORS whose width and poly match. */
export const findGenerator = (width: number, poly: number): Generator | undefined =>
  GENERATORS.find((g) => g.width === width && g.poly === poly);

/** State r (a polynomial below x^width) times x, modulo g(x); equals the LFSR state after one clock with input bit 0. */
const timesX = ({ width, poly }: Generator, r: number): number => {
  const msb = (r >> (width - 1)) & 1;
  return ((r << 1) & (2 ** width - 1)) ^ (msb ? poly : 0);
};

/** States x^j mod g(x) reached by clocking from 1 (x^0) with input bit 0, from j = 0 up to just before returning to x^0; throws if the constant term is 0, since it never returns. */
export function powerCycle(g: Generator): number[] {
  const states = [1];
  for (let r = timesX(g, 1); r !== 1; r = timesX(g, r)) {
    if (states.length >= 2 ** g.width) throw new Error(`Generator polynomial never returns to x^0: ${JSON.stringify(g)}`);
    states.push(r);
  }
  return states;
}

/** The smallest n (at least 1) with x^n mod g(x) = 1. */
export const period = (g: Generator): number => powerCycle(g).length;

/** Remainder of bits (first is highest degree) as a polynomial divided by g(x). */
export const remainder = (g: Generator, bits: readonly Bit[]): number => bits.reduce<number>((r, bit) => timesX(g, r) ^ bit, 0);

/** CRC of message (first is highest degree): the remainder of message · x^width divided by g(x). */
export const crcFor = (g: Generator, message: readonly Bit[]): number =>
  remainder(g, [...message, ...Array<Bit>(g.width).fill(0)]);

/** Codeword of length n: the message (first n − width bits of repeated 1101) followed by its CRC; first is highest degree. */
export function codeword(g: Generator): Bit[] {
  const message = Array.from({ length: period(g) - g.width }, (_, i) => MESSAGE_PATTERN[i % MESSAGE_PATTERN.length]!);
  const crc = crcFor(g, message);
  const crcBits = Array.from({ length: g.width }, (_, i): Bit => ((crc >> (g.width - 1 - i)) & 1 ? 1 : 0));
  return [...message, ...crcBits];
}

/** bits (first is highest degree) times x^k, modulo x^n − 1; each degree rises by k and bits past the highest degree wrap around to x^0. */
export function rotate(bits: readonly Bit[], k: number): Bit[] {
  const n = bits.length;
  return bits.map((_, i) => bits[(((i + k) % n) + n) % n]!);
}

/** Visualizer settings whose register, at the start of each clock, goes through the states of powerCycle(g): init 1, no reflection, xorout 0 and n input bits of 0. */
export const stateRingSettings = (g: Generator): Pick<Preset, "params" | "input"> => ({
  params: { width: g.width, poly: g.poly, init: 1, refin: false, refout: false, xorout: 0 },
  input: { mode: "bits", text: "0".repeat(period(g)) },
});
