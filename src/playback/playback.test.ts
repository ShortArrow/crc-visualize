import { describe, expect, it } from "vitest";
import { trace, type CrcParams } from "../domain/trace";
import { bits, plain3 } from "../testing/fixtures";
import { FAST_MS, SLOW_MS, STEADY_MS, animationMs, initialPlayer, stepDurations, updatePlayer, type Player } from "./playback";

/** Duration of each clock (from one feedback up to just before the next). */
const clockDurations = (params: CrcParams, input: string) => {
  const steps = trace(params, bits(input));
  const durations = stepDurations(steps, "auto");
  return steps.flatMap((s, i) => (s.kind === "feedback" ? [durations[i]] : []));
};

describe("stepDurations", () => {
  it("Given auto mode, When 10101 is fed, giving feedback 1,0,0,1,1, Then clocks are slow through the 2nd, which has shown both 0 and 1, and fast after", () => {
    expect(clockDurations(plain3, "10101")).toEqual([SLOW_MS, SLOW_MS, FAST_MS, FAST_MS, FAST_MS]);
  });

  it("Given auto mode, When 00000000 is fed, giving only feedback 0, Then clocks are fast from the 7th", () => {
    expect(clockDurations(plain3, "00000000")).toEqual([...Array(6).fill(SLOW_MS), FAST_MS, FAST_MS]);
  });

  it("Given auto mode, When only 1 clock is fed, Then that clock's shift and xor run at the same speed", () => {
    const steps = trace(plain3, bits("1"));

    expect(stepDurations(steps, "auto")).toEqual(steps.map(() => SLOW_MS));
  });

  it("Given auto mode, When fed long enough to speed up, Then init and post-processing are always slow", () => {
    const steps = trace({ ...plain3, refout: true, xorout: 1 }, bits("10101010"));

    const durations = stepDurations(steps, "auto");

    const slowKinds = steps.filter((_, i) => durations[i] === SLOW_MS).map((s) => s.kind);
    expect(slowKinds).toEqual(expect.arrayContaining(["init", "reflectOut", "xorOut", "done"]));
    expect(durations.at(-2)).toBe(SLOW_MS);
  });

  it("Given steady mode, When 101 is fed, Then every step takes the same time", () => {
    const steps = trace(plain3, bits("101"));

    expect(new Set(stepDurations(steps, "steady"))).toEqual(new Set([STEADY_MS]));
  });
});

describe("updatePlayer", () => {
  const len = 5;
  const at = (index: number, playing = false): Player => ({ index, playing });
  const tickOnce = { type: "tick", loop: false } as const;
  const tickLoop = { type: "tick", loop: true } as const;

  it("Given just opened, When nothing is done, Then it is stopped at the first step", () => {
    expect(initialPlayer).toEqual(at(0));
  });

  it("Given loop off, When ticked while playing, Then it advances one step and stops at the last", () => {
    expect(updatePlayer(at(1, true), tickOnce, len)).toEqual(at(2, true));
    expect(updatePlayer(at(3, true), tickOnce, len)).toEqual(at(4, false));
  });

  it("Given loop off, When ticked while stopped, Then it does not advance", () => {
    expect(updatePlayer(at(1), tickOnce, len)).toEqual(at(1));
  });

  it("Given loop on, When ticked to the last step while playing, Then it keeps playing with the last step shown and returns to the first on the next tick", () => {
    expect(updatePlayer(at(3, true), tickLoop, len)).toEqual(at(4, true));
    expect(updatePlayer(at(4, true), tickLoop, len)).toEqual(at(0, true));
  });

  it("Given loop on, When ticked while stopped, Then it does not advance", () => {
    expect(updatePlayer(at(4), tickLoop, len)).toEqual(at(4));
  });

  it("Given stopped, When play is pressed at the last step, Then it plays from the first", () => {
    expect(updatePlayer(at(4), { type: "play" }, len)).toEqual(at(0, true));
  });

  it("Given stopped, When play is pressed midway, Then it plays from that position", () => {
    expect(updatePlayer(at(2), { type: "play" }, len)).toEqual(at(2, true));
  });

  it("Given stopped, When toggled at the last step, Then it plays from the first", () => {
    expect(updatePlayer(at(4), { type: "toggle" }, len)).toEqual(at(0, true));
  });

  it("Given playing, When toggled, Then it stops", () => {
    expect(updatePlayer(at(2, true), { type: "toggle" }, len)).toEqual(at(2, false));
  });

  it("Given playing, When reset, Then it stops at the first step", () => {
    expect(updatePlayer(at(3, true), { type: "reset" }, len)).toEqual(at(0));
  });

  it("Given any position, When moved manually, Then it stops and is clamped to the range", () => {
    expect(updatePlayer(at(2, true), { type: "next" }, len)).toEqual(at(3));
    expect(updatePlayer(at(4), { type: "next" }, len)).toEqual(at(4));
    expect(updatePlayer(at(0), { type: "prev" }, len)).toEqual(at(0));
    expect(updatePlayer(at(2, true), { type: "first" }, len)).toEqual(at(0));
    expect(updatePlayer(at(2), { type: "last" }, len)).toEqual(at(4));
    expect(updatePlayer(at(2, true), { type: "seek", index: 99 }, len)).toEqual(at(4));
    expect(updatePlayer(at(2), { type: "seek", index: -1 }, len)).toEqual(at(0));
  });
});

describe("animationMs", () => {
  it("Given a step display time, When the animation length is computed, Then it is 80% of the display time and grows without bound as the speed multiplier falls", () => {
    expect(animationMs(FAST_MS)).toBe(FAST_MS * 0.8);
    expect(animationMs(SLOW_MS / 0.25)).toBe((SLOW_MS / 0.25) * 0.8);
  });
});
