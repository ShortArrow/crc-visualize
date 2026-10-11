import { trace, type Bit, type CrcParams, type Step } from "../domain/trace";

/** "10101" のような 0/1 の文字列をビット列にする。0/1 以外の文字は 0。 */
export const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));

/** 反転も最終 XOR も無い CRC-3（poly 0x3、init 0）。教材設定 CRC-3/TUTORIAL と同じパラメータ。 */
export const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };

/** steps のうち種類 kind の最初のステップ。 */
export const stepOf = (steps: readonly Step[], kind: Step["kind"]): Step => steps.find((s) => s.kind === kind)!;

/** params で input を流したときの、種類 kind の最初のステップ。 */
export const firstStep = (params: CrcParams, input: string, kind: Step["kind"]): Step =>
  stepOf(trace(params, bits(input)), kind);
