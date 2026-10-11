import { describe, expect, it } from "vitest";
import { trace, type Bit, type CrcParams, type Step } from "../domain/trace";
import { particles, upcomingValues, wireLevels } from "./signals";

const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };
const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const stepOf = (steps: Step[], kind: Step["kind"]) => steps.find((s) => s.kind === kind)!;

describe("wireLevels", () => {
  it("feedback では入力線に bit、最上位ビット線に msb、フィードバック線に feedback が流れる", () => {
    const step = stepOf(trace({ ...plain3, init: 0b100 }, bits("0")), "feedback");
    expect(wireLevels(plain3, step)).toEqual({ input: 0, msb: 1, feedback: 1, tapIn: {}, tapOut: {} });
  });

  it("shift ではフィードバック線にだけ feedback が流れる", () => {
    const step = stepOf(trace(plain3, bits("0")), "shift");
    expect(wireLevels(plain3, step)).toEqual({ feedback: 0, tapIn: {}, tapOut: {} });
  });

  it("xor ではフィードバック線に 1、タップの入力線にシフトで入った値、出力線に XOR の結果が流れる", () => {
    // init 001 に 1 を投入: feedback 1、shift 後 010、xor 後 001。
    const step = stepOf(trace({ ...plain3, init: 0b001 }, bits("1")), "xor");
    expect(wireLevels(plain3, step)).toEqual({ feedback: 1, tapIn: { 1: 1 }, tapOut: { 0: 1, 1: 0 } });
  });

  it("クロック以外のステップではどの配線にも値が流れない", () => {
    const steps = trace({ ...plain3, xorout: 1 }, bits("1"));
    for (const kind of ["init", "xorOut", "done"] as const) {
      expect(wireLevels(plain3, stepOf(steps, kind))).toEqual({ tapIn: {}, tapOut: {} });
    }
  });
});

describe("particles", () => {
  it("feedback では前半に bit と msb の粒がそれぞれ入力ゲートへ向かう", () => {
    const step = stepOf(trace({ ...plain3, init: 0b100 }, bits("0")), "feedback");
    expect(particles(plain3, step)).toEqual([
      { route: "input", value: 0, phase: 0 },
      { route: "msb", value: 1, phase: 0 },
    ]);
  });

  it("xor では前半に 1 の粒が各タップへ向かい、後半に XOR の結果の粒がゲートから r[i] へ入る", () => {
    const step = stepOf(trace({ ...plain3, init: 0b001 }, bits("1")), "xor");
    expect(particles(plain3, step)).toEqual([
      { route: "tap-0", value: 1, phase: 0 },
      { route: "tap-1", value: 1, phase: 0 },
      { route: "out-0", value: 1, phase: 1 },
      { route: "out-1", value: 0, phase: 1 },
    ]);
  });

  it("shift やクロック以外のステップでは粒を出さない", () => {
    const steps = trace(plain3, bits("1"));
    for (const kind of ["init", "shift", "done"] as const) expect(particles(plain3, stepOf(steps, kind))).toEqual([]);
  });
});

describe("upcomingValues", () => {
  // init 001 に 1 を投入: feedback 1、shift 後 010、xor 後 001。
  const steps = trace({ ...plain3, init: 0b001 }, bits("1"));
  const at = (kind: Step["kind"]) => steps.findIndex((s) => s.kind === kind);
  const upcoming = (i: number) => upcomingValues(plain3, steps[i + 1]);

  it("次が shift なら、全ての箱にシフト後の値を控える", () => {
    expect(upcoming(at("feedback"))).toEqual({ 0: 0, 1: 1, 2: 0 });
  });

  it("次が xor なら、タップの箱にだけ XOR 後の値を控える", () => {
    expect(upcoming(at("shift"))).toEqual({ 0: 1, 1: 0 });
  });

  it("次がそれ以外か、次が無ければ控えない", () => {
    expect(upcoming(at("init"))).toEqual({});
    expect(upcoming(at("xor"))).toEqual({});
    expect(upcoming(steps.length - 1)).toEqual({});
  });
});
