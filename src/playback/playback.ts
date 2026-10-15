import type { Step } from "../domain/trace";

export const SLOW_MS = 900;
export const FAST_MS = 120;
export const STEADY_MS = 600;
/** Maximum number of clocks kept slow in auto mode. */
export const MAX_SLOW_CLOCKS = 6;

/** auto: slow at the start and during post-processing, fast otherwise. steady: constant speed. */
export type SpeedMode = "auto" | "steady";

const ALWAYS_SLOW: ReadonlySet<Step["kind"]> = new Set(["init", "reflectOut", "xorOut", "done"]);

/**
 * Display time of each step (ms, before the speed multiplier); element i of the result corresponds to steps[i].
 * In auto, clocks are slow until both fb=0 and fb=1 have appeared, but for at most MAX_SLOW_CLOCKS clocks.
 */
export function stepDurations(steps: readonly Step[], mode: SpeedMode): number[] {
  if (mode === "steady") return steps.map(() => STEADY_MS);
  const seen = new Set<number>();
  let clocks = 0;
  let slow = true;
  return steps.map((step) => {
    if (step.kind === "feedback") {
      slow = seen.size < 2 && clocks < MAX_SLOW_CLOCKS;
      seen.add(step.fb);
      clocks++;
    }
    return ALWAYS_SLOW.has(step.kind) || slow ? SLOW_MS : FAST_MS;
  });
}

/** Animation length of one step (ms); 80% of the step time stepMs (after dividing by the speed multiplier), so drawing finishes before the next step. */
export function animationMs(stepMs: number): number {
  return stepMs * 0.8;
}

/** Playback state; index is the step being shown. */
export type Player = Readonly<{ index: number; playing: boolean }>;

export type PlayerMsg =
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "tick"; loop: boolean }
  | { type: "next" }
  | { type: "prev" }
  | { type: "first" }
  | { type: "last" }
  | { type: "seek"; index: number }
  | { type: "reset" };

export const initialPlayer: Player = { index: 0, playing: false };

/** Playback state transitions; length is the number of steps (at least 1). When loop on tick is true, the step after the last wraps to the first. */
export function updatePlayer(player: Player, msg: PlayerMsg, length: number): Player {
  const last = length - 1;
  const stopAt = (index: number): Player => ({ index: Math.min(Math.max(index, 0), last), playing: false });
  switch (msg.type) {
    case "play":
      return { index: player.index >= last ? 0 : player.index, playing: true };
    case "pause":
      return { ...player, playing: false };
    case "toggle":
      return updatePlayer(player, { type: player.playing ? "pause" : "play" }, length);
    case "tick":
      if (!player.playing) return player;
      if (msg.loop) return { index: player.index >= last ? 0 : player.index + 1, playing: true };
      return { index: Math.min(player.index + 1, last), playing: player.index + 1 < last };
    case "next":
      return stopAt(player.index + 1);
    case "prev":
      return stopAt(player.index - 1);
    case "first":
      return stopAt(0);
    case "last":
      return stopAt(last);
    case "seek":
      return stopAt(msg.index);
    case "reset":
      return initialPlayer;
  }
}
