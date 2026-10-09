import { describe, expect, it } from "vitest";
import { trace, type Bit, type CrcParams, type Step } from "../domain/trace";
import { gateEquations } from "./gates";

const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };
const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const stepOf = (steps: Step[], kind: Step["kind"]) => steps.find((s) => s.kind === kind)!;

describe("gateEquations", () => {
  it("feedback では入力 XOR に msb ⊕ b = fb を出す", () => {
    const step = stepOf(trace({ ...plain3, init: 0b100 }, bits("0")), "feedback");
    expect(gateEquations(plain3, step)).toEqual([{ gate: "input", text: "1⊕0=1" }]);
  });

  it("xor では i ≥ 1 のタップのゲートに シフト後の値 ⊕ 1 = 結果 を出す", () => {
    // init 001 に 1 を投入: fb=1、shift 後 010、xor 後 001。r1 のゲートは 1⊕1=0。
    const step = stepOf(trace({ ...plain3, init: 0b001 }, bits("1")), "xor");
    expect(gateEquations(plain3, step)).toEqual([{ gate: 1, text: "1⊕1=0" }]);
  });

  it("それ以外のステップでは何も出さない", () => {
    const steps = trace(plain3, bits("1"));
    for (const kind of ["init", "shift", "done"] as const) {
      expect(gateEquations(plain3, stepOf(steps, kind))).toEqual([]);
    }
  });
});
