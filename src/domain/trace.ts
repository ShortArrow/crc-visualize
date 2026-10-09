export type Bit = 0 | 1;

/** レジスタ。添字 i が r[i]（x^i の係数）を表し、末尾が MSB。 */
export type Register = readonly Bit[];

/**
 * Rocksoft モデルの CRC パラメータ。
 * 不変条件: 1 ≤ width ≤ 32、0 < poly < 2^width、0 ≤ init, xorout < 2^width。
 */
export type CrcParams = Readonly<{
  width: number;
  poly: number;
  init: number;
  refin: boolean;
  refout: boolean;
  xorout: number;
}>;

/** Rocksoft モデルのパラメータ名。 */
export type ParamName = keyof CrcParams;

export const PARAM_NAMES: readonly ParamName[] = ["width", "poly", "init", "refin", "refout", "xorout"];

type StepBase = Readonly<{
  /** このステップ適用後のレジスタ。 */
  reg: Register;
  /** 画面に出す入力ストリーム（refin で反転済みのバイトは反転後の並び）。 */
  stream: readonly Bit[];
  /** 次に投入するビットの位置。全投入後は stream.length。 */
  cursor: number;
}>;

/** 1 ステップの状態。種類ごとの Given/Then は docs/spec.md の「ステップ列」を参照。 */
export type Step = StepBase &
  (
    | { kind: "init" }
    | { kind: "reflectIn"; byteIndex: number }
    | { kind: "feedback"; inBit: Bit; msb: Bit; fb: Bit }
    | { kind: "shift"; fb: Bit }
    | { kind: "xor" }
    | { kind: "reflectOut" }
    | { kind: "xorOut" }
    | { kind: "done" }
  );

export type StepKind = Step["kind"];

/** 整数の下位 width ビットをレジスタにする。 */
export function toRegister(value: number, width: number): Register {
  return Array.from({ length: width }, (_, i) => (Math.floor(value / 2 ** i) % 2) as Bit);
}

/** レジスタを符号なし整数にする。 */
export function registerValue(reg: Register): number {
  return reg.reduceRight<number>((acc, b) => acc * 2 + b, 0);
}

/** 整数の下位 width ビットの並びを反転する（例: 0x8005 を 16 ビットで反転すると 0xA001）。 */
export function reflectValue(value: number, width: number): number {
  return registerValue(toRegister(value, width).toReversed());
}

/** バイト列を MSB 先頭のビット列にする。 */
export function bitsFromBytes(bytes: readonly number[]): Bit[] {
  return bytes.flatMap((byte) => toRegister(byte, 8).toReversed());
}

const xorRegister = (a: Register, b: Register): Register => a.map((x, i) => (x ^ b[i]!) as Bit);

/**
 * CRC 計算をステップ列に展開する。最後のステップは常に done で、その reg が CRC。
 * 事前条件: params は CrcParams の不変条件を満たし、refin なら input.length は 8 の倍数。
 */
export function trace(params: CrcParams, input: readonly Bit[]): Step[] {
  const { width, refin, refout } = params;
  const poly = toRegister(params.poly, width);
  const steps: Step[] = [];
  let reg = toRegister(params.init, width);
  let stream = input;
  const push = (step: Step) => steps.push(step);

  push({ kind: "init", reg, stream, cursor: 0 });
  for (let cursor = 0; cursor < stream.length; cursor++) {
    if (refin && cursor % 8 === 0) {
      stream = [...stream.slice(0, cursor), ...stream.slice(cursor, cursor + 8).toReversed(), ...stream.slice(cursor + 8)];
      push({ kind: "reflectIn", byteIndex: cursor / 8, reg, stream, cursor });
    }
    const inBit = stream[cursor]!;
    const msb = reg[width - 1]!;
    const fb = (msb ^ inBit) as Bit;
    push({ kind: "feedback", inBit, msb, fb, reg, stream, cursor });
    reg = [0, ...reg.slice(0, width - 1)];
    push({ kind: "shift", fb, reg, stream, cursor: cursor + 1 });
    if (fb === 1) {
      reg = xorRegister(reg, poly);
      push({ kind: "xor", reg, stream, cursor: cursor + 1 });
    }
  }

  const end = stream.length;
  if (refout) {
    reg = reg.toReversed();
    push({ kind: "reflectOut", reg, stream, cursor: end });
  }
  if (params.xorout !== 0) {
    reg = xorRegister(reg, toRegister(params.xorout, width));
    push({ kind: "xorOut", reg, stream, cursor: end });
  }
  push({ kind: "done", reg, stream, cursor: end });
  return steps;
}
