import { reflectValue, registerValue, trace, type Bit, type CrcParams } from "./trace";

/** 置き換えの項目。refin は入力の反転、refout は出力の反転、rightShift は右送りの実装、initPrefix は初期値と前置き、affine は初期値と最終 XOR の分。 */
export type EquivalenceId = "refin" | "refout" | "rightShift" | "initPrefix" | "affine";

/** 置き換えが当てはまらない理由。notBytes は入力がバイト単位でない、notReflected は refin と refout が両方 true でない、evenPoly は poly の最下位ビットが 0。 */
export type NotApplicable = "notBytes" | "notReflected" | "evenPoly";

/** 1 つの置き換えを今の設定と入力で計算した結果。left は元の設定の CRC、right は置き換えた側の CRC。 */
export type Equivalence =
  | Readonly<{ id: EquivalenceId; applicable: true; left: number; right: number }>
  | Readonly<{ id: EquivalenceId; applicable: false; reason: NotApplicable }>;

/** 実装のシフトの向き。right は右送り、left は左送り、mixed はどちらでも別にビットの並びを反転する処理が要る。 */
export type ShiftDirection = "right" | "left" | "mixed";

/** a と b の XOR を符号なしの整数にしたもの（32 ビットの値でも負にしない）。 */
const xor = (a: number, b: number): number => (a ^ b) >>> 0;

/** params で input を計算した CRC。 */
export function crcOf(params: CrcParams, input: readonly Bit[]): number {
  const steps = trace(params, input);
  return registerValue(steps[steps.length - 1]!.reg);
}

/** input（長さは 8 の倍数）の各バイトのビットの並びを反転したもの。 */
export const reverseEachByte = (input: readonly Bit[]): Bit[] => input.map((_, i) => input[i - (i % 8) + 7 - (i % 8)]!);

/**
 * refin・refout が true の params を、反転をせずに右へシフトするレジスタで計算した CRC。
 * poly と init はビットの並びを反転した値を使い、各バイトを LSB から入れて最下位ビットで分ける。
 */
export function rightShiftCrc(params: CrcParams, input: readonly Bit[]): number {
  const poly = reflectValue(params.poly, params.width);
  let crc = reflectValue(params.init, params.width);
  for (let base = 0; base < input.length; base += 8) {
    for (let k = 0; k < 8; k++) {
      const feedback = (crc ^ input[base + 7 - k]!) & 1;
      crc = (crc >>> 1) ^ (feedback ? poly : 0);
    }
  }
  return xor(crc, params.xorout);
}

/** 状態 r に x の逆元を掛けて g(x) で割った余り。poly の最下位ビットが 1 のときだけ使える。 */
const divideByX = ({ width, poly }: CrcParams, r: number): number =>
  r & 1 ? (((r ^ poly) >>> 1) | (2 ** (width - 1))) >>> 0 : r >>> 1;

/**
 * init = 0 で入力の前に足すと init を入れたのと同じになる width ビットの前置き P（P(x)·x^width ≡ init (mod g(x))）。
 * poly の最下位ビットが 0 なら x で割れないので undefined。
 */
export function initPrefix(params: CrcParams): Bit[] | undefined {
  if ((params.poly & 1) === 0) return undefined;
  let p = params.init;
  for (let i = 0; i < params.width; i++) p = divideByX(params, p);
  return Array.from({ length: params.width }, (_, i): Bit => ((p >>> (params.width - 1 - i)) & 1 ? 1 : 0));
}

/** params と input で、5 つの置き換えの両辺を計算する。当てはまらない項目は理由を返す。 */
export function equivalences(params: CrcParams, input: readonly Bit[]): Equivalence[] {
  const left = crcOf(params, input);
  const ok = (id: EquivalenceId, right: number): Equivalence => ({ id, applicable: true, left, right });
  const no = (id: EquivalenceId, reason: NotApplicable): Equivalence => ({ id, applicable: false, reason });
  const bytes = input.length % 8 === 0;
  const prefix = initPrefix(params);
  const fed = params.refin ? reverseEachByte(input) : input;
  return [
    bytes ? ok("refin", crcOf({ ...params, refin: !params.refin }, reverseEachByte(input))) : no("refin", "notBytes"),
    ok(
      "refout",
      xor(reflectValue(xor(crcOf({ ...params, refout: !params.refout }, input), params.xorout), params.width), params.xorout),
    ),
    params.refin && params.refout ? ok("rightShift", rightShiftCrc(params, input)) : no("rightShift", "notReflected"),
    prefix ? ok("initPrefix", crcOf({ ...params, init: 0, refin: false }, [...prefix, ...fed])) : no("initPrefix", "evenPoly"),
    ok("affine", xor(crcOf({ ...params, init: 0, xorout: 0 }, input), crcOf(params, Array<Bit>(input.length).fill(0)))),
  ];
}

/** params を反転なしで計算できる実装のシフトの向き。 */
export function shiftDirection({ refin, refout }: CrcParams): ShiftDirection {
  if (refin !== refout) return "mixed";
  return refin ? "right" : "left";
}

/** 反転なしで計算する実装のコードに書かれる poly と init。右送りならビットの並びを反転した値。 */
export function codeConstants(params: CrcParams): Readonly<{ poly: number; init: number }> {
  if (shiftDirection(params) !== "right") return { poly: params.poly, init: params.init };
  return { poly: reflectValue(params.poly, params.width), init: reflectValue(params.init, params.width) };
}
