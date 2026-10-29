import { describe, expect, it } from "vitest";
import { CATALOGUE } from "../domain/presets";
import { tablePlay } from "../domain/table";
import { bitsFromBytes } from "../domain/trace";
import { FAST_MS, SLOW_MS, STEADY_MS } from "./playback";
import { tableStepDurations } from "./tablePlayback";

const xmodem = CATALOGUE.find((p) => p.name === "CRC-16/XMODEM")!.params;

describe("tableStepDurations", () => {
  const steps = tablePlay(xmodem, bitsFromBytes([0x31, 0x32, 0x33]));

  it("Given auto, When timing the steps, Then the clocks, the first two bytes and the last step are slow, and the rest fast", () => {
    const durations = tableStepDurations(steps, "auto");
    const slow = steps.flatMap((s, i) => (durations[i] === SLOW_MS ? [s] : []));
    expect(slow).toEqual([
      ...steps.filter((s) => s.kind === "clock"),
      ...steps.filter((s) => "byte" in s && s.byte < 2),
      { kind: "done" },
    ]);
    expect(durations.filter((d) => d !== SLOW_MS).every((d) => d === FAST_MS)).toBe(true);
  });

  it("Given an input that is not whole bytes, When timing the steps in auto, Then filling T[255], the last step, is slow", () => {
    expect(tableStepDurations(tablePlay(xmodem, [1, 0]), "auto").at(-1)).toBe(SLOW_MS);
  });

  it("Given steady, When timing the steps, Then every step takes the steady time", () => {
    expect(new Set(tableStepDurations(steps, "steady"))).toEqual(new Set([STEADY_MS]));
  });
});
