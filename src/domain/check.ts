import { crcOf } from "./equivalence";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

/** 計算し直して比べた結果。computed は受け取った本文の CRC、received は受け取った CRC。 */
export type Recheck = Readonly<{ computed: number; received: number; ok: boolean }>;

/** 符号語ごと通した結果。value は受け取った並び全体の CRC、residue は誤りが無いときの値。 */
export type WholeCheck = Readonly<{ value: number; residue: number; ok: boolean }>;

const reflected = ({ refin, refout }: CrcParams) => refin && refout;

const bitsOf = (value: number, length: number): Bit[] =>
  Array.from({ length }, (_, i): Bit => ((value >>> (length - 1 - i)) & 1 ? 1 : 0));

const valueOf = (bits: readonly Bit[]): number => bits.reduce<number>((v, b) => v * 2 + b, 0);

/** 下位から数えたバイト数。refin・refout が true のとき、CRC はこのバイト数で付ける。 */
const byteCount = (width: number) => Math.ceil(width / 8);

/**
 * 本文の後ろに付ける CRC のビット。refin・refout が true なら下位のバイトから ⌈width/8⌉ バイト（計算では refin で反転されて最下位ビットから入る）、
 * それ以外は最上位ビットから width ビット。
 */
export function crcBits(params: CrcParams, crc: number): Bit[] {
  if (!reflected(params)) return bitsOf(crc, params.width);
  return bitsFromBytes(Array.from({ length: byteCount(params.width) }, (_, i) => Math.floor(crc / 2 ** (8 * i)) & 0xff));
}

/** crcBits で付けたビットを CRC の値に戻す。 */
function readCrc(params: CrcParams, bits: readonly Bit[]): number {
  if (!reflected(params)) return valueOf(bits);
  return Array.from({ length: byteCount(params.width) }, (_, i) => valueOf(bits.slice(8 * i, 8 * i + 8)) * 2 ** (8 * i)).reduce(
    (a, b) => a + b,
    0,
  );
}

/** CRC のビットの長さ。 */
export const crcLength = (params: CrcParams): number => (reflected(params) ? 8 * byteCount(params.width) : params.width);

/** 送る並び。本文 message の後ろに、その CRC を crcBits の順で付ける。 */
export const frame = (params: CrcParams, message: readonly Bit[]): Bit[] => [
  ...message,
  ...crcBits(params, crcOf(params, message)),
];

/**
 * 誤りの無い送る並び全体を同じ設定で計算したときの、本文によらない値（残余）。
 * refin と refout が違うと、付けた CRC がレジスタの並びと揃わず一定にならないので undefined。
 */
export function residue(params: CrcParams): number | undefined {
  if (params.refin !== params.refout) return undefined;
  return crcOf(params, frame(params, []));
}

/** 受け取った並び received の先頭 messageLength ビットを本文として CRC を計算し直し、残りの受け取った CRC と比べる。 */
export function recheck(params: CrcParams, received: readonly Bit[], messageLength: number): Recheck {
  const computed = crcOf(params, received.slice(0, messageLength));
  const got = readCrc(params, received.slice(messageLength));
  return { computed, received: got, ok: computed === got };
}

/** 受け取った並び received 全体を計算し、残余と比べる。残余が無い設定では undefined。 */
export function wholeCheck(params: CrcParams, received: readonly Bit[]): WholeCheck | undefined {
  const r = residue(params);
  if (r === undefined) return undefined;
  const value = crcOf(params, received);
  return { value, residue: r, ok: value === r };
}
