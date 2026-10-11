import { describe, expect, it } from "vitest";
import { findPreset, PRESETS } from "./presets";

describe("findPreset", () => {
  describe("Given CRC-16/XMODEM と同じパラメータ", () => {
    it("When プリセットを探す, Then CRC-16/XMODEM を返す", () => {
      const crc16 = PRESETS.find((p) => p.name === "CRC-16/XMODEM")!;

      expect(findPreset({ ...crc16.params })).toBe(crc16);
    });
  });

  describe("Given どのプリセットとも違うパラメータ", () => {
    it("When プリセットを探す, Then undefined を返す", () => {
      expect(findPreset({ width: 3, poly: 3, init: 1, refin: false, refout: false, xorout: 0 })).toBeUndefined();
    });
  });

  describe("Given 全てのプリセット", () => {
    it("When それぞれのパラメータで探す, Then 自分自身が見つかり、パラメータが重複しない", () => {
      expect(PRESETS.every((p) => findPreset(p.params) === p)).toBe(true);
    });
  });
});
