import { describe, expect, it } from "vitest";
import { PRESETS } from "../domain/presets";
import { PARAM_NAMES, type CrcParams } from "../domain/trace";
import { PARAM_INFO, paramNotes } from "./paramInfo";

const preset = (name: string): CrcParams => PRESETS.find((p) => p.name === name)!.params;

describe("PARAM_INFO", () => {
  it.each(PARAM_NAMES)("%s は日本語名・説明・別名を持つ", (param) => {
    const info = PARAM_INFO[param];
    expect(info.title).not.toBe("");
    expect(info.summary).not.toBe("");
    expect(info.aliases.length).toBeGreaterThan(0);
  });

  it("poly の日本語名は生成多項式", () => {
    expect(PARAM_INFO.poly.title).toBe("生成多項式");
  });
});

describe("paramNotes", () => {
  it("poly には右送りの実装で使う反転表記の値を添える", () => {
    expect(paramNotes("poly", preset("CRC-16/ARC"))).toContain("反転表記（右送りの実装で書かれる値）: 0xA001");
    expect(paramNotes("poly", preset("CRC-32/ISO-HDLC"))).toContain("反転表記（右送りの実装で書かれる値）: 0xEDB88320");
  });

  it("refin と refout がともに真なら右送り、ともに偽なら左送りの実装で計算できると添える", () => {
    const right = "refin と refout がともに true なので、右送り（LSB から処理する）の実装で計算できる";
    const left = "refin と refout がともに false なので、左送り（MSB から処理する）の実装で計算できる";
    expect(paramNotes("refin", preset("CRC-16/ARC"))).toContain(right);
    expect(paramNotes("refout", preset("CRC-16/ARC"))).toContain(right);
    expect(paramNotes("refin", preset("CRC-16/XMODEM"))).toContain(left);
  });

  it("refin と refout が食い違うときは、どちらの実装でも反転が別に要ると添える", () => {
    const mixed: CrcParams = { ...preset("CRC-16/ARC"), refout: false };
    expect(paramNotes("refin", mixed)).toContain(
      "refin と refout が異なるので、右送りと左送りのどちらの実装でも、どこかでビットの反転が別に要る",
    );
  });

  it("それ以外のパラメータには注記を添えない", () => {
    expect(paramNotes("init", preset("CRC-16/ARC"))).toEqual([]);
  });
});
