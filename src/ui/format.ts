import { registerValue, type Bit, type Register } from "../domain/trace";

/** レジスタを MSB 先頭の 2 進文字列にする。 */
export const toBinary = (reg: Register): string => reg.toReversed().join("");

/** レジスタを width に見合う桁数の 16 進文字列（0x 付き、大文字）にする。 */
export const toHex = (reg: Register): string =>
  `0x${registerValue(reg)
    .toString(16)
    .toUpperCase()
    .padStart(Math.ceil(reg.length / 4), "0")}`;

export const bitsToString = (bits: readonly Bit[]): string => bits.join("");

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const superscript = (d: number): string => [...String(d)].map((c) => SUPERSCRIPTS[Number(c)]).join("");

/** x の d 乗を上付きの指数で書く（"x³"）。指数が 0 や 1 でも省かない。 */
export const powerText = (d: number): string => `x${superscript(d)}`;

/** 2 の d 乗を、上付きの指数とその値で書く（"2⁷ = 128"）。 */
export const powerOfTwoText = (d: number): string => `2${superscript(d)} = ${2 ** d}`;

const term = (d: number): string => (d === 0 ? "1" : d === 1 ? "x" : powerText(d));

/** 生成多項式 x^width + poly(x) を、次数の大きい項から上付きの指数で書く（"x³ + x + 1"）。 */
export const polynomialText = (width: number, poly: number): string =>
  [width, ...Array.from({ length: width }, (_, i) => width - 1 - i).filter((d) => (poly >> d) & 1)].map(term).join(" + ");
