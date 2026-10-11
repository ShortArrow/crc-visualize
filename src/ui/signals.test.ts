import { describe, expect, it } from "vitest";
import { trace, type Bit, type CrcParams, type Step } from "../domain/trace";
import { particles, wireLevels } from "./signals";

const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };
const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const stepOf = (steps: Step[], kind: Step["kind"]) => steps.find((s) => s.kind === kind)!;

describe("wireLevels", () => {
  it("feedback では入力線に bit、最上位ビット線に msb、フィードバック線に feedback が流れる", () => {
    const step = stepOf(trace({ ...plain3, init: 0b100 }, bits("0")), "feedback");
    expect(wireLevels(step)).toEqual({ input: 0, msb: 1, feedback: 1 });
  });

  it("shift ではフィードバック線にだけ feedback が流れる", () => {
    const step = stepOf(trace(plain3, bits("0")), "shift");
    expect(wireLevels(step)).toEqual({ feedback: 0 });
  });

  it("xor ではフィードバック線に 1 が流れる", () => {
    expect(wireLevels(stepOf(trace(plain3, bits("1")), "xor"))).toEqual({ feedback: 1 });
  });

  it("クロック以外のステップではどの配線にも値が流れない", () => {
    const steps = trace({ ...plain3, xorout: 1 }, bits("1"));
    for (const kind of ["init", "xorOut", "done"] as const) expect(wireLevels(stepOf(steps, kind))).toEqual({});
  });
});

describe("particles", () => {
  it("feedback では bit と msb の粒がそれぞれ入力ゲートへ向かう", () => {
    const step = stepOf(trace({ ...plain3, init: 0b100 }, bits("0")), "feedback");
    expect(particles(plain3, step)).toEqual([
      { route: "input", value: 0 },
      { route: "msb", value: 1 },
    ]);
  });

  it("xor では 1 の粒が poly の各タップへ向かう", () => {
    const step = stepOf(trace(plain3, bits("1")), "xor");
    expect(particles(plain3, step)).toEqual([
      { route: 0, value: 1 },
      { route: 1, value: 1 },
    ]);
  });

  it("shift やクロック以外のステップでは粒を出さない", () => {
    const steps = trace(plain3, bits("1"));
    for (const kind of ["init", "shift", "done"] as const) expect(particles(plain3, stepOf(steps, kind))).toEqual([]);
  });
});
