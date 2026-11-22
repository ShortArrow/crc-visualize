import { useEffect, useState } from "react";
import { keyAction, leftToBrowser, leftToTarget } from "./keys";
import { updatePlayer, type Player, type PlayerMsg } from "./playback";

type Options = Readonly<{
  /** Identity of the step sequence; when it changes, playback goes back to the starting step and stops. */
  run: string;
  /** Display time of each step (ms, before the speed multiplier). */
  durations: readonly number[];
  rate: number;
  loop: boolean;
  onLoop: (loop: boolean) => void;
  /** Indices at which playback pauses. */
  breaks?: ReadonlySet<number>;
  /** The step shown first, and again when run changes; the first step when omitted. */
  start?: number;
}>;

/**
 * Playback of a step sequence of durations.length steps: advances on a timer while playing, and answers the playback keys
 * (Space, the left and right arrows, Home, End, and L for looping) pressed on their own outside text fields. stepMs is the time
 * of the step shown, after the speed multiplier.
 */
export function usePlayer({ run, durations, rate, loop, onLoop, breaks, start = 0 }: Options): Readonly<{
  player: Player;
  send: (msg: PlayerMsg) => void;
  stepMs: number;
}> {
  const initial: Player = { index: start, playing: false };
  const [playerState, setPlayer] = useState(initial);
  const [playerRun, setPlayerRun] = useState(run);
  if (playerRun !== run) {
    setPlayerRun(run);
    setPlayer(initial);
  }
  const player = playerRun === run ? playerState : initial;
  const send = (msg: PlayerMsg) => setPlayer((p) => updatePlayer(p, msg, durations.length));
  const stepMs = durations[player.index]! / rate;

  useEffect(() => {
    if (!player.playing) return;
    const timer = setTimeout(() => send({ type: "tick", loop, ...(breaks ? { breaks } : {}) }), stepMs);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (leftToBrowser(e)) return;
      if (e.target instanceof HTMLElement && leftToTarget(e.target.tagName, e.key)) return;
      const action = keyAction(e.key);
      if (action === undefined) return;
      if (action === "loop") onLoop(!loop);
      else send(action);
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return { player, send, stepMs };
}
