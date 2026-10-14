import { describe, expect, it } from "vitest";
import { polynomialText, powerText } from "./format";

describe("polynomialText", () => {
  it.each([
    [3, 0x3, "x³ + x + 1"],
    [4, 0xf, "x⁴ + x³ + x² + x + 1"],
    [5, 0x5, "x⁵ + x² + 1"],
    [16, 0x1021, "x¹⁶ + x¹² + x⁵ + 1"],
  ])("Given width %i と poly %i, When 生成多項式を書く, Then %s", (width, poly, text) => {
    expect(polynomialText(width, poly)).toBe(text);
  });
});

describe("powerText", () => {
  it.each([
    [0, "x⁰"],
    [1, "x¹"],
    [30, "x³⁰"],
  ])("Given 次数 %i, When x の累乗を書く, Then %s", (d, text) => {
    expect(powerText(d)).toBe(text);
  });
});
