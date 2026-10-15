import { describe, expect, it } from "vitest";
import { codeConstants, crcOf, equivalences, initPrefix, reverseEachByte, rightShiftCrc, shiftDirection } from "./equivalence";
import { CATALOGUE } from "./presets";
import { bitsFromBytes, type Bit, type CrcParams } from "./trace";

const CHECK = bitsFromBytes([...new TextEncoder().encode("123456789")]);
const params = (name: string): CrcParams => CATALOGUE.find((p) => p.name === name)!.params;

describe("equivalence", () => {
  it.each(CATALOGUE)("Given $name, When the CRC of 123456789 is computed, Then it is the check value", (preset) => {
    expect(crcOf(preset.params, CHECK)).toBe(preset.check);
  });

  it("Given a byte-aligned bit sequence, When each byte is reflected, Then the bit order of every byte is reversed", () => {
    const bits: Bit[] = [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1];
    expect(reverseEachByte(bits)).toEqual([1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it.each(CATALOGUE.filter((p) => p.params.refin && p.params.refout))(
    "Given reflected $name, When computed by right-shift, Then it is the check value",
    (preset) => {
      expect(rightShiftCrc(preset.params, CHECK)).toBe(preset.check);
    },
  );

  it("Given CRC-16/CCITT-FALSE (init 0xFFFF), When the prefix is computed, Then it is the 16 bits of 0x84CF", () => {
    const prefix = initPrefix(params("CRC-16/IBM-3740"))!;
    expect(prefix).toHaveLength(16);
    expect(parseInt(prefix.join(""), 2)).toBe(0x84cf);
  });

  it("Given a poly whose LSB is 0, When the prefix is computed, Then there is none", () => {
    expect(initPrefix({ ...params("CRC-16/IBM-3740"), poly: 0x1020 })).toBeUndefined();
  });

  it.each(CATALOGUE)(
    "Given $name and 123456789, When all substitutions are computed, Then both sides match for every applicable item",
    (preset) => {
      for (const item of equivalences(preset.params, CHECK)) {
        if (item.applicable) expect([item.id, item.right]).toEqual([item.id, item.left]);
      }
    },
  );

  it("Given parameters with refin and refout false and a 3-bit input, When all substitutions are computed, Then the inapplicable items carry a reason", () => {
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
  ] as const)("Given %s, When the shift direction is determined, Then %s", (name, direction) => {
    expect(shiftDirection(params(name))).toBe(direction);
  });

  it("Given parameters where refin and refout differ, When the shift direction is determined, Then reflection is needed either way", () => {
    expect(shiftDirection({ ...params("CRC-16/KERMIT"), refout: false })).toBe("mixed");
  });

  it("Given CRC-16/ARC (right-shift), When the constants written in code are computed, Then poly is the bit-reversed 0xA001", () => {
    expect(codeConstants(params("CRC-16/ARC"))).toEqual({ poly: 0xa001, init: 0 });
  });

  it("Given CRC-16/IBM-3740 (left-shift), When the constants written in code are computed, Then they are the values as is", () => {
    expect(codeConstants(params("CRC-16/IBM-3740"))).toEqual({ poly: 0x1021, init: 0xffff });
  });
});
