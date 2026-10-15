import { describe, expect, it } from "vitest";
import { findPreset, PRESETS } from "./presets";

describe("findPreset", () => {
  it("Given the same parameters as CRC-16/XMODEM, When a preset is looked up, Then CRC-16/XMODEM is returned", () => {
    const crc16 = PRESETS.find((p) => p.name === "CRC-16/XMODEM")!;

    expect(findPreset({ ...crc16.params })).toBe(crc16);
  });

  it("Given parameters unlike any preset, When a preset is looked up, Then undefined is returned", () => {
    expect(findPreset({ width: 3, poly: 3, init: 1, refin: false, refout: false, xorout: 0 })).toBeUndefined();
  });

  it("Given every preset, When each is looked up by its parameters, Then it finds itself and no parameters are duplicated", () => {
    expect(PRESETS.every((p) => findPreset(p.params) === p)).toBe(true);
  });
});

describe("PRESETS", () => {
  it("Given every preset, When canonical names and aliases are collected, Then each name belongs to only one preset", () => {
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
  ])("Given the preset list, When %s is looked up, Then it is found", (name) => {
    expect(PRESETS.map((p) => p.name)).toContain(name);
  });
});
