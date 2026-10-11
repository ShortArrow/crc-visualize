import { describe, expect, it } from "vitest";
import { trace, type Bit, type CrcParams } from "../domain/trace";
import { FAST_MS, SLOW_MS, STEADY_MS, animationMs, initialPlayer, stepDurations, updatePlayer } from "./playback";

const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };
const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));

/** 各クロック（feedback から次の feedback の直前まで）の所要時間の一覧。 */
const clockDurations = (params: CrcParams, input: string) => {
  const steps = trace(params, bits(input));
  const durations = stepDurations(steps, "auto");
  return steps.flatMap((s, i) => (s.kind === "feedback" ? [durations[i]] : []));
};

describe("stepDurations", () => {
  it("auto: fb=0 と fb=1 の両方を見せたクロックまでは低速、以降は高速", () => {
    // 10101 は fb = 1,0,0,1,1。fb=0 が 2 クロック目で出るので 3 クロック目から高速。
    expect(clockDurations(plain3, "10101")).toEqual([SLOW_MS, SLOW_MS, FAST_MS, FAST_MS, FAST_MS]);
  });

  it("auto: 片方しか出なくても 7 クロック目からは高速", () => {
    expect(clockDurations(plain3, "00000000")).toEqual([...Array(6).fill(SLOW_MS), FAST_MS, FAST_MS]);
  });

  it("auto: 1 クロック内の shift と xor も同じ速度", () => {
    const steps = trace(plain3, bits("1"));
    expect(stepDurations(steps, "auto")).toEqual(steps.map(() => SLOW_MS));
  });

  it("auto: init と後処理は常に低速", () => {
    const steps = trace({ ...plain3, refout: true, xorout: 1 }, bits("10101010"));
    const durations = stepDurations(steps, "auto");
    const slowKinds = steps.filter((_, i) => durations[i] === SLOW_MS).map((s) => s.kind);
    expect(slowKinds).toEqual(expect.arrayContaining(["init", "reflectOut", "xorOut", "done"]));
    expect(durations.at(-2)).toBe(SLOW_MS);
  });

  it("steady: 全ステップ一定", () => {
    const steps = trace(plain3, bits("101"));
    expect(new Set(stepDurations(steps, "steady"))).toEqual(new Set([STEADY_MS]));
  });
});

describe("updatePlayer", () => {
  const len = 5;
  const at = (index: number, playing = false) => ({ index, playing });

  it("初期状態は先頭で停止", () => {
    expect(initialPlayer).toEqual(at(0));
  });

  it("tick は再生中だけ進み、ループ無効なら末尾に着いたら停止する", () => {
    expect(updatePlayer(at(1, true), { type: "tick", loop: false }, len)).toEqual(at(2, true));
    expect(updatePlayer(at(3, true), { type: "tick", loop: false }, len)).toEqual(at(4, false));
    expect(updatePlayer(at(1), { type: "tick", loop: false }, len)).toEqual(at(1));
  });

  it("ループ有効なら末尾を表示したまま再生を続け、次の tick で先頭に戻る", () => {
    expect(updatePlayer(at(3, true), { type: "tick", loop: true }, len)).toEqual(at(4, true));
    expect(updatePlayer(at(4, true), { type: "tick", loop: true }, len)).toEqual(at(0, true));
    expect(updatePlayer(at(4), { type: "tick", loop: true }, len)).toEqual(at(4));
  });

  it("末尾で play すると先頭から再生する", () => {
    expect(updatePlayer(at(4), { type: "play" }, len)).toEqual(at(0, true));
    expect(updatePlayer(at(2), { type: "play" }, len)).toEqual(at(2, true));
  });

  it("toggle は再生と停止を切り替える", () => {
    expect(updatePlayer(at(2, true), { type: "toggle" }, len)).toEqual(at(2, false));
    expect(updatePlayer(at(4), { type: "toggle" }, len)).toEqual(at(0, true));
  });

  it("手動移動は停止し、範囲内に収める", () => {
    expect(updatePlayer(at(2, true), { type: "next" }, len)).toEqual(at(3));
    expect(updatePlayer(at(4), { type: "next" }, len)).toEqual(at(4));
    expect(updatePlayer(at(0), { type: "prev" }, len)).toEqual(at(0));
    expect(updatePlayer(at(2, true), { type: "first" }, len)).toEqual(at(0));
    expect(updatePlayer(at(2), { type: "last" }, len)).toEqual(at(4));
    expect(updatePlayer(at(2, true), { type: "seek", index: 99 }, len)).toEqual(at(4));
    expect(updatePlayer(at(2), { type: "seek", index: -1 }, len)).toEqual(at(0));
  });

  it("reset は先頭で停止に戻す", () => {
    expect(updatePlayer(at(3, true), { type: "reset" }, len)).toEqual(at(0));
  });
});

describe("animationMs", () => {
  it("ステップ時間の 80% で、速度倍率を下げると上限なく長くなる", () => {
    expect(animationMs(FAST_MS)).toBe(FAST_MS * 0.8);
    expect(animationMs(SLOW_MS / 0.25)).toBe((SLOW_MS / 0.25) * 0.8);
  });
});
