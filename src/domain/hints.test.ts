import { describe, expect, it } from "vitest";
import { valueHints } from "./hints";

describe("valueHints", () => {
  it("Given CRC-16/ARC's 0xBB3D, When 0x3DBB is pasted, Then it would match with its bytes in the other order", () => {
    expect(valueHints(0x3dbbn, 0xbb3dn, 16, 0n)).toEqual(["order"]);
  });
  it("Given 0xBB3D, When 0xBCDD, its 16 bits reflected, is pasted, Then it would match reflected", () => {
    expect(valueHints(0xbcddn, 0xbb3dn, 16, 0n)).toEqual(["reflect"]);
  });
  it("Given xorout 0, When 0xBB3D XOR all ones is pasted, Then only the all-ones XOR is a hint, as the xorout XOR is not tried", () => {
    expect(valueHints(0x44c2n, 0xbb3dn, 16, 0n)).toEqual(["ones"]);
  });
  it("Given CRC-32's xorout of all ones, When the check XOR all ones is pasted, Then it would match XORed with xorout, and all ones is not tried apart", () => {
    expect(valueHints(0x340bc6d9n, 0xcbf43926n, 32, 0xffffffffn)).toEqual(["xorout"]);
  });
  it("Given xorout 0x0F0F, When the value had its bytes swapped after skipping the XOR, Then the order is reversed first and the XOR applied after", () => {
    const computed = 0x1234n;
    const skipped = computed ^ 0x0f0fn;
    const yours = ((skipped & 0xffn) << 8n) | (skipped >> 8n);
    expect(valueHints(yours, computed, 16, 0x0f0fn)).toEqual(["order+xorout"]);
  });
  it("Given 0xBB3D and xorout 0, When its all-ones XOR is pasted with its bytes swapped, Then it would match in the other order XORed with all ones", () => {
    expect(valueHints(0xc244n, 0xbb3dn, 16, 0n)).toEqual(["order+ones"]);
  });
  it("Given xorout 0x0F0F, When the value had its bits reflected after skipping the XOR, Then reflecting and XORing with xorout is a hint", () => {
    const computed = 0x1234n;
    const skipped = computed ^ 0x0f0fn;
    const yours = BigInt(`0b${skipped.toString(2).padStart(16, "0").split("").reverse().join("")}`);
    expect(valueHints(yours, computed, 16, 0x0f0fn)).toEqual(["reflect+xorout"]);
  });
  it("Given a value whose bytes each read the same reflected, When pasted with its bytes swapped, Then both the order and the reflection are hints, in that order", () => {
    expect(valueHints(0x8118n, 0x1881n, 16, 0n)).toEqual(["order", "reflect"]);
  });
  it("Given width 8, When the value reads the same in the other byte order, Then the byte order is not tried", () => {
    expect(valueHints(0x2fn, 0xf4n, 8, 0n)).toEqual(["reflect"]);
  });
  it("Given width 12, When the bytes of 0x0A0B are swapped, Then the result fits in 12 bits and would match", () => {
    expect(valueHints(0x0b0an, 0x0a0bn, 12, 0n)).toEqual(["order"]);
  });
  it("Given width 5, When the value is reflected, Then no hint is given, as a transformed value matches by chance too often", () => {
    expect(valueHints(0b10000n, 0b00001n, 5, 0n)).toEqual([]);
  });
  it("Given equal values, When compared, Then there is no hint", () => {
    expect(valueHints(0xbb3dn, 0xbb3dn, 16, 0n)).toEqual([]);
  });
  it("Given no final XOR, as for a table entry, When the value XOR all ones or in the other byte order is pasted, Then only the byte order is a hint", () => {
    expect(valueHints(0x44c2n, 0xbb3dn, 16, undefined)).toEqual([]);
    expect(valueHints(0x3dbbn, 0xbb3dn, 16, undefined)).toEqual(["order"]);
  });
});
