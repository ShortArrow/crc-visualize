import type { PlayStep } from "../domain/table";
import { FAST_MS, SLOW_MS, STEADY_MS, type SpeedMode } from "./playback";

/** Number of input bytes whose steps are slow in auto mode. */
const SLOW_BYTES = 2;

/** Number of cells of table T, counting T[0], up to which filling is slow in auto mode: T[1] and T[2] are filled slowly. */
const SLOW_FILLS = 3;

const isSlowPlay = (step: PlayStep, last: boolean): boolean =>
  last ||
  step.kind === "clocks" ||
  (step.kind === "filled" && step.count > 1 && step.count <= SLOW_FILLS) ||
  ("byte" in step && step.byte < SLOW_BYTES);

/**
 * Display time of each step of a Table page playback (ms, before the speed multiplier). In auto, the clocks of a value, filling
 * T[1] and T[2], the steps of the first SLOW_BYTES bytes and the last step are slow, and the others fast.
 */
export function playDurations(steps: readonly PlayStep[], mode: SpeedMode): number[] {
  if (mode === "steady") return steps.map(() => STEADY_MS);
  return steps.map((step, i) => (isSlowPlay(step, i === steps.length - 1) ? SLOW_MS : FAST_MS));
}
