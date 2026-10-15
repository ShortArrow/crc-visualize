import { describe, expect, it } from "vitest";
import { parseConfig, type ConfigForm } from "./parse";

/** A valid CRC-3/TUTORIAL form with over applied on top. */
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
  it("Given a valid form, When parsed, Then it yields parameters and input bits", () => {
    expect(parseConfig(form())).toEqual({
      ok: true,
      params: { width: 3, poly: 3, init: 0, refin: false, refout: false, xorout: 0 },
      bits: [1, 0, 1, 0, 1],
    });
  });

  it("Given a valid form, When hex is written with and without 0x and in mixed case, Then all are read as numbers", () => {
    const r = parseConfig(form({ width: "16", poly: "1021", init: "FfFf", xorout: "0X0" }));

    expect(r).toMatchObject({ ok: true, params: { poly: 0x1021, init: 0xffff, xorout: 0 } });
  });

  it.each(["0", "33", "3.5", "abc", ""])("Given width 3, When width is set to %j, Then width is invalid", (width) => {
    expect(errorsOf(form({ width }))).toHaveProperty("width");
  });

  it("Given width 3, When poly is set to 0, 0x8 (2^3) and 0x7, Then only 0 and values of 2^width or more are invalid", () => {
    expect(errorsOf(form({ poly: "0" })).poly).toEqual({ code: "zero" });
    expect(errorsOf(form({ poly: "0x8" })).poly).toEqual({ code: "tooWide", width: 3 });
    expect(errorsOf(form({ poly: "0x7" }))).not.toHaveProperty("poly");
  });

  it("Given width 3, When init is 2^width or more and xorout is not hex, Then both are invalid", () => {
    expect(errorsOf(form({ init: "0x8", xorout: "0xg" }))).toMatchObject({
      init: { code: "tooWide", width: 3 },
      xorout: { code: "notHex" },
    });
  });

  it("Given an invalid width, When poly is also out of range, Then ranges such as poly are not checked and only width is invalid", () => {
    expect(Object.keys(errorsOf(form({ width: "x", poly: "0x8" })))).toEqual(["width"]);
  });

  it("Given input mode hex, When written as a 5 with a space, Then the space is ignored and bits are taken MSB first", () => {
    expect(parseConfig(form({ inputMode: "hex", input: "a 5" }))).toMatchObject({ bits: [1, 0, 1, 0, 0, 1, 0, 1] });
  });

  it("Given input mode hex, When the digit count is odd, Then the input is invalid", () => {
    expect(errorsOf(form({ inputMode: "hex", input: "abc" })).input).toEqual({ code: "oddHex" });
  });

  it("Given input mode text, When é is entered, Then it becomes its UTF-8 bytes", () => {
    const r = parseConfig(form({ inputMode: "text", input: "é" }));

    expect(r).toMatchObject({ bits: [1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1] });
  });

  it("Given input mode bits, When characters other than 0/1 and spaces are mixed in, Then non-0/1 characters are invalid and spaces are ignored", () => {
    expect(errorsOf(form({ input: "10 2" }))).toHaveProperty("input");
    expect(parseConfig(form({ input: "1 0" }))).toMatchObject({ bits: [1, 0] });
  });

  it("Given input mode bits, When 256 and 257 bits are entered, Then up to 256 bits is valid", () => {
    expect(errorsOf(form({ input: "1".repeat(256) }))).not.toHaveProperty("input");
    expect(errorsOf(form({ input: "1".repeat(257) })).input).toEqual({ code: "tooLong", max: 256 });
  });

  it("Given refin on, When the bit length is 5 and 8, Then it is invalid unless a multiple of 8", () => {
    expect(errorsOf(form({ refin: true }))).toHaveProperty("input");
    expect(errorsOf(form({ refin: true, input: "10101010" }))).not.toHaveProperty("input");
  });
});
