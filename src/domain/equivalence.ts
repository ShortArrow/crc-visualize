import { reflectValue, registerValue, trace, type Bit, type CrcParams } from "./trace";

/** Substitution items: refin is input reflection, refout is output reflection, rightShift is the right-shift implementation, initPrefix is init versus prefix, affine is the init and final XOR contribution. */
export type EquivalenceId = "refin" | "refout" | "rightShift" | "initPrefix" | "affine";

/** Why a substitution does not apply: notBytes means the input is not whole bytes, notReflected means refin and refout are not both true, evenPoly means the LSB of poly is 0. */
export type NotApplicable = "notBytes" | "notReflected" | "evenPoly";

/** Result of computing one substitution with the current parameters and input; left is the CRC of the original parameters, right is the CRC of the substituted side. */
export type Equivalence =
  | Readonly<{ id: EquivalenceId; applicable: true; left: number; right: number }>
  | Readonly<{ id: EquivalenceId; applicable: false; reason: NotApplicable }>;

/** Shift direction of an implementation: right is right-shift, left is left-shift, mixed needs a separate bit reversal either way. */
export type ShiftDirection = "right" | "left" | "mixed";

/** a XOR b as an unsigned integer (never negative, even for 32-bit values). */
const xor = (a: number, b: number): number => (a ^ b) >>> 0;

/** CRC of input under params. */
export function crcOf(params: CrcParams, input: readonly Bit[]): number {
  const steps = trace(params, input);
  return registerValue(steps[steps.length - 1]!.reg);
}

/** input (length a multiple of 8) with the bit order of each byte reversed. */
export const reverseEachByte = (input: readonly Bit[]): Bit[] => input.map((_, i) => input[i - (i % 8) + 7 - (i % 8)]!);

/**
 * CRC of params with refin and refout true, computed by a right-shifting register without any reflection.
 * poly and init are bit-reversed, each byte enters LSB first, and the LSB selects the feedback.
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

/** State r times the inverse of x, modulo g(x); valid only when the LSB of poly is 1. */
const divideByX = ({ width, poly }: CrcParams, r: number): number =>
  r & 1 ? (((r ^ poly) >>> 1) | (2 ** (width - 1))) >>> 0 : r >>> 1;

/**
 * The width-bit prefix P that, prepended to the input with init = 0, has the same effect as init (P(x)·x^width ≡ init (mod g(x))).
 * undefined when the LSB of poly is 0, since x is then not invertible.
 */
export function initPrefix(params: CrcParams): Bit[] | undefined {
  if ((params.poly & 1) === 0) return undefined;
  let p = params.init;
  for (let i = 0; i < params.width; i++) p = divideByX(params, p);
  return Array.from({ length: params.width }, (_, i): Bit => ((p >>> (params.width - 1 - i)) & 1 ? 1 : 0));
}

/** Computes both sides of the five substitutions for params and input; items that do not apply return the reason. */
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

/** Shift direction of an implementation that computes params without reflection. */
export function shiftDirection({ refin, refout }: CrcParams): ShiftDirection {
  if (refin !== refout) return "mixed";
  return refin ? "right" : "left";
}

/** The poly and init written in the code of an implementation without reflection; bit-reversed for right-shift. */
export function codeConstants(params: CrcParams): Readonly<{ poly: number; init: number }> {
  if (shiftDirection(params) !== "right") return { poly: params.poly, init: params.init };
  return { poly: reflectValue(params.poly, params.width), init: reflectValue(params.init, params.width) };
}
