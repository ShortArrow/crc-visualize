import { describe, expect, it } from "vitest";
import { crcBits, frame, recheck, residue, wholeCheck } from "./check";
import { crcOf } from "./equivalence";
import { CATALOGUE } from "./presets";
import { flip } from "./redundancy";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

const text = (s: string): Bit[] => bitsFromBytes([...new TextEncoder().encode(s)]);
const bytes = (...b: number[]): Bit[] => bitsFromBytes(b);
const params = (name: string): CrcParams => CATALOGUE.find((p) => p.name === name)!.params;
const MESSAGES = [text(""), text("A"), text("123456789"), text("The quick brown fox")];

describe("check", () => {
  it("Given 反転しない CRC-16/IBM-3740 の CRC 0x29B1, When 付けるビットにする, Then 最上位ビットから 16 ビット", () => {
    expect(crcBits(params("CRC-16/IBM-3740"), 0x29b1)).toEqual(bytes(0x29, 0xb1));
  });

  it("Given 反転する CRC-16/KERMIT の CRC 0x2189, When 付けるビットにする, Then 下位のバイトから", () => {
    expect(crcBits(params("CRC-16/KERMIT"), 0x2189)).toEqual(bytes(0x89, 0x21));
  });

  it("Given 反転する 5 ビットの CRC-5/USB, When 付けるビットにする, Then 上位を 0 で埋めた 1 バイト", () => {
    expect(crcBits(params("CRC-5/USB"), 0x19)).toEqual(bytes(0x19));
  });

  it("Given 本文, When 送る並びを作る, Then 本文の後ろに CRC のビットを付ける", () => {
    const p = params("CRC-16/IBM-3740");
    expect(frame(p, text("123456789"))).toEqual([...text("123456789"), ...bytes(0x29, 0xb1)]);
  });

  it.each(CATALOGUE.filter((p) => p.params.refin === p.params.refout))(
    "Given $name, When 長さや中身の違う本文の送る並びを計算する, Then いつも残余になる",
    (preset) => {
      const r = residue(preset.params);
      expect(r).toBeDefined();
      for (const m of MESSAGES) expect(crcOf(preset.params, frame(preset.params, m))).toBe(r);
    },
  );

  it("Given xorout が 0 で反転しない CRC-16/XMODEM, When 残余を求める, Then 0", () => {
    expect(residue(params("CRC-16/XMODEM"))).toBe(0);
  });

  it("Given CRC-32/ISO-HDLC, When 残余を求める, Then 0x2144DF1C", () => {
    expect(residue(params("CRC-32/ISO-HDLC"))).toBe(0x2144df1c);
  });

  it("Given refin と refout が違う設定, When 残余を求める, Then 当てはまらない", () => {
    expect(residue({ ...params("CRC-16/KERMIT"), refout: false })).toBeUndefined();
  });

  it.each(CATALOGUE)("Given $name の送る並び, When そのまま受け取る, Then どちらの確かめ方も誤りなし", (preset) => {
    const m = text("123456789");
    const received = frame(preset.params, m);
    expect(recheck(preset.params, received, m.length).ok).toBe(true);
    const whole = wholeCheck(preset.params, received);
    if (whole) expect(whole.ok).toBe(true);
  });

  it.each(CATALOGUE)("Given $name の送る並び, When 1 ビットずつ反転する, Then どちらの確かめ方も誤りあり", (preset) => {
    const m = text("123456789");
    const sent = frame(preset.params, m);
    for (let i = 0; i < sent.length; i++) {
      const received = flip(sent, i);
      expect(recheck(preset.params, received, m.length).ok).toBe(false);
      const whole = wholeCheck(preset.params, received);
      if (whole) expect(whole.ok).toBe(false);
    }
  });

  it("Given 受け取った並び, When 計算し直す, Then 本文の CRC と受け取った CRC を返す", () => {
    const p = params("CRC-16/KERMIT");
    const received = frame(p, text("123456789"));
    expect(recheck(p, received, 72)).toEqual({ computed: 0x2189, received: 0x2189, ok: true });
  });

  it("Given refin と refout が違う設定, When 符号語ごと通す, Then 当てはまらない", () => {
    const p = { ...params("CRC-16/KERMIT"), refout: false };
    expect(wholeCheck(p, frame(p, text("1")))).toBeUndefined();
  });
});
