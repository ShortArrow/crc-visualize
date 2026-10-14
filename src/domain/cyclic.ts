import type { Bit } from "./trace";

/** 生成多項式 g(x) = x^width + poly(x)。poly は x^width 項を除いた係数で、定数項（poly の最下位ビット）は 1。 */
export type Generator = Readonly<{ width: number; poly: number }>;

/** 巡回のページで選べる、輪に描ける大きさの生成多項式。先頭が既定。 */
export const GENERATORS: readonly Generator[] = [
  { width: 3, poly: 0x3 },
  { width: 3, poly: 0x5 },
  { width: 4, poly: 0x3 },
  { width: 4, poly: 0xf },
  { width: 5, poly: 0x5 },
];

export const DEFAULT_GENERATOR: Generator = GENERATORS[0]!;

const MESSAGE_PATTERN: readonly Bit[] = [1, 1, 0, 1];

/** GENERATORS のうち width と poly が一致するもの。 */
export const findGenerator = (width: number, poly: number): Generator | undefined =>
  GENERATORS.find((g) => g.width === width && g.poly === poly);

/** 状態 r（x^width 未満の多項式）に x を掛けて g(x) で割った余り。入力ビット 0 で 1 クロックした LFSR の状態にあたる。 */
const timesX = ({ width, poly }: Generator, r: number): number => {
  const msb = (r >> (width - 1)) & 1;
  return ((r << 1) & (2 ** width - 1)) ^ (msb ? poly : 0);
};

/** 1（x^0）から入力ビット 0 でクロックした状態 x^j mod g(x) を、j = 0 から x^0 に戻る手前まで。定数項が 0 なら戻らないので投げる。 */
export function powerCycle(g: Generator): number[] {
  const states = [1];
  for (let r = timesX(g, 1); r !== 1; r = timesX(g, r)) {
    if (states.length >= 2 ** g.width) throw new Error(`x^0 に戻らない生成多項式: ${JSON.stringify(g)}`);
    states.push(r);
  }
  return states;
}

/** x^n mod g(x) = 1 となる最小の n（1 以上）。 */
export const period = (g: Generator): number => powerCycle(g).length;

/** bits（先頭が最高次）を多項式として g(x) で割った余り。 */
export const remainder = (g: Generator, bits: readonly Bit[]): number => bits.reduce<number>((r, bit) => timesX(g, r) ^ bit, 0);

/** 本文（1101 を繰り返した先頭 n − width ビット）の後ろに CRC を付けた、長さ n の符号語。先頭が最高次。 */
export function codeword(g: Generator): Bit[] {
  const message = Array.from({ length: period(g) - g.width }, (_, i) => MESSAGE_PATTERN[i % MESSAGE_PATTERN.length]!);
  const crc = remainder(g, [...message, ...Array<Bit>(g.width).fill(0)]);
  const crcBits = Array.from({ length: g.width }, (_, i): Bit => ((crc >> (g.width - 1 - i)) & 1 ? 1 : 0));
  return [...message, ...crcBits];
}

/** bits（先頭が最高次）に x^k を掛けて x^n − 1 で割った余り。各次数が k 上がり、最高次を越えたビットは x^0 へ回り込む。 */
export function rotate(bits: readonly Bit[], k: number): Bit[] {
  const n = bits.length;
  return bits.map((_, i) => bits[(((i + k) % n) + n) % n]!);
}
