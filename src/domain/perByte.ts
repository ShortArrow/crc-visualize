import { bitEndStep, reflectValue, registerValue, type Bit, type CrcParams, type Step } from "./trace";

/** One input byte: its number, its value, the register at the end of it, and the step that ends it. */
export type ByteRow = Readonly<{ index: number; byte: number; register: bigint; right?: bigint; step: number }>;

/**
 * The rows of Progress per byte (spec chapter 16, "The answer without playback"): the register after each input byte, also as a
 * right shift holds it when refin = refout = true. undefined when the input is not whole bytes.
 */
export function perByte(params: CrcParams, steps: readonly Step[], input: readonly Bit[]): ByteRow[] | undefined {
  if (input.length % 8 !== 0) return undefined;
  return Array.from({ length: input.length / 8 }, (_, index) => {
    const step = bitEndStep(steps, 8 * index + 7);
    const register = registerValue(steps[step]!.reg);
    const byte = input.slice(8 * index, 8 * index + 8).reduce<number>((acc, b) => (acc << 1) | b, 0);
    const right = params.refin && params.refout ? { right: reflectValue(register, params.width) } : {};
    return { index, byte, register, step, ...right };
  });
}
