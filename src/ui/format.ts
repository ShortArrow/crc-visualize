import { registerValue, type Bit, type Register } from "../domain/trace";

/** Writes the register as a binary string, MSB first. */
export const toBinary = (reg: Register): string => reg.toReversed().join("");

/** Writes the register as a hexadecimal string (with 0x, uppercase) with as many digits as width needs. */
export const toHex = (reg: Register): string =>
  `0x${registerValue(reg)
    .toString(16)
    .toUpperCase()
    .padStart(Math.ceil(reg.length / 4), "0")}`;

export const bitsToString = (bits: readonly Bit[]): string => bits.join("");

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const superscript = (d: number): string => [...String(d)].map((c) => SUPERSCRIPTS[Number(c)]).join("");

/** Writes x to the power d with a superscript exponent ("x³"). Exponents of 0 and 1 are not omitted. */
export const powerText = (d: number): string => `x${superscript(d)}`;

/** Writes 2 to the power d with a superscript exponent and its value ("2⁷ = 128"). */
export const powerOfTwoText = (d: number): string => `2${superscript(d)} = ${2 ** d}`;

const term = (d: number): string => (d === 0 ? "1" : d === 1 ? "x" : powerText(d));

/** Writes the generator polynomial x^width + poly(x) with superscript exponents, highest degree first ("x³ + x + 1"). */
export const polynomialText = (width: number, poly: number): string =>
  [width, ...Array.from({ length: width }, (_, i) => width - 1 - i).filter((d) => (poly >> d) & 1)].map(term).join(" + ");
