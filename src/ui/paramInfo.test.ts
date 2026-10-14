import { describe, expect, it } from "vitest";
import { PRESETS } from "../domain/presets";
import type { CrcParams } from "../domain/trace";
import { ja } from "../i18n/ja";
import { paramNotes } from "./paramInfo";

const preset = (name: string): CrcParams => PRESETS.find((p) => p.name === name)!.params;
const RIGHT = "refin と refout がともに true なので、右送り（LSB から処理する）の実装で計算できる";
const LEFT = "refin と refout がともに false なので、左送り（MSB から処理する）の実装で計算できる";
const MIXED = "refin と refout が異なるので、右送りと左送りのどちらの実装でも、どこかでビットの反転が別に要る";

describe("paramNotes", () => {
  it("Given refin・refout がともに true の CRC-16/ARC, When poly の注記を求める, Then 右送りの実装で使う反転表記の値を添える", () => {
    expect(paramNotes("poly", preset("CRC-16/ARC"), ja)).toContain("反転表記（右送りの実装で書かれる値）: 0xA001");
  });

  it("Given refin・refout がともに true の CRC-16/ARC, When refin と refout の注記を求める, Then 右送りの実装で計算できると添える", () => {
    expect(paramNotes("refin", preset("CRC-16/ARC"), ja)).toContain(RIGHT);
    expect(paramNotes("refout", preset("CRC-16/ARC"), ja)).toContain(RIGHT);
  });

  it("Given refin・refout がともに true の CRC-16/ARC, When init の注記を求める, Then 何も添えない", () => {
    expect(paramNotes("init", preset("CRC-16/ARC"), ja)).toEqual([]);
  });

  it("Given CRC-32/ISO-HDLC, When poly の注記を求める, Then 反転表記 0xEDB88320 を添える", () => {
    expect(paramNotes("poly", preset("CRC-32/ISO-HDLC"), ja)).toContain("反転表記（右送りの実装で書かれる値）: 0xEDB88320");
  });

  it("Given refin・refout がともに false の CRC-16/XMODEM, When refin の注記を求める, Then 左送りの実装で計算できると添える", () => {
    expect(paramNotes("refin", preset("CRC-16/XMODEM"), ja)).toContain(LEFT);
  });

  it("Given refin だけ true, When refin の注記を求める, Then どちらの実装でも反転が別に要ると添える", () => {
    const mixed: CrcParams = { ...preset("CRC-16/ARC"), refout: false };

    expect(paramNotes("refin", mixed, ja)).toContain(MIXED);
  });
});
