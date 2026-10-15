import { describe, expect, it } from "vitest";
import { trace, type Step } from "../domain/trace";
import { bits, firstStep, plain3, stepOf } from "../testing/fixtures";
import { heldFeedback, particleWire, particles, upcomingValues, wireLevels } from "./signals";

/** Clock of CRC-3 with init 100 fed a 0: msb 1 ⊕ bit 0 = feedback 1. */
const msbOne = { ...plain3, init: 0b100 };
/** Clock of CRC-3 with init 001 fed a 1: feedback 1, 010 after shift, 001 after xor. */
const lowOne = { ...plain3, init: 0b001 };
/** Values kept for the next step at each step of lowOne. */
const upcomingAfter = (kind: Step["kind"]) => {
  const steps = trace(lowOne, bits("1"));
  return upcomingValues(steps[steps.findIndex((s) => s.kind === kind) + 1]);
};

describe("wireLevels", () => {
  it("Given a clock with msb 1 and input bit 0, When the feedback step, Then 0 flows on the input line, 1 on the MSB line and 1 on the result line, and nothing yet on the feedback line", () => {
    const step = firstStep(msbOne, "0", "feedback");

    expect(wireLevels(plain3, step)).toEqual({ input: 0, msb: 1, result: 1, tapIn: {}, tapOut: {} });
  });

  it("Given a clock with feedback 1 and 010 after shift, When the shift step, Then no wire carries a value (feedback stays in the box and a particle carries it at xor)", () => {
    expect(wireLevels(plain3, firstStep(lowOne, "1", "shift"))).toEqual({ tapIn: {}, tapOut: {} });
  });

  it("Given a clock with feedback 1 and 010 after shift, When the xor step, Then 1 flows on the feedback line, r[i] before the XOR on the tap input lines, and the result on the output lines", () => {
    expect(wireLevels(plain3, firstStep(lowOne, "1", "xor"))).toEqual({
      feedback: 1,
      tapIn: { 0: 0, 1: 1 },
      tapOut: { 0: 1, 1: 0 },
    });
  });

  it.each(["init", "xorOut", "done"] as const)("Given xorout present, When the %s step, Then no wire carries a value", (kind) => {
    const steps = trace({ ...plain3, xorout: 1 }, bits("1"));

    expect(wireLevels(plain3, stepOf(steps, kind))).toEqual({ tapIn: {}, tapOut: {} });
  });
});

describe("particles", () => {
  it("Given a clock with msb 1 and input bit 0, When the feedback step, Then in the first half the input bit and msb particles go to the input gate, and in the second half the result particle goes to the feedback box", () => {
    expect(particles(plain3, firstStep(msbOne, "0", "feedback"))).toEqual([
      { route: "input", value: 0, phase: 0 },
      { route: "msb", value: 1, phase: 0 },
      { route: "result", value: 1, phase: 1 },
    ]);
  });

  it("Given a clock with feedback 1 and 010 after shift, When the xor step, Then in the first half 1 goes to each tap's gate and r[i] to the gate below it, and in the second half the result returns to r[i]", () => {
    expect(particles(plain3, firstStep(lowOne, "1", "xor"))).toEqual([
      { route: "tap-0", value: 1, phase: 0 },
      { route: "tap-1", value: 1, phase: 0 },
      { route: "in-0", value: 0, phase: 0 },
      { route: "in-1", value: 1, phase: 0 },
      { route: "out-0", value: 1, phase: 1 },
      { route: "out-1", value: 0, phase: 1 },
    ]);
  });

  it.each(["init", "shift", "done"] as const)(
    "Given a clock with feedback 1, When the %s step, Then no particles are emitted",
    (kind) => {
      const steps = trace(plain3, bits("1"));

      expect(particles(plain3, stepOf(steps, kind))).toEqual([]);
    },
  );
});

describe("particleWire", () => {
  it.each([
    ["input", "input"],
    ["msb", "msb"],
    ["result", "result"],
    ["in-2", "tap-in-2"],
    ["out-0", "tap-out-0"],
    ["tap-1", "feedback-1"],
  ] as const)("Given particle %s, When finding the wire it travels, Then %s", (route, wire) => {
    expect(particleWire(route)).toBe(wire);
  });
});

describe("heldFeedback", () => {
  it("Given 2 clocks with feedback 1 and 0 and xorOut, When finding the box value at each step, Then feedback is held during a clock and empty otherwise", () => {
    const steps = trace({ ...lowOne, xorout: 1 }, bits("10"));

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

describe("upcomingValues", () => {
  it("Given a clock with feedback 1 and 010 after shift, When next is shift, Then only the value entering r[0] from the right end is kept", () => {
    expect(upcomingAfter("feedback")).toEqual({ 0: 0 });
  });

  it("Given a clock with feedback 1 and 010 after shift, When next is xor, Then nothing is kept because the result particle shows it", () => {
    expect(upcomingAfter("shift")).toEqual({});
  });

  it("Given a clock with feedback 1 and 010 after shift, When next is something else or there is no next, Then nothing is kept", () => {
    expect(upcomingAfter("init")).toEqual({});
    expect(upcomingAfter("xor")).toEqual({});
    expect(upcomingValues(undefined)).toEqual({});
  });
});
