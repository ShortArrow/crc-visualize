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
  it("Given CRC-16/ARC with refin and refout both true, When finding the notes for poly, Then the reflected value used by right-shift implementations is added", () => {
    expect(paramNotes("poly", preset("CRC-16/ARC"), ja)).toContain("反転表記（右送りの実装で書かれる値）: 0xA001");
  });

  it("Given CRC-16/ARC with refin and refout both true, When finding the notes for refin and refout, Then they note that a right-shift implementation can compute it", () => {
    expect(paramNotes("refin", preset("CRC-16/ARC"), ja)).toContain(RIGHT);
    expect(paramNotes("refout", preset("CRC-16/ARC"), ja)).toContain(RIGHT);
  });

  it("Given CRC-16/ARC with refin and refout both true, When finding the notes for init, Then nothing is added", () => {
    expect(paramNotes("init", preset("CRC-16/ARC"), ja)).toEqual([]);
  });

  it("Given CRC-32/ISO-HDLC, When finding the notes for poly, Then the reflected value 0xEDB88320 is added", () => {
    expect(paramNotes("poly", preset("CRC-32/ISO-HDLC"), ja)).toContain("反転表記（右送りの実装で書かれる値）: 0xEDB88320");
  });

  it("Given CRC-16/XMODEM with refin and refout both false, When finding the notes for refin, Then it notes that a left-shift implementation can compute it", () => {
    expect(paramNotes("refin", preset("CRC-16/XMODEM"), ja)).toContain(LEFT);
  });

  it("Given only refin true, When finding the notes for refin, Then it notes that either implementation needs a separate bit reversal", () => {
    const mixed: CrcParams = { ...preset("CRC-16/ARC"), refout: false };

    expect(paramNotes("refin", mixed, ja)).toContain(MIXED);
  });
});
