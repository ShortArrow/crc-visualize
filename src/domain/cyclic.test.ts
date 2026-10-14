import { describe, expect, it } from "vitest";
import { codeword, DEFAULT_GENERATOR, findGenerator, GENERATORS, period, powerCycle, remainder, rotate } from "./cyclic";
import type { Bit } from "./trace";

const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const X3_X_1 = { width: 3, poly: 0x3 };

describe("cyclic", () => {
  it("Given 一覧の生成多項式, When 周期を求める, Then 7・7・15・5・31 になる", () => {
    expect(GENERATORS.map(period)).toEqual([7, 7, 15, 5, 31]);
  });

  it("Given x³+x+1, When 1 から入力 0 でクロックし続ける, Then x^j mod g(x) の状態を 7 つたどる", () => {
    expect(powerCycle(X3_X_1)).toEqual([0b001, 0b010, 0b100, 0b011, 0b110, 0b111, 0b101]);
  });

  it("Given 定数項の無い生成多項式, When 状態をたどる, Then 1 に戻らないので投げる", () => {
    expect(() => powerCycle({ width: 3, poly: 0x2 })).toThrow();
  });

  it("Given ビット列, When g(x) で割る, Then 高次から読んだ多項式の余りになる", () => {
    expect(remainder(X3_X_1, bits("1011"))).toBe(0);
    expect(remainder(X3_X_1, bits("1000"))).toBe(0b011);
    expect(remainder(X3_X_1, bits("110"))).toBe(0b110);
  });

  it.each(GENERATORS)("Given 生成多項式 %o, When x^n を割る, Then 余りは 1", (g) => {
    expect(remainder(g, [1, ...Array<Bit>(period(g)).fill(0)])).toBe(1);
  });

  it("Given x³+x+1, When 符号語を作る, Then 本文 1101 の後ろに CRC 001 を付けた 7 ビット", () => {
    expect(codeword(X3_X_1)).toEqual(bits("1101001"));
  });

  it("Given x⁴+x+1, When 符号語を作る, Then 本文は 1101 を繰り返した先頭 11 ビット", () => {
    expect(codeword({ width: 4, poly: 0x3 }).slice(0, 11)).toEqual(bits("11011101110"));
  });

  it.each(GENERATORS)("Given 生成多項式 %o の符号語, When 何ビット回しても, Then g(x) で割った余りは 0", (g) => {
    const word = codeword(g);
    expect(word).toHaveLength(period(g));
    for (let k = 0; k < word.length; k++) expect(remainder(g, rotate(word, k))).toBe(0);
  });

  it("Given ビット列, When k ビット回す, Then 各次数が k 上がり、最高次を越えたビットは x^0 へ回り込む", () => {
    expect(rotate(bits("1011000"), 1)).toEqual(bits("0110001"));
    expect(rotate(bits("1011000"), 7)).toEqual(bits("1011000"));
    expect(rotate(bits("1011000"), -1)).toEqual(bits("0101100"));
  });

  it("Given width と poly, When 一覧から探す, Then 一覧にあるものだけ見つかる", () => {
    expect(findGenerator(4, 0x3)).toEqual({ width: 4, poly: 0x3 });
    expect(findGenerator(4, 0x5)).toBeUndefined();
    expect(DEFAULT_GENERATOR).toEqual(X3_X_1);
  });
});
