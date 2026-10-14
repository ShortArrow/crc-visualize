import { describe, expect, it } from "vitest";
import { codeConstants, crcOf, equivalences, initPrefix, reverseEachByte, rightShiftCrc, shiftDirection } from "./equivalence";
import { CATALOGUE } from "./presets";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

const CHECK = bitsFromBytes([...new TextEncoder().encode("123456789")]);
const params = (name: string): CrcParams => CATALOGUE.find((p) => p.name === name)!.params;

describe("equivalence", () => {
  it.each(CATALOGUE)("Given $name, When 123456789 の CRC を計算する, Then 検査値になる", (preset) => {
    expect(crcOf(preset.params, CHECK)).toBe(preset.check);
  });

  it("Given バイト単位のビット列, When 各バイトを反転する, Then バイトごとにビットの並びが逆になる", () => {
    const bits: Bit[] = [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1];
    expect(reverseEachByte(bits)).toEqual([1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it.each(CATALOGUE.filter((p) => p.params.refin && p.params.refout))(
    "Given 反転する $name, When 右送りで計算する, Then 検査値になる",
    (preset) => {
      expect(rightShiftCrc(preset.params, CHECK)).toBe(preset.check);
    },
  );

  it("Given CRC-16/CCITT-FALSE（init 0xFFFF）, When 前置きを求める, Then 0x84CF にあたる 16 ビット", () => {
    const prefix = initPrefix(params("CRC-16/IBM-3740"))!;
    expect(prefix).toHaveLength(16);
    expect(parseInt(prefix.join(""), 2)).toBe(0x84cf);
  });

  it("Given 最下位ビットが 0 の poly, When 前置きを求める, Then 求まらない", () => {
    expect(initPrefix({ ...params("CRC-16/IBM-3740"), poly: 0x1020 })).toBeUndefined();
  });

  it.each(CATALOGUE)("Given $name と 123456789, When 置き換えを全て計算する, Then 当てはまる項目は両辺が一致する", (preset) => {
    for (const item of equivalences(preset.params, CHECK)) {
      if (item.applicable) expect([item.id, item.right]).toEqual([item.id, item.left]);
    }
  });

  it("Given refin と refout が false の設定と 3 ビットの入力, When 置き換えを全て計算する, Then 当てはまらない項目に理由が付く", () => {
    const p = { ...params("CRC-16/IBM-3740"), poly: 0x1020 };
    const result = Object.fromEntries(equivalences(p, [1, 0, 1]).map((i) => [i.id, i.applicable ? "ok" : i.reason]));
    expect(result).toEqual({
      refin: "notBytes",
      refout: "ok",
      rightShift: "notReflected",
      initPrefix: "evenPoly",
      affine: "ok",
    });
  });

  it.each([
    ["CRC-16/KERMIT", "right"],
    ["CRC-16/IBM-3740", "left"],
  ] as const)("Given %s, When 送り方を求める, Then %s", (name, direction) => {
    expect(shiftDirection(params(name))).toBe(direction);
  });

  it("Given refin と refout が違う設定, When 送り方を求める, Then どちらでも反転が要る", () => {
    expect(shiftDirection({ ...params("CRC-16/KERMIT"), refout: false })).toBe("mixed");
  });

  it("Given CRC-16/ARC（右送り）, When コードに書かれる定数を求める, Then poly はビット反転した 0xA001", () => {
    expect(codeConstants(params("CRC-16/ARC"))).toEqual({ poly: 0xa001, init: 0 });
  });

  it("Given CRC-16/IBM-3740（左送り）, When コードに書かれる定数を求める, Then そのままの値", () => {
    expect(codeConstants(params("CRC-16/IBM-3740"))).toEqual({ poly: 0x1021, init: 0xffff });
  });
});
