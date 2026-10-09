import { describe, expect, it } from "vitest";
import { findPreset, PRESETS } from "./presets";

describe("findPreset", () => {
  it("パラメータが完全一致するプリセットを返す", () => {
    const crc16 = PRESETS.find((p) => p.name === "CRC-16/XMODEM")!;
    expect(findPreset({ ...crc16.params })).toBe(crc16);
  });

  it("どれとも一致しなければ undefined", () => {
    expect(findPreset({ width: 3, poly: 3, init: 1, refin: false, refout: false, xorout: 0 })).toBeUndefined();
  });

  it("プリセット同士でパラメータは重複しない", () => {
    expect(PRESETS.every((p) => findPreset(p.params) === p)).toBe(true);
  });
});
