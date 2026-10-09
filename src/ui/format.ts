import { registerValue, type Bit, type Register } from "../domain/trace";

/** レジスタを MSB 先頭の 2 進文字列にする。 */
export const toBinary = (reg: Register): string => reg.toReversed().join("");

/** レジスタを width に見合う桁数の 16 進文字列（0x 付き、大文字）にする。 */
export const toHex = (reg: Register): string =>
  `0x${registerValue(reg).toString(16).toUpperCase().padStart(Math.ceil(reg.length / 4), "0")}`;

export const bitsToString = (bits: readonly Bit[]): string => bits.join("");
