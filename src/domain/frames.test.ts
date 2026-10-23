import { describe, expect, it } from "vitest";
import { checkFrame, frameSpan, type FrameLayout } from "./frames";
import type { CrcParams } from "./trace";

/** CRC-16/IBM-SDLC (X-25): the CRC-16-CCITT polynomial sent right-shifted, with init and xorout 0xFFFF; check 0x906E. */
const x25: CrcParams = { width: 16, poly: 0x1021, init: 0xffff, refin: true, refout: true, xorout: 0xffff };
const ASCII_123456789 = [0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39];

const layout = (over: Partial<FrameLayout> = {}): FrameLayout => ({ from: 0, crcField: "none", ...over });

describe("frameSpan", () => {
  it("Given no range and no CRC field, When a 5-byte frame is laid out, Then the range is the whole frame", () => {
    expect(frameSpan(5, layout(), 16)).toEqual({ from: 0, to: 4 });
  });

  it("Given from 1 and to 2, When a 5-byte frame is laid out, Then the range is bytes 1 to 2", () => {
    expect(frameSpan(5, layout({ from: 1, to: 2 }), 16)).toEqual({ from: 1, to: 2 });
  });

  it("Given a CRC field and no end, When a 5-byte frame is laid out for width 16, Then the last 2 bytes are the field and the rest the range", () => {
    expect(frameSpan(5, layout({ crcField: "be" }), 16)).toEqual({ from: 0, to: 2, field: { from: 3, to: 4 } });
  });

  it("Given a CRC field and to 1, When a 5-byte frame is laid out for width 12, Then the 2 bytes right after the range are the field", () => {
    expect(frameSpan(5, layout({ to: 1, crcField: "le" }), 12)).toEqual({ from: 0, to: 1, field: { from: 2, to: 3 } });
  });

  it("Given a CRC field and no end, When a frame is laid out for width 3, Then the field is 1 byte", () => {
    expect(frameSpan(3, layout({ crcField: "be" }), 3)).toEqual({ from: 0, to: 1, field: { from: 2, to: 2 } });
  });

  it.each([
    ["from beyond the frame", layout({ from: 5 })],
    ["to beyond the frame", layout({ to: 5 })],
    ["to before from", layout({ from: 3, to: 2 })],
    ["a CRC field past the end", layout({ to: 3, crcField: "be" })],
    ["a CRC field leaving no range", layout({ from: 3, crcField: "be" })],
  ])("Given %s, When a 5-byte frame is laid out, Then it does not fit", (_, l) => {
    expect(frameSpan(5, l, 16)).toBeUndefined();
  });
});

describe("checkFrame", () => {
  it("Given a frame with its CRC appended low byte first, When checked with an LE field, Then the computed CRC and the field match", () => {
    const check = checkFrame(x25, [...ASCII_123456789, 0x6e, 0x90], layout({ crcField: "le" }));

    expect(check).toEqual({ span: { from: 0, to: 8, field: { from: 9, to: 10 } }, crc: 0x906e, field: 0x906e });
  });

  it("Given the same frame, When checked with a BE field, Then the field is read high byte first and does not match", () => {
    expect(checkFrame(x25, [...ASCII_123456789, 0x6e, 0x90], layout({ crcField: "be" }))).toMatchObject({
      crc: 0x906e,
      field: 0x6e90,
    });
  });

  it("Given a header byte before the range, When checked from byte 1, Then only the range is computed", () => {
    expect(checkFrame(x25, [0xfe, ...ASCII_123456789], layout({ from: 1 }))).toEqual({ span: { from: 1, to: 9 }, crc: 0x906e });
  });

  it("Given a layout that does not fit, When checked, Then there is no result", () => {
    expect(checkFrame(x25, [0x31], layout({ crcField: "be" }))).toBeUndefined();
  });
});
