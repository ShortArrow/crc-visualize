import { toRegister, type Bit, type CrcParams, type Step } from "../domain/trace";

/** LFSR 図の配線に流れている値。キーの無い配線には何も流れていない。 */
export type WireLevels = Readonly<{ input?: Bit; msb?: Bit; feedback?: Bit }>;

/**
 * 配線に沿って動く粒。route は "input"（入力ストリーム → 入力ゲート）、"msb"（r[width-1] → 入力ゲート）、
 * または数値 i（入力ゲート → フィードバック線 → r[i] の入口のタップ）。
 */
export type Particle = Readonly<{ route: "input" | "msb" | number; value: Bit }>;

/** step で各配線に流れている値。 */
export function wireLevels(step: Step): WireLevels {
  switch (step.kind) {
    case "feedback":
      return { input: step.inBit, msb: step.msb, feedback: step.fb };
    case "shift":
      return { feedback: step.fb };
    case "xor":
      return { feedback: 1 };
    default:
      return {};
  }
}

/** step で配線に沿って動く粒。 */
export function particles(params: CrcParams, step: Step): Particle[] {
  switch (step.kind) {
    case "feedback":
      return [
        { route: "input", value: step.inBit },
        { route: "msb", value: step.msb },
      ];
    case "xor":
      return toRegister(params.poly, params.width).flatMap((tap, i) => (tap === 1 ? [{ route: i, value: 1 as Bit }] : []));
    default:
      return [];
  }
}
