import type { TablePlayStep } from "../domain/table";
import { FAST_MS, SLOW_MS, STEADY_MS, type SpeedMode } from "./playback";

/** Number of input bytes whose steps are slow in auto mode. */
const SLOW_BYTES = 2;

const isSlow = (step: TablePlayStep, last: boolean): boolean =>
  last || step.kind === "clock" || ("byte" in step && step.byte < SLOW_BYTES);

/**
 * Display time of each step of playing the Table page (ms, before the speed multiplier). In auto, the clocks, the steps of the
 * first SLOW_BYTES bytes and the last step are slow, and the others fast.
 */
export function tableStepDurations(steps: readonly TablePlayStep[], mode: SpeedMode): number[] {
  if (mode === "steady") return steps.map(() => STEADY_MS);
  return steps.map((step, i) => (isSlow(step, i === steps.length - 1) ? SLOW_MS : FAST_MS));
}
