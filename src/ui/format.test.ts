import { describe, expect, it } from "vitest";
import { polynomialText, powerOfTwoText, powerText } from "./format";

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
