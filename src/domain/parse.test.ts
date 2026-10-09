import { describe, expect, it } from "vitest";
import { parseConfig, type ConfigForm } from "./parse";

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
  it("正しいフォームはパラメータと入力ビットになる", () => {
    expect(parseConfig(form())).toEqual({
      ok: true,
      params: { width: 3, poly: 3, init: 0, refin: false, refout: false, xorout: 0 },
      bits: [1, 0, 1, 0, 1],
    });
  });

  it("16 進は 0x 有無・大小文字を問わない", () => {
    const r = parseConfig(form({ width: "16", poly: "1021", init: "FfFf", xorout: "0X0" }));
    expect(r).toMatchObject({ ok: true, params: { poly: 0x1021, init: 0xffff, xorout: 0 } });
  });

  it.each(["0", "33", "3.5", "abc", ""])("width %j は不正", (width) => {
    expect(errorsOf(form({ width }))).toHaveProperty("width");
  });

  it("poly は 0 と 2^width 以上が不正", () => {
    expect(errorsOf(form({ poly: "0" }))).toHaveProperty("poly");
    expect(errorsOf(form({ poly: "0x8" }))).toHaveProperty("poly");
    expect(errorsOf(form({ poly: "0x7" }))).not.toHaveProperty("poly");
  });

  it("init と xorout は 2^width 以上が不正、16 進でない文字も不正", () => {
    expect(errorsOf(form({ init: "0x8", xorout: "0xg" }))).toMatchObject({
      init: expect.any(String),
      xorout: expect.any(String),
    });
  });

  it("width が不正なら poly などの範囲検査はしない", () => {
    expect(Object.keys(errorsOf(form({ width: "x", poly: "0x8" })))).toEqual(["width"]);
  });

  it("hex 入力は空白を無視して MSB からビットにする", () => {
    expect(parseConfig(form({ inputMode: "hex", input: "a 5" }))).toMatchObject({
      bits: [1, 0, 1, 0, 0, 1, 0, 1],
    });
  });

  it("hex 入力の桁数が奇数なら不正", () => {
    expect(errorsOf(form({ inputMode: "hex", input: "abc" }))).toHaveProperty("input");
  });

  it("text 入力は UTF-8 のバイト列になる", () => {
    const r = parseConfig(form({ inputMode: "text", input: "é" }));
    expect(r).toMatchObject({ bits: [1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1] });
  });

  it("bits 入力の 0/1 以外の文字は不正、空白は無視", () => {
    expect(errorsOf(form({ input: "10 2" }))).toHaveProperty("input");
    expect(parseConfig(form({ input: "1 0" }))).toMatchObject({ bits: [1, 0] });
  });

  it("refin 真でビット長が 8 の倍数でなければ不正", () => {
    expect(errorsOf(form({ refin: true }))).toHaveProperty("input");
    expect(errorsOf(form({ refin: true, input: "10101010" }))).not.toHaveProperty("input");
  });

  it("入力は 256 ビットまで", () => {
    expect(errorsOf(form({ input: "1".repeat(256) }))).not.toHaveProperty("input");
    expect(errorsOf(form({ input: "1".repeat(257) }))).toHaveProperty("input");
  });
});
