import { describe, expect, it } from "vitest";
import { CATALOGUE } from "../domain/presets";
import { fillSteps, useSteps, valueSteps } from "../domain/table";
import { bitsFromBytes } from "../domain/trace";
import { FAST_MS, SLOW_MS, STEADY_MS } from "./playback";
import { playDurations } from "./tablePlayback";

const xmodem = CATALOGUE.find((p) => p.name === "CRC-16/XMODEM")!.params;

describe("playDurations", () => {
  it("Given making a value in auto, When timing the steps, Then every step is slow", () => {
    expect(new Set(playDurations(valueSteps(), "auto"))).toEqual(new Set([SLOW_MS]));
  });

  it("Given making the table in auto, When timing the steps, Then filling T[1] and T[2] and the last step are slow, and the rest fast", () => {
    const durations = playDurations(fillSteps(), "auto");
    expect(durations.flatMap((d, i) => (d === SLOW_MS ? [i] : []))).toEqual([1, 2, 255]);
    expect(durations.filter((d) => d !== SLOW_MS).every((d) => d === FAST_MS)).toBe(true);
  });

  it("Given using the table in auto, When timing the steps, Then the first two bytes and the last step are slow, and the rest fast", () => {
    const steps = useSteps(xmodem, bitsFromBytes([0x31, 0x32, 0x33]))!;
    const durations = playDurations(steps, "auto");
    expect(steps.filter((_, i) => durations[i] === SLOW_MS)).toEqual([
      ...steps.filter((s) => "byte" in s && s.byte < 2),
      { kind: "done" },
    ]);
    expect(durations.filter((d) => d !== SLOW_MS).every((d) => d === FAST_MS)).toBe(true);
  });

  it("Given steady, When timing the steps, Then every step takes the steady time", () => {
    expect(new Set(playDurations(fillSteps(), "steady"))).toEqual(new Set([STEADY_MS]));
  });
});
