import { describe, expect, it } from "vitest";
import { bitGroups, groupsHex, polynomialText, powerOfTwoText, powerText } from "./format";

describe("polynomialText", () => {
  it.each([
    [3, 0x3, "x³ + x + 1"],
    [4, 0xf, "x⁴ + x³ + x² + x + 1"],
    [5, 0x5, "x⁵ + x² + 1"],
    [16, 0x1021, "x¹⁶ + x¹² + x⁵ + 1"],
  ])("Given width %i and poly %i, When writing the generator polynomial, Then %s", (width, poly, text) => {
    expect(polynomialText(width, poly)).toBe(text);
  });
});

describe("powerText", () => {
  it.each([
    [0, "x⁰"],
    [1, "x¹"],
    [30, "x³⁰"],
  ])("Given degree %i, When writing a power of x, Then %s", (d, text) => {
    expect(powerText(d)).toBe(text);
  });
});

describe("powerOfTwoText", () => {
  it.each([
    [7, "2⁷ = 128"],
    [31, "2³¹ = 2147483648"],
  ])("Given exponent %i, When writing a power of 2, Then %s", (d, text) => {
    expect(powerOfTwoText(d)).toBe(text);
  });
});

describe("bitGroups", () => {
  it("Given 8 input bits and an 8-bit CRC, When grouping, Then each group of 8 holds one part", () => {
    expect(bitGroups([0, 0, 1, 1, 0, 0, 0, 1], [1, 0, 1, 1, 0, 1, 1, 1])).toEqual([
      { input: "00110001", crc: "" },
      { input: "", crc: "11101101" },
    ]);
  });

  it("Given 5 input bits and a 3-bit CRC, When grouping, Then the one group holds both parts", () => {
    expect(bitGroups([1, 0, 1, 0, 1], [1, 1, 0])).toEqual([{ input: "10101", crc: "011" }]);
  });

  it("Given 5 input bits and a 4-bit CRC, When grouping, Then the last group is shorter than 8", () => {
    expect(bitGroups([1, 0, 1, 0, 1], [0, 0, 0, 1])).toEqual([
      { input: "10101", crc: "100" },
      { input: "", crc: "0" },
    ]);
  });
});

describe("groupsHex", () => {
  it("Given whole groups, When writing them in hexadecimal, Then each is two uppercase digits", () => {
    expect(
      groupsHex([
        { input: "00110001", crc: "" },
        { input: "", crc: "10111011" },
        { input: "1010", crc: "0101" },
      ]),
    ).toEqual(["31", "BB", "A5"]);
  });

  it("Given a last group shorter than 8, When writing them in hexadecimal, Then there is no hexadecimal", () => {
    expect(
      groupsHex([
        { input: "10101", crc: "100" },
        { input: "", crc: "0" },
      ]),
    ).toBeUndefined();
  });
});
