import { crcOf } from "./equivalence";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

/** Result of recomputing and comparing; computed is the CRC of the received message, received is the received CRC. */
export type Recheck = Readonly<{ computed: number; received: number; ok: boolean }>;

/** Result of running the whole codeword through; value is the CRC of the entire received sequence, residue is the value when there is no error. */
export type WholeCheck = Readonly<{ value: number; residue: number; ok: boolean }>;

const reflected = ({ refin, refout }: CrcParams) => refin && refout;

const bitsOf = (value: number, length: number): Bit[] =>
  Array.from({ length }, (_, i): Bit => ((value >>> (length - 1 - i)) & 1 ? 1 : 0));

const valueOf = (bits: readonly Bit[]): number => bits.reduce<number>((v, b) => v * 2 + b, 0);

/** Number of bytes counted from the low end; when refin and refout are true, the CRC is appended as this many bytes. */
const byteCount = (width: number) => Math.ceil(width / 8);

/**
 * CRC bits appended after the message: ⌈width/8⌉ bytes from the low byte when refin and refout are true (refin reflects them so they enter LSB first),
 * otherwise width bits from the MSB.
 */
export function crcBits(params: CrcParams, crc: number): Bit[] {
  if (!reflected(params)) return bitsOf(crc, params.width);
  return bitsFromBytes(Array.from({ length: byteCount(params.width) }, (_, i) => Math.floor(crc / 2 ** (8 * i)) & 0xff));
}

/** Turns bits appended by crcBits back into the CRC value. */
function readCrc(params: CrcParams, bits: readonly Bit[]): number {
  if (!reflected(params)) return valueOf(bits);
  return Array.from({ length: byteCount(params.width) }, (_, i) => valueOf(bits.slice(8 * i, 8 * i + 8)) * 2 ** (8 * i)).reduce(
    (a, b) => a + b,
    0,
  );
}

/** Length of the CRC in bits. */
export const crcLength = (params: CrcParams): number => (reflected(params) ? 8 * byteCount(params.width) : params.width);

/** The transmitted sequence: message followed by its CRC in crcBits order. */
export const frame = (params: CrcParams, message: readonly Bit[]): Bit[] => [
  ...message,
  ...crcBits(params, crcOf(params, message)),
];

/**
 * The message-independent value (residue) obtained by running an error-free transmitted sequence through the same parameters.
 * undefined when refin and refout differ, because the appended CRC does not line up with the register and the value is not constant.
 */
export function residue(params: CrcParams): number | undefined {
  if (params.refin !== params.refout) return undefined;
  return crcOf(params, frame(params, []));
}

/** Recomputes the CRC over the first messageLength bits of received as the message and compares it with the received CRC in the remaining bits. */
export function recheck(params: CrcParams, received: readonly Bit[], messageLength: number): Recheck {
  const computed = crcOf(params, received.slice(0, messageLength));
  const got = readCrc(params, received.slice(messageLength));
  return { computed, received: got, ok: computed === got };
}

/** Runs the entire received sequence through and compares the result with the residue; undefined for parameters without a residue. */
export function wholeCheck(params: CrcParams, received: readonly Bit[]): WholeCheck | undefined {
  const r = residue(params);
  if (r === undefined) return undefined;
  const value = crcOf(params, received);
  return { value, residue: r, ok: value === r };
}
