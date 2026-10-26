export type Bit = 0 | 1;

/** The register; index i is r[i] (the coefficient of x^i), and the last element is the MSB. */
export type Register = readonly Bit[];

/**
 * CRC parameters of the Rocksoft model.
 * Invariant: 1 ≤ width ≤ 32, 0 < poly < 2^width, 0 ≤ init, xorout < 2^width.
 */
export type CrcParams = Readonly<{
  width: number;
  poly: number;
  init: number;
  refin: boolean;
  refout: boolean;
  xorout: number;
}>;

/** Parameter names of the Rocksoft model. */
export type ParamName = keyof CrcParams;

export const PARAM_NAMES: readonly ParamName[] = ["width", "poly", "init", "refin", "refout", "xorout"];

type StepBase = Readonly<{
  /** The register after this step is applied. */
  reg: Register;
  /** The input stream shown on screen (bytes already reflected by refin appear in reflected order). */
  stream: readonly Bit[];
  /** Position of the next input bit; stream.length once all bits are fed. */
  cursor: number;
}>;

/** State of one step; see "Step sequence" in docs/spec.md for the Given/Then of each kind. */
export type Step = StepBase &
  (
    | { kind: "init" }
    | { kind: "reflectIn"; byteIndex: number }
    | { kind: "feedback"; inBit: Bit; msb: Bit; fb: Bit }
    | { kind: "shift"; fb: Bit; dropped: Bit }
    | { kind: "xor" }
    | { kind: "reflectOut" }
    | { kind: "xorOut" }
    | { kind: "done" }
  );

export type StepKind = Step["kind"];

/** Turns the low width bits of an integer into a register. */
export function toRegister(value: number, width: number): Register {
  return Array.from({ length: width }, (_, i) => (Math.floor(value / 2 ** i) % 2) as Bit);
}

/** Turns a register into an unsigned integer. */
export function registerValue(reg: Register): number {
  return reg.reduceRight<number>((acc, b) => acc * 2 + b, 0);
}

/** Reverses the order of the low width bits of an integer (e.g. 0x8005 reflected over 16 bits is 0xA001). */
export function reflectValue(value: number, width: number): number {
  return registerValue(toRegister(value, width).toReversed());
}

/** Turns bytes into bits, MSB first. */
export function bitsFromBytes(bytes: readonly number[]): Bit[] {
  return bytes.flatMap((byte) => toRegister(byte, 8).toReversed());
}

const xorRegister = (a: Register, b: Register): Register => a.map((x, i) => (x ^ b[i]!) as Bit);

/**
 * Position in step.stream of the value fed as bit k. With refin, a byte not yet reflected at this step shows that value at the
 * mirrored position within the byte; otherwise it is k. The mapping is its own inverse, so it also gives the bit fed as the value
 * shown at position k.
 */
export function streamPosition(step: Step, refin: boolean, k: number): number {
  const started = step.kind === "reflectIn" || step.kind === "feedback" ? step.cursor + 1 : step.cursor;
  const byteStart = k - (k % 8);
  return refin && byteStart >= started ? byteStart + 7 - (k % 8) : k;
}

/**
 * Expands a CRC computation into a sequence of steps; the last step is always done, and its reg is the CRC.
 * Precondition: params satisfies the CrcParams invariant, and input.length is a multiple of 8 when refin is set.
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
    push({ kind: "shift", fb, dropped: msb, reg, stream, cursor: cursor + 1 });
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
