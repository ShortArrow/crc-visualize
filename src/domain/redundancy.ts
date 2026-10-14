import { period, remainder, type Generator } from "./cyclic";
import type { Bit } from "./trace";

/** 受け取った並びの判定。clean は誤りなし、detected は余りが 0 でなく誤りを見つけた、missed は誤りがあるのに余りが 0。 */
export type Verdict = "clean" | "detected" | "missed";

/** 長さ n の、どのビットも反転しない誤り。 */
export const noError = (n: number): Bit[] => Array<Bit>(n).fill(0);

/** bits の i 番目を反転したもの。 */
export const flip = (bits: readonly Bit[], i: number): Bit[] => bits.map((b, j) => (j === i ? ((1 - b) as Bit) : b));

/** a と b のビットごとの XOR。 */
export const xorBits = (a: readonly Bit[], b: readonly Bit[]): Bit[] => a.map((x, i) => (x ^ (b[i] ?? 0)) as Bit);

/** 反転した最初のビットから最後のビットまでのビット数。反転が無ければ 0。 */
export function burstLength(error: readonly Bit[]): number {
  const first = error.indexOf(1);
  return first < 0 ? 0 : error.lastIndexOf(1) - first + 1;
}

/** 誤り error を入れた並びの判定。受け取った並びの余りは error を g(x) で割った余りに等しいので、error だけで決まる。 */
export function verdict(g: Generator, error: readonly Bit[]): Verdict {
  if (!error.includes(1)) return "clean";
  return remainder(g, error) === 0 ? "missed" : "detected";
}

/** 長さ n の並びの下の端（x^width から x^0）に g(x) を置いた誤り。g(x) で割り切れるので見逃す。 */
export function generatorError({ width, poly }: Generator, n: number): Bit[] {
  const g = 2 ** width + poly;
  return Array.from({ length: n }, (_, i): Bit => ((g >> (n - 1 - i)) & 1 ? 1 : 0));
}

/** bits（先頭が最上位）を整数にしたもの。 */
export const bitsValue = (bits: readonly Bit[]): number => bits.reduce<number>((v, b) => v * 2 + b, 0);

/** 長さ n（周期）の並びのうち、g(x) で割り切れる符号語の値の全て。n が大きいと 2^n 通りを調べるので、小さい n で使う。 */
export function codewordValues(g: Generator): Set<number> {
  const n = period(g);
  const values = new Set<number>();
  for (let v = 0; v < 2 ** n; v++) {
    const bits = Array.from({ length: n }, (_, i): Bit => ((v >> (n - 1 - i)) & 1 ? 1 : 0));
    if (remainder(g, bits) === 0) values.add(v);
  }
  return values;
}
