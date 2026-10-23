import { describe, expect, it } from "vitest";
import { parseConfig, readFrames, type ConfigForm } from "./parse";

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
  from: "",
  to: "",
  crcField: "none",
  frame: "0",
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

/** Two hex frames: a header byte, 2 bytes to compute, and a 1-byte CRC field (width 3). */
const frames = (over: Partial<ConfigForm> = {}) => form({ inputMode: "hex", input: "FE A5 0F 01\nFE 0F A5 07", ...over });

describe("readFrames", () => {
  it("Given 2 lines in hex and no range, When read, Then each line is a frame, laid out from byte 0 with no CRC field, and frame 0 is selected", () => {
    expect(readFrames(frames())).toEqual({
      list: [
        [0xfe, 0xa5, 0x0f, 0x01],
        [0xfe, 0x0f, 0xa5, 0x07],
      ],
      layout: { from: 0, crcField: "none" },
      selected: 0,
    });
  });

  it("Given from 1, to 2 and a BE field, When frame 1 is selected, Then the layout and selection are read", () => {
    expect(readFrames(frames({ from: "1", to: "2", crcField: "be", frame: "1" }))).toMatchObject({
      layout: { from: 1, to: 2, crcField: "be" },
      selected: 1,
    });
  });

  it("Given a frame number past the last frame, When read, Then the last frame is selected", () => {
    expect(readFrames(frames({ frame: "9" }))).toMatchObject({ selected: 1 });
  });

  it("Given blank lines, When read, Then they are not frames", () => {
    expect(readFrames(frames({ input: "\nA5\r\n\n0F\n" }))).toMatchObject({ list: [[0xa5], [0x0f]] });
  });

  it("Given a byte number that cannot be read, When read, Then the frames are still read with the range from byte 0 to the end", () => {
    expect(readFrames(frames({ from: "x", to: "-1" }))).toMatchObject({ layout: { from: 0, crcField: "none" } });
  });

  it("Given hex that cannot be read, or input mode bits, When read, Then there are no frames", () => {
    expect(readFrames(frames({ input: "A5F" }))).toBeUndefined();
    expect(readFrames(form())).toBeUndefined();
  });
});

describe("parseConfig with frames", () => {
  it("Given 2 frames and no range, When parsed, Then the bits are the whole 1st frame", () => {
    const r = parseConfig(frames());

    expect(r.ok && r.bits.length).toBe(32);
  });

  it("Given from 1 and a CRC field, When frame 1 is selected, Then the bits are bytes 1 to 2 of the 2nd frame", () => {
    expect(parseConfig(frames({ from: "1", crcField: "be", frame: "1" }))).toMatchObject({
      ok: true,
      bits: [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1],
    });
  });

  it("Given a line with an odd number of digits, When parsed, Then the input is invalid even if the total is even", () => {
    expect(errorsOf(frames({ input: "A5F\n0" })).input).toEqual({ code: "oddHex" });
  });

  it.each(["x", "-1", "1.5"])("Given from %j, When parsed, Then the range is invalid", (from) => {
    expect(errorsOf(frames({ from })).range).toEqual({ code: "notIndex" });
  });

  it("Given to before from, When parsed, Then the range is invalid because it does not fit the selected frame", () => {
    expect(errorsOf(frames({ from: "2", to: "1" })).range).toEqual({ code: "outsideFrame" });
  });

  it("Given a range over 256 bits, When parsed, Then the input is too long even though the frame is longer", () => {
    const input = "00".repeat(40);

    expect(errorsOf(frames({ input, to: "31" }))).toEqual({});
    expect(errorsOf(frames({ input, to: "32" })).input).toEqual({ code: "tooLong", max: 256 });
  });

  it("Given input mode bits, When a range is set, Then it is ignored", () => {
    expect(parseConfig(form({ from: "3" }))).toMatchObject({ ok: true, bits: [1, 0, 1, 0, 1] });
  });

  it("Given empty hex input, When parsed, Then there are no bits, and the range is not checked", () => {
    expect(parseConfig(frames({ input: "", from: "3" }))).toMatchObject({ ok: true, bits: [] });
  });
});
