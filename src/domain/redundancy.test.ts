import { describe, expect, it } from "vitest";
import { codeword, GENERATORS, period, type Generator } from "./cyclic";
import { bitsValue, burstLength, codewordValues, flip, generatorError, noError, verdict, xorBits } from "./redundancy";
import type { Bit } from "./trace";

const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const X3_X_1: Generator = { width: 3, poly: 0x3 };

describe("redundancy", () => {
  it("Given a bit sequence, When bit i is flipped, Then only that bit changes and flipping again restores it", () => {
    expect(flip(bits("1101001"), 2)).toEqual(bits("1111001"));
    expect(flip(flip(bits("1101001"), 2), 2)).toEqual(bits("1101001"));
  });

  it("Given two bit sequences, When XORed, Then only differing positions are 1", () => {
    expect(xorBits(bits("1101001"), bits("1001011"))).toEqual(bits("0100010"));
  });

  it.each([
    ["0000000", 0],
    ["0010000", 1],
    ["0100010", 5],
    ["1000001", 7],
  ])("Given error %s, When its error length is computed, Then it is the %i bits from the first 1 to the last 1", (e, length) => {
    expect(burstLength(bits(e))).toBe(length);
  });

  it("Given no error, When judged, Then clean", () => {
    expect(verdict(X3_X_1, noError(7))).toBe("clean");
  });

  it("Given an error not divisible by g(x), When judged, Then detected", () => {
    expect(verdict(X3_X_1, bits("0100010"))).toBe("detected");
  });

  it("Given an error divisible by g(x), When judged, Then missed", () => {
    expect(verdict(X3_X_1, bits("0010110"))).toBe("missed");
  });

  it("Given x³+x+1 and length 7, When the missed-error example is built, Then it is g(x) placed at the low end, with error length 4", () => {
    const e = generatorError(X3_X_1, 7);
    expect(e).toEqual(bits("0001011"));
    expect(burstLength(e)).toBe(4);
    expect(verdict(X3_X_1, e)).toBe("missed");
  });

  it.each(GENERATORS)(
    "Given generator polynomial %o, When single-bit errors or errors of length width or less are applied, Then all are detected",
    (g) => {
      const n = period(g);
      for (let start = 0; start < n; start++) {
        for (let length = 1; length <= g.width && start + length <= n; length++) {
          for (let inner = 0; inner < 2 ** Math.max(0, length - 2); inner++) {
            const e = noError(n);
            e[start] = 1;
            e[start + length - 1] = 1;
            for (let j = 0; j < length - 2; j++) e[start + 1 + j] = (inner >> j) & 1 ? 1 : 0;
            expect(verdict(g, e)).toBe("detected");
          }
        }
      }
    },
  );

  it("Given a bit sequence, When converted to a value, Then it is the integer with the first bit as MSB", () => {
    expect(bitsValue(bits("1101001"))).toBe(0b1101001);
  });

  it.each(GENERATORS.filter((g) => period(g) <= 7))(
    "Given generator polynomial %o, When all codeword values are collected, Then there are 2^k of them, including the codeword",
    (g) => {
      const values = codewordValues(g);
      expect(values.size).toBe(2 ** (period(g) - g.width));
      expect(values.has(bitsValue(codeword(g)))).toBe(true);
    },
  );
});
