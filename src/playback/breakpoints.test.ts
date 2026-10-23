import { describe, expect, it } from "vitest";
import { trace, type Step } from "../domain/trace";
import { bits, plain3 } from "../testing/fixtures";
import {
  breakIndices,
  breakpointsFromParam,
  breakpointsToParam,
  editBreakpoint,
  hitsUpTo,
  toggleByte,
  toggleLine,
  type Breakpoint,
} from "./breakpoints";
import { updatePlayer } from "./playback";

/** Indices of the steps of kind in steps. */
const indicesOf = (steps: readonly Step[], kind: Step["kind"]) => steps.flatMap((s, i) => (s.kind === kind ? [i] : []));

const xorLine: Breakpoint = { kind: "line", runs: "xor", enabled: true };

describe("breakIndices", () => {
  it("Given a line breakpoint on xor with no hit count, When 10101 is fed, Then it hits at every xor step", () => {
    const steps = trace(plain3, bits("10101"));

    expect([...breakIndices(steps, [xorLine])]).toEqual(indicesOf(steps, "xor"));
  });

  it("Given a line breakpoint on xor with hit count 2, When 10101 is fed, Then it hits only at the 2nd xor step", () => {
    const steps = trace(plain3, bits("10101"));

    expect([...breakIndices(steps, [{ ...xorLine, hit: 2 }])]).toEqual([indicesOf(steps, "xor")[1]]);
  });

  it("Given a disabled line breakpoint, When 10101 is fed, Then it never hits", () => {
    expect(breakIndices(trace(plain3, bits("10101")), [{ ...xorLine, enabled: false }]).size).toBe(0);
  });

  it("Given a byte breakpoint on byte 0, When 2 bytes are fed, Then it hits at the last step before the 1st feedback of byte 1", () => {
    const steps = trace(plain3, bits("1010101111110000"));
    const firstOfByte1 = steps.findIndex((s) => s.kind === "feedback" && s.cursor === 8);

    expect([...breakIndices(steps, [{ kind: "byte", byte: 0, enabled: true }])]).toEqual([firstOfByte1 - 1]);
  });

  it("Given a byte breakpoint on byte 0 with refin, When 2 bytes are fed, Then it hits before byte 1 is reflected", () => {
    const steps = trace({ ...plain3, refin: true }, bits("1010101111110000"));
    const reflectByte1 = steps.findIndex((s) => s.kind === "reflectIn" && s.byteIndex === 1);

    expect([...breakIndices(steps, [{ kind: "byte", byte: 0, enabled: true }])]).toEqual([reflectByte1 - 1]);
  });

  it("Given a byte breakpoint on the last byte, When 1 byte is fed, Then it hits at the end of its last clock, before post-processing", () => {
    const steps = trace({ ...plain3, xorout: 1 }, bits("10101011"));
    const xorOut = indicesOf(steps, "xorOut")[0]!;

    expect([...breakIndices(steps, [{ kind: "byte", byte: 0, enabled: true }])]).toEqual([xorOut - 1]);
  });

  it("Given a byte breakpoint beyond the input, When 1 byte is fed, Then it never hits", () => {
    expect(breakIndices(trace(plain3, bits("10101011")), [{ kind: "byte", byte: 1, enabled: true }]).size).toBe(0);
  });
});

describe("hitsUpTo", () => {
  it("Given 10101, which gives 3 xor steps, When counting xor up to each xor step, Then the counts are 1, 2 and 3", () => {
    const steps = trace(plain3, bits("10101"));

    expect(indicesOf(steps, "xor").map((i) => hitsUpTo(steps, i, "xor"))).toEqual([1, 2, 3]);
  });

  it("Given 10101, When counting xor up to the init step, Then the count is 0", () => {
    expect(hitsUpTo(trace(plain3, bits("10101")), 0, "xor")).toBe(0);
  });
});

describe("toggleLine and toggleByte", () => {
  it("Given no breakpoints, When toggling the xor line twice, Then it is added and then removed", () => {
    const once = toggleLine([], "xor");

    expect(once).toEqual([xorLine]);
    expect(toggleLine(once, "xor")).toEqual([]);
  });

  it("Given a line breakpoint, When toggling byte 3, Then the byte breakpoint is added after it and the line breakpoint is kept", () => {
    expect(toggleByte([xorLine], 3)).toEqual([xorLine, { kind: "byte", byte: 3, enabled: true }]);
  });
});

describe("breakpointsToParam and breakpointsFromParam", () => {
  const list: Breakpoint[] = [
    { kind: "line", runs: "xor", hit: 5, enabled: true },
    { kind: "byte", byte: 3, enabled: true },
    { kind: "line", runs: "feedback", enabled: false },
  ];

  it("Given breakpoints, When written to the bp parameter, Then they read xor@5,byte3,!feedback", () => {
    expect(breakpointsToParam(list)).toBe("xor@5,byte3,!feedback");
  });

  it("Given the parameter xor@5,byte3,!feedback, When read, Then it gives back the same breakpoints", () => {
    expect(breakpointsFromParam("xor@5,byte3,!feedback")).toEqual(list);
  });

  it("Given entries that cannot be read, When read, Then they are dropped and the rest is kept", () => {
    expect(breakpointsFromParam("foo,byte-1,xor@0,xor@x,,shift,shift")).toEqual([{ kind: "line", runs: "shift", enabled: true }]);
  });
});

describe("updatePlayer with breakpoints", () => {
  it("Given playback at step 2, When a tick moves to step 3, which is a break, Then step 3 is shown and playback pauses", () => {
    const p = updatePlayer({ index: 2, playing: true }, { type: "tick", loop: false, breaks: new Set([3]) }, 10);

    expect(p).toEqual({ index: 3, playing: false });
  });

  it("Given playback paused at a break, When play is pressed and a tick follows, Then playback moves on past it", () => {
    const breaks = new Set([3]);
    const playing = updatePlayer({ index: 3, playing: false }, { type: "play" }, 10);

    expect(updatePlayer(playing, { type: "tick", loop: false, breaks }, 10)).toEqual({ index: 4, playing: true });
  });

  it("Given loop playback at the last step, When a tick wraps to step 0, which is a break, Then playback pauses at step 0", () => {
    expect(updatePlayer({ index: 9, playing: true }, { type: "tick", loop: true, breaks: new Set([0]) }, 10)).toEqual({
      index: 0,
      playing: false,
    });
  });
});

describe("editBreakpoint", () => {
  const list: Breakpoint[] = [
    { ...xorLine, hit: 2 },
    { kind: "byte", byte: 0, enabled: true },
  ];

  it("Given 2 breakpoints, When disabling byte0, Then only byte0 is disabled", () => {
    expect(editBreakpoint(list, "byte0", { enabled: false })).toEqual([list[0], { kind: "byte", byte: 0, enabled: false }]);
  });

  it("Given a hit count of 2 on xor, When clearing the hit count, Then xor hits every time", () => {
    expect(editBreakpoint(list, "xor", { hit: undefined })[0]).toEqual(xorLine);
  });

  it("Given 2 breakpoints, When removing xor, Then only byte0 is left", () => {
    expect(editBreakpoint(list, "xor", "remove")).toEqual([list[1]]);
  });
});
