import { describe, expect, it } from "vitest";
import { findPreset, PRESETS } from "./presets";

describe("findPreset", () => {
  it("Given CRC-16/XMODEM と同じパラメータ, When プリセットを探す, Then CRC-16/XMODEM を返す", () => {
    const crc16 = PRESETS.find((p) => p.name === "CRC-16/XMODEM")!;

    expect(findPreset({ ...crc16.params })).toBe(crc16);
  });

  it("Given どのプリセットとも違うパラメータ, When プリセットを探す, Then undefined を返す", () => {
    expect(findPreset({ width: 3, poly: 3, init: 1, refin: false, refout: false, xorout: 0 })).toBeUndefined();
  });

  it("Given 全てのプリセット, When それぞれのパラメータで探す, Then 自分自身が見つかり、パラメータが重複しない", () => {
    expect(PRESETS.every((p) => findPreset(p.params) === p)).toBe(true);
  });
});

describe("PRESETS", () => {
  it("Given 全てのプリセット, When 正式名と別名を集める, Then どの名前も 1 つのプリセットにしか付いていない", () => {
    const names = PRESETS.flatMap((p) => [p.name, ...p.aliases]);

    expect(new Set(names).size).toBe(names.length);
  });

  it.each([
    "CRC-8/AUTOSAR",
    "CRC-8/SAE-J1850",
    "CRC-16/IBM-SDLC",
    "CRC-16/SPI-FUJITSU",
    "CRC-16/GENIBUS",
    "CRC-16/MODBUS",
    "CRC-16/USB",
    "CRC-32/ISCSI",
    "CRC-32/MPEG-2",
  ])("Given プリセットの一覧, When %s を探す, Then 見つかる", (name) => {
    expect(PRESETS.map((p) => p.name)).toContain(name);
  });
});
