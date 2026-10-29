import { Pause, Play, Repeat, SkipBack, SkipForward, StepBack, StepForward } from "lucide-react";
import { useMessages } from "../i18n/I18n";
import type { Player, PlayerMsg, SpeedMode } from "../playback/playback";

export const RATES = [0.25, 0.5, 1, 2, 4, 8] as const;

const ICON_SIZE = 18;

type Props = Readonly<{
  player: Player;
  length: number;
  speedMode: SpeedMode;
  rate: number;
  loop: boolean;
  send: (msg: PlayerMsg) => void;
  onSpeedMode: (mode: SpeedMode) => void;
  onRate: (rate: number) => void;
  onLoop: (loop: boolean) => void;
  /** Which controls to show: all of them, only the step buttons (step back, play or pause, step forward), or all but those. */
  parts?: "all" | "steps" | "rest";
}>;

/** Playback controls, or the part of them that parts names. */
export function Controls(props: Props) {
  const { parts = "all", send } = props;
  const m = useMessages();
  return (
    <div className="controls">
      {parts === "steps" ? null : (
        <button type="button" title={m.controls.first} onClick={() => send({ type: "first" })}>
          <SkipBack size={ICON_SIZE} />
        </button>
      )}
      {parts === "rest" ? null : <StepButtons {...props} />}
      {parts === "steps" ? null : <OtherControls {...props} />}
    </div>
  );
}

/** Step back, play or pause, and step forward. */
function StepButtons({ player, send }: Props) {
  const m = useMessages();
  return (
    <>
      <button type="button" title={m.controls.prev} onClick={() => send({ type: "prev" })}>
        <StepBack size={ICON_SIZE} />
      </button>
      <button
        type="button"
        className="primary"
        title={m.controls.playPause}
        aria-label={player.playing ? m.controls.pause : m.controls.play}
        onClick={() => send({ type: "toggle" })}
      >
        {player.playing ? <Pause size={ICON_SIZE} /> : <Play size={ICON_SIZE} />}
      </button>
      <button type="button" title={m.controls.next} onClick={() => send({ type: "next" })}>
        <StepForward size={ICON_SIZE} />
      </button>
    </>
  );
}

/** Going to the last step, looping, the seek bar, the counter, and the speed. */
function OtherControls({ player, length, speedMode, rate, loop, send, onSpeedMode, onRate, onLoop }: Props) {
  const m = useMessages();
  return (
    <>
      <button type="button" title={m.controls.last} onClick={() => send({ type: "last" })}>
        <SkipForward size={ICON_SIZE} />
      </button>
      <button
        type="button"
        className={loop ? "toggle on" : "toggle"}
        title={m.controls.loop}
        aria-pressed={loop}
        onClick={() => onLoop(!loop)}
      >
        <Repeat size={ICON_SIZE} />
      </button>
      <input
        className="seek"
        type="range"
        min={0}
        max={length - 1}
        value={player.index}
        onChange={(e) => send({ type: "seek", index: Number(e.target.value) })}
      />
      <span className="counter">
        {player.index + 1} / {length}
      </span>
      <select value={speedMode} onChange={(e) => onSpeedMode(e.target.value as SpeedMode)} title={m.controls.speedMode}>
        <option value="auto">{m.controls.auto}</option>
        <option value="steady">{m.controls.steady}</option>
      </select>
      <select value={rate} onChange={(e) => onRate(Number(e.target.value))} title={m.controls.rate}>
        {RATES.map((r) => (
          <option key={r} value={r}>
            ×{r}
          </option>
        ))}
      </select>
    </>
  );
}
