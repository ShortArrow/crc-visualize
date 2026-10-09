import { Pause, Play, Repeat, SkipBack, SkipForward, StepBack, StepForward } from "lucide-react";
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
}>;

/** 再生コントロール。 */
export function Controls({ player, length, speedMode, rate, loop, send, onSpeedMode, onRate, onLoop }: Props) {
  return (
    <div className="controls">
      <button type="button" title="先頭 (Home)" onClick={() => send({ type: "first" })}>
        <SkipBack size={ICON_SIZE} />
      </button>
      <button type="button" title="1 ステップ戻る (←)" onClick={() => send({ type: "prev" })}>
        <StepBack size={ICON_SIZE} />
      </button>
      <button
        type="button"
        className="primary"
        title="再生 / 一時停止 (Space)"
        aria-label={player.playing ? "一時停止" : "再生"}
        onClick={() => send({ type: "toggle" })}
      >
        {player.playing ? <Pause size={ICON_SIZE} /> : <Play size={ICON_SIZE} />}
      </button>
      <button type="button" title="1 ステップ進む (→)" onClick={() => send({ type: "next" })}>
        <StepForward size={ICON_SIZE} />
      </button>
      <button type="button" title="末尾 (End)" onClick={() => send({ type: "last" })}>
        <SkipForward size={ICON_SIZE} />
      </button>
      <button
        type="button"
        className={loop ? "toggle on" : "toggle"}
        title="ループ再生 (L)"
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
      <select value={speedMode} onChange={(e) => onSpeedMode(e.target.value as SpeedMode)} title="速度モード">
        <option value="auto">自動 (序盤スロー)</option>
        <option value="steady">一定</option>
      </select>
      <select value={rate} onChange={(e) => onRate(Number(e.target.value))} title="速度倍率">
        {RATES.map((r) => (
          <option key={r} value={r}>
            ×{r}
          </option>
        ))}
      </select>
    </div>
  );
}
