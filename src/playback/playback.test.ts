import { describe, expect, it } from "vitest";
import { trace, type CrcParams } from "../domain/trace";
import { bits, plain3 } from "../testing/fixtures";
import { FAST_MS, SLOW_MS, STEADY_MS, animationMs, initialPlayer, stepDurations, updatePlayer, type Player } from "./playback";

/** 各クロック（feedback から次の feedback の直前まで）の所要時間の一覧。 */
const clockDurations = (params: CrcParams, input: string) => {
  const steps = trace(params, bits(input));
  const durations = stepDurations(steps, "auto");
  return steps.flatMap((s, i) => (s.kind === "feedback" ? [durations[i]] : []));
};

describe("stepDurations", () => {
  it("Given 自動モード, When feedback が 1,0,0,1,1 と出る 10101 を流す, Then 0 と 1 の両方を見せた 2 クロック目までは低速、以降は高速", () => {
    expect(clockDurations(plain3, "10101")).toEqual([SLOW_MS, SLOW_MS, FAST_MS, FAST_MS, FAST_MS]);
  });

  it("Given 自動モード, When feedback が 0 しか出ない 00000000 を流す, Then 7 クロック目からは高速", () => {
    expect(clockDurations(plain3, "00000000")).toEqual([...Array(6).fill(SLOW_MS), FAST_MS, FAST_MS]);
  });

  it("Given 自動モード, When 1 クロックだけ流す, Then そのクロックの shift と xor も同じ速度", () => {
    const steps = trace(plain3, bits("1"));

    expect(stepDurations(steps, "auto")).toEqual(steps.map(() => SLOW_MS));
  });

  it("Given 自動モード, When 高速になるほど長く流す, Then init と後処理は常に低速", () => {
    const steps = trace({ ...plain3, refout: true, xorout: 1 }, bits("10101010"));

    const durations = stepDurations(steps, "auto");

    const slowKinds = steps.filter((_, i) => durations[i] === SLOW_MS).map((s) => s.kind);
    expect(slowKinds).toEqual(expect.arrayContaining(["init", "reflectOut", "xorOut", "done"]));
    expect(durations.at(-2)).toBe(SLOW_MS);
  });

  it("Given 一定モード, When 101 を流す, Then 全ステップが同じ時間", () => {
    const steps = trace(plain3, bits("101"));

    expect(new Set(stepDurations(steps, "steady"))).toEqual(new Set([STEADY_MS]));
  });
});

describe("updatePlayer", () => {
  const len = 5;
  const at = (index: number, playing = false): Player => ({ index, playing });
  const tickOnce = { type: "tick", loop: false } as const;
  const tickLoop = { type: "tick", loop: true } as const;

  it("Given 開いた直後, When 何もしない, Then 先頭で停止している", () => {
    expect(initialPlayer).toEqual(at(0));
  });

  it("Given ループ無効, When 再生中に tick する, Then 1 つ進み、末尾に着いたら停止する", () => {
    expect(updatePlayer(at(1, true), tickOnce, len)).toEqual(at(2, true));
    expect(updatePlayer(at(3, true), tickOnce, len)).toEqual(at(4, false));
  });

  it("Given ループ無効, When 停止中に tick する, Then 進まない", () => {
    expect(updatePlayer(at(1), tickOnce, len)).toEqual(at(1));
  });

  it("Given ループ有効, When 再生中に末尾まで tick する, Then 末尾を表示したまま再生を続け、次の tick で先頭に戻る", () => {
    expect(updatePlayer(at(3, true), tickLoop, len)).toEqual(at(4, true));
    expect(updatePlayer(at(4, true), tickLoop, len)).toEqual(at(0, true));
  });

  it("Given ループ有効, When 停止中に tick する, Then 進まない", () => {
    expect(updatePlayer(at(4), tickLoop, len)).toEqual(at(4));
  });

  it("Given 停止中, When 末尾で play する, Then 先頭から再生する", () => {
    expect(updatePlayer(at(4), { type: "play" }, len)).toEqual(at(0, true));
  });

  it("Given 停止中, When 途中で play する, Then その位置から再生する", () => {
    expect(updatePlayer(at(2), { type: "play" }, len)).toEqual(at(2, true));
  });

  it("Given 停止中, When 末尾で toggle する, Then 先頭から再生する", () => {
    expect(updatePlayer(at(4), { type: "toggle" }, len)).toEqual(at(0, true));
  });

  it("Given 再生中, When toggle する, Then 停止する", () => {
    expect(updatePlayer(at(2, true), { type: "toggle" }, len)).toEqual(at(2, false));
  });

  it("Given 再生中, When reset する, Then 先頭で停止する", () => {
    expect(updatePlayer(at(3, true), { type: "reset" }, len)).toEqual(at(0));
  });

  it("Given 任意の位置, When 手動で移動する, Then 停止し、範囲内に収める", () => {
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
  it("Given ステップの表示時間, When アニメーションの長さを求める, Then 表示時間の 80% で、速度倍率を下げると上限なく長くなる", () => {
    expect(animationMs(FAST_MS)).toBe(FAST_MS * 0.8);
    expect(animationMs(SLOW_MS / 0.25)).toBe((SLOW_MS / 0.25) * 0.8);
  });
});
