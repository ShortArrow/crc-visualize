import { describe, expect, it } from "vitest";
import { trace, type Step } from "../domain/trace";
import { bits, firstStep, plain3, stepOf } from "../testing/fixtures";
import { heldFeedback, particleWire, particles, upcomingValues, wireLevels } from "./signals";

/** init 100 の CRC-3 に 0 を流したクロック: msb 1 ⊕ bit 0 = feedback 1。 */
const msbOne = { ...plain3, init: 0b100 };
/** init 001 の CRC-3 に 1 を流したクロック: feedback 1、shift 後 010、xor 後 001。 */
const lowOne = { ...plain3, init: 0b001 };

describe("wireLevels", () => {
  describe("Given msb 1・入力ビット 0 のクロック", () => {
    it("When feedback ステップ, Then 入力線に 0、最上位ビット線に 1、結果線に 1 が流れ、フィードバック線にはまだ流れない", () => {
      const step = firstStep(msbOne, "0", "feedback");

      expect(wireLevels(plain3, step)).toEqual({ input: 0, msb: 1, result: 1, tapIn: {}, tapOut: {} });
    });
  });

  describe("Given feedback 1、shift 後 010 のクロック", () => {
    it("When shift ステップ, Then どの配線にも値が流れない（feedback は箱に留まり、xor で粒が運ぶ）", () => {
      expect(wireLevels(plain3, firstStep(lowOne, "1", "shift"))).toEqual({ tapIn: {}, tapOut: {} });
    });

    it("When xor ステップ, Then フィードバック線に 1、タップの入力線に XOR 前の r[i]、出力線に結果が流れる", () => {
      expect(wireLevels(plain3, firstStep(lowOne, "1", "xor"))).toEqual({
        feedback: 1,
        tapIn: { 0: 0, 1: 1 },
        tapOut: { 0: 1, 1: 0 },
      });
    });
  });

  describe("Given xorout あり", () => {
    const steps = trace({ ...plain3, xorout: 1 }, bits("1"));

    it.each(["init", "xorOut", "done"] as const)("When %s ステップ, Then どの配線にも値が流れない", (kind) => {
      expect(wireLevels(plain3, stepOf(steps, kind))).toEqual({ tapIn: {}, tapOut: {} });
    });
  });
});

describe("particles", () => {
  describe("Given msb 1・入力ビット 0 のクロック", () => {
    it("When feedback ステップ, Then 前半に入力ビットと msb の粒が入力ゲートへ、後半に結果の粒が feedback の箱へ向かう", () => {
      expect(particles(plain3, firstStep(msbOne, "0", "feedback"))).toEqual([
        { route: "input", value: 0, phase: 0 },
        { route: "msb", value: 1, phase: 0 },
        { route: "result", value: 1, phase: 1 },
      ]);
    });
  });

  describe("Given feedback 1、shift 後 010 のクロック", () => {
    it("When xor ステップ, Then 前半に 1 が各タップのゲートへ、r[i] が真下のゲートへ向かい、後半に結果が r[i] へ戻る", () => {
      expect(particles(plain3, firstStep(lowOne, "1", "xor"))).toEqual([
        { route: "tap-0", value: 1, phase: 0 },
        { route: "tap-1", value: 1, phase: 0 },
        { route: "in-0", value: 0, phase: 0 },
        { route: "in-1", value: 1, phase: 0 },
        { route: "out-0", value: 1, phase: 1 },
        { route: "out-1", value: 0, phase: 1 },
      ]);
    });
  });

  describe("Given feedback 1 のクロック", () => {
    const steps = trace(plain3, bits("1"));

    it.each(["init", "shift", "done"] as const)("When %s ステップ, Then 粒を出さない", (kind) => {
      expect(particles(plain3, stepOf(steps, kind))).toEqual([]);
    });
  });
});

describe("particleWire", () => {
  describe("Given 各経路の粒", () => {
    it.each([
      ["input", "input"],
      ["msb", "msb"],
      ["result", "result"],
      ["in-2", "tap-in-2"],
      ["out-0", "tap-out-0"],
      ["tap-1", "feedback-1"],
    ] as const)("When %s の粒が通る配線を求める, Then %s", (route, wire) => {
      expect(particleWire(route)).toBe(wire);
    });
  });
});

describe("heldFeedback", () => {
  describe("Given feedback 1 と 0 の 2 クロックと xorOut", () => {
    const steps = trace({ ...lowOne, xorout: 1 }, bits("10"));

    it("When 各ステップの箱の値を求める, Then クロックの間は feedback を保ち、それ以外では空", () => {
      expect(steps.map((s) => [s.kind, heldFeedback(s)])).toEqual([
        ["init", undefined],
        ["feedback", 1],
        ["shift", 1],
        ["xor", 1],
        ["feedback", 0],
        ["shift", 0],
        ["xorOut", undefined],
        ["done", undefined],
      ]);
    });
  });
});

describe("upcomingValues", () => {
  describe("Given feedback 1、shift 後 010 のクロック", () => {
    const steps = trace(lowOne, bits("1"));
    const after = (kind: Step["kind"]) => upcomingValues(steps[steps.findIndex((s) => s.kind === kind) + 1]);

    it("When 次が shift, Then 右端から r[0] に入る値だけを控える", () => {
      expect(after("feedback")).toEqual({ 0: 0 });
    });

    it("When 次が xor, Then 結果の粒が見せるので控えない", () => {
      expect(after("shift")).toEqual({});
    });

    it("When 次がそれ以外か、次が無い, Then 控えない", () => {
      expect(after("init")).toEqual({});
      expect(after("xor")).toEqual({});
      expect(upcomingValues(undefined)).toEqual({});
    });
  });
});
