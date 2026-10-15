import { trace, type Bit, type CrcParams, type Step } from "../domain/trace";

/** Turns a 0/1 string such as "10101" into bits; any character other than 1 becomes 0. */
export const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));

/** CRC-3 with no reflection and no final XOR (poly 0x3, init 0); the same parameters as the tutorial preset CRC-3/TUTORIAL. */
export const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };

/** The first step of kind `kind` in steps. */
export const stepOf = (steps: readonly Step[], kind: Step["kind"]): Step => steps.find((s) => s.kind === kind)!;

/** The first step of kind `kind` when input is fed through params. */
export const firstStep = (params: CrcParams, input: string, kind: Step["kind"]): Step => stepOf(trace(params, bits(input)), kind);
