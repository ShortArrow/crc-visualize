import { describe, expect, it } from "vitest";
import { parseConfig, type ConfigForm } from "./parse";

/** CRC-3/TUTORIAL の正しいフォームに over を重ねたもの。 */
const form = (over: Partial<ConfigForm> = {}): ConfigForm => ({
  width: "3",
  poly: "0x3",
  init: "0x0",
  refin: false,
  refout: false,
  xorout: "0x0",
  inputMode: "bits",
  input: "10101",
  ...over,
});

const errorsOf = (f: ConfigForm) => {
  const r = parseConfig(f);
  return r.ok ? {} : r.errors;
};

describe("parseConfig", () => {
  it("Given 正しいフォーム, When 解釈する, Then パラメータと入力ビットになる", () => {
    expect(parseConfig(form())).toEqual({
      ok: true,
      params: { width: 3, poly: 3, init: 0, refin: false, refout: false, xorout: 0 },
      bits: [1, 0, 1, 0, 1],
    });
  });

  it("Given 正しいフォーム, When 16 進を 0x の有無や大文字小文字を混ぜて書く, Then どれも数として読む", () => {
    const r = parseConfig(form({ width: "16", poly: "1021", init: "FfFf", xorout: "0X0" }));

    expect(r).toMatchObject({ ok: true, params: { poly: 0x1021, init: 0xffff, xorout: 0 } });
  });

  it.each(["0", "33", "3.5", "abc", ""])("Given width 3, When width を %j にする, Then width は不正", (width) => {
    expect(errorsOf(form({ width }))).toHaveProperty("width");
  });

  it("Given width 3, When poly を 0・0x8（2^3）・0x7 にする, Then 0 と 2^width 以上だけが不正", () => {
    expect(errorsOf(form({ poly: "0" })).poly).toEqual({ code: "zero" });
    expect(errorsOf(form({ poly: "0x8" })).poly).toEqual({ code: "tooWide", width: 3 });
    expect(errorsOf(form({ poly: "0x7" }))).not.toHaveProperty("poly");
  });

  it("Given width 3, When init を 2^width 以上、xorout を 16 進でない文字にする, Then 両方とも不正", () => {
    expect(errorsOf(form({ init: "0x8", xorout: "0xg" }))).toMatchObject({
      init: { code: "tooWide", width: 3 },
      xorout: { code: "notHex" },
    });
  });

  it("Given width が不正, When poly も範囲外にする, Then poly などの範囲は検査せず width だけを不正とする", () => {
    expect(Object.keys(errorsOf(form({ width: "x", poly: "0x8" })))).toEqual(["width"]);
  });

  it("Given 入力形式 hex, When 空白を挟んで a 5 と書く, Then 空白を無視して MSB からビットにする", () => {
    expect(parseConfig(form({ inputMode: "hex", input: "a 5" }))).toMatchObject({ bits: [1, 0, 1, 0, 0, 1, 0, 1] });
  });

  it("Given 入力形式 hex, When 桁数を奇数にする, Then 入力は不正", () => {
    expect(errorsOf(form({ inputMode: "hex", input: "abc" })).input).toEqual({ code: "oddHex" });
  });

  it("Given 入力形式 text, When é を入れる, Then UTF-8 のバイト列になる", () => {
    const r = parseConfig(form({ inputMode: "text", input: "é" }));

    expect(r).toMatchObject({ bits: [1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1] });
  });

  it("Given 入力形式 bits, When 0/1 以外の文字や空白を混ぜる, Then 0/1 以外の文字は不正、空白は無視する", () => {
    expect(errorsOf(form({ input: "10 2" }))).toHaveProperty("input");
    expect(parseConfig(form({ input: "1 0" }))).toMatchObject({ bits: [1, 0] });
  });

  it("Given 入力形式 bits, When 256 ビットと 257 ビットを入れる, Then 256 ビットまでが正しい", () => {
    expect(errorsOf(form({ input: "1".repeat(256) }))).not.toHaveProperty("input");
    expect(errorsOf(form({ input: "1".repeat(257) })).input).toEqual({ code: "tooLong", max: 256 });
  });

  it("Given refin あり, When ビット長を 5 と 8 にする, Then 8 の倍数でなければ不正", () => {
    expect(errorsOf(form({ refin: true }))).toHaveProperty("input");
    expect(errorsOf(form({ refin: true, input: "10101010" }))).not.toHaveProperty("input");
  });
});
