import { toRegister, type CrcParams, type Step } from "../domain/trace";

/** XOR ゲートに添える式。gate は "input"（msb と入力ビットの XOR）か、入口にゲートがある r[i] の i。 */
export type GateEquation = Readonly<{ gate: "input" | number; text: string }>;

/** step で働いている XOR ゲートと、その計算式（例: "0⊕1=1"）。 */
export function gateEquations(params: CrcParams, step: Step): GateEquation[] {
  if (step.kind === "feedback") {
    return [{ gate: "input", text: `${step.msb}⊕${step.inBit}=${step.fb}` }];
  }
  if (step.kind === "xor") {
    return toRegister(params.poly, params.width).flatMap((tap, i) =>
      tap === 1 && i >= 1 ? [{ gate: i, text: `${step.reg[i]! ^ 1}⊕1=${step.reg[i]}` }] : [],
    );
  }
  return [];
}
