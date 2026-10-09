import type { Step } from "../domain/trace";

export const SLOW_MS = 900;
export const FAST_MS = 120;
export const STEADY_MS = 600;
/** auto モードで低速を続ける最大クロック数。 */
export const MAX_SLOW_CLOCKS = 6;

/** auto: 序盤と後処理を低速、残りを高速にする。steady: 一定速度。 */
export type SpeedMode = "auto" | "steady";

const ALWAYS_SLOW: ReadonlySet<Step["kind"]> = new Set(["init", "reflectOut", "xorOut", "done"]);

/**
 * 各ステップの表示時間（ms、速度倍率を掛ける前）。結果の i 番目が steps[i] に対応する。
 * auto では fb=0 と fb=1 の両方が出たクロックまで、ただし最大 MAX_SLOW_CLOCKS クロックを低速にする。
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

/** 再生状態。index は表示中のステップ。 */
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

/** 再生状態の遷移。length はステップ数（1 以上）。tick の loop が真なら末尾の次は先頭に戻る。 */
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
