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
  it("Given CRC 0x29B1 of non-reflected CRC-16/IBM-3740, When turned into appended bits, Then 16 bits from the MSB", () => {
    expect(crcBits(params("CRC-16/IBM-3740"), 0x29b1)).toEqual(bytes(0x29, 0xb1));
  });

  it("Given CRC 0x2189 of reflected CRC-16/KERMIT, When turned into appended bits, Then the low byte comes first", () => {
    expect(crcBits(params("CRC-16/KERMIT"), 0x2189)).toEqual(bytes(0x89, 0x21));
  });

  it("Given reflected 5-bit CRC-5/USB, When turned into appended bits, Then one byte with the upper bits zero-filled", () => {
    expect(crcBits(params("CRC-5/USB"), 0x19)).toEqual(bytes(0x19));
  });

  it("Given a message, When the transmitted sequence is built, Then the CRC bits follow the message", () => {
    const p = params("CRC-16/IBM-3740");
    expect(frame(p, text("123456789"))).toEqual([...text("123456789"), ...bytes(0x29, 0xb1)]);
  });

  it.each(CATALOGUE.filter((p) => p.params.refin === p.params.refout))(
    "Given $name, When transmitted sequences of messages with different lengths and contents are computed, Then the result is always the residue",
    (preset) => {
      const r = residue(preset.params);
      expect(r).toBeDefined();
      for (const m of MESSAGES) expect(crcOf(preset.params, frame(preset.params, m))).toBe(r);
    },
  );

  it("Given non-reflected CRC-16/XMODEM with xorout 0, When the residue is computed, Then 0", () => {
    expect(residue(params("CRC-16/XMODEM"))).toBe(0);
  });

  it("Given CRC-32/ISO-HDLC, When the residue is computed, Then 0x2144DF1C", () => {
    expect(residue(params("CRC-32/ISO-HDLC"))).toBe(0x2144df1c);
  });

  it("Given parameters where refin and refout differ, When the residue is computed, Then it does not apply", () => {
    expect(residue({ ...params("CRC-16/KERMIT"), refout: false })).toBeUndefined();
  });

  it.each(CATALOGUE)(
    "Given the transmitted sequence of $name, When it is received unchanged, Then both checks find no error",
    (preset) => {
      const m = text("123456789");
      const received = frame(preset.params, m);
      expect(recheck(preset.params, received, m.length).ok).toBe(true);
      const whole = wholeCheck(preset.params, received);
      if (whole) expect(whole.ok).toBe(true);
    },
  );

  it.each(CATALOGUE)(
    "Given the transmitted sequence of $name, When each single bit is flipped, Then both checks find an error",
    (preset) => {
      const m = text("123456789");
      const sent = frame(preset.params, m);
      for (let i = 0; i < sent.length; i++) {
        const received = flip(sent, i);
        expect(recheck(preset.params, received, m.length).ok).toBe(false);
        const whole = wholeCheck(preset.params, received);
        if (whole) expect(whole.ok).toBe(false);
      }
    },
  );

  it("Given a received sequence, When it is recomputed, Then the message CRC and the received CRC are returned", () => {
    const p = params("CRC-16/KERMIT");
    const received = frame(p, text("123456789"));
    expect(recheck(p, received, 72)).toEqual({ computed: 0x2189, received: 0x2189, ok: true });
  });

  it("Given parameters where refin and refout differ, When the whole codeword is run through, Then it does not apply", () => {
    const p = { ...params("CRC-16/KERMIT"), refout: false };
    expect(wholeCheck(p, frame(p, text("1")))).toBeUndefined();
  });
});
