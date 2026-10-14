import { describe, expect, it } from "vitest";
import { codeword, GENERATORS, period, type Generator } from "./cyclic";
import { bitsValue, burstLength, codewordValues, flip, generatorError, noError, verdict, xorBits } from "./redundancy";
import type { Bit } from "./trace";

const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const X3_X_1: Generator = { width: 3, poly: 0x3 };

describe("redundancy", () => {
  it("Given ビット列, When i 番目を反転する, Then そのビットだけ変わり、もう一度反転すると戻る", () => {
    expect(flip(bits("1101001"), 2)).toEqual(bits("1111001"));
    expect(flip(flip(bits("1101001"), 2), 2)).toEqual(bits("1101001"));
  });

  it("Given 2 つのビット列, When XOR する, Then 違う位置だけ 1", () => {
    expect(xorBits(bits("1101001"), bits("1001011"))).toEqual(bits("0100010"));
  });

  it.each([
    ["0000000", 0],
    ["0010000", 1],
    ["0100010", 5],
    ["1000001", 7],
  ])("Given 誤り %s, When 誤りの長さを求める, Then 最初の 1 から最後の 1 までの %i ビット", (e, length) => {
    expect(burstLength(bits(e))).toBe(length);
  });

  it("Given 誤りが無い, When 判定する, Then 誤りなし", () => {
    expect(verdict(X3_X_1, noError(7))).toBe("clean");
  });

  it("Given g(x) で割り切れない誤り, When 判定する, Then 誤りを見つけた", () => {
    expect(verdict(X3_X_1, bits("0100010"))).toBe("detected");
  });

  it("Given g(x) で割り切れる誤り, When 判定する, Then 見逃した", () => {
    expect(verdict(X3_X_1, bits("0010110"))).toBe("missed");
  });

  it("Given x³+x+1 と長さ 7, When 見逃す例の誤りを作る, Then 下の端に g(x) を置いた長さ 4 の誤り", () => {
    const e = generatorError(X3_X_1, 7);
    expect(e).toEqual(bits("0001011"));
    expect(burstLength(e)).toBe(4);
    expect(verdict(X3_X_1, e)).toBe("missed");
  });

  it.each(GENERATORS)("Given 生成多項式 %o, When 1 ビットや長さ width 以下の誤りを入れる, Then 全て見つかる", (g) => {
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
  });

  it("Given ビット列, When 値にする, Then 先頭を最上位とする整数", () => {
    expect(bitsValue(bits("1101001"))).toBe(0b1101001);
  });

  it.each(GENERATORS.filter((g) => period(g) <= 7))(
    "Given 生成多項式 %o, When 符号語の値を全て集める, Then 2^k 個あり、符号語を含む",
    (g) => {
      const values = codewordValues(g);
      expect(values.size).toBe(2 ** (period(g) - g.width));
      expect(values.has(bitsValue(codeword(g)))).toBe(true);
    },
  );
});
