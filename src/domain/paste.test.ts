import { describe, expect, it } from "vitest";
import { readBytes, readCrc, readValue, readValues, type Base, type Element } from "./paste";

const E8: Element = { bits: 8, order: "be" };
const bytes = (text: string, base: Base = 16, element: Element = E8) => readBytes(text, base, element);

describe("readBytes: the rows of the table in spec chapter 2, Reading pasted text", () => {
  it("Given {49, 50, 51} with the base at 10, When read, Then it is bytes 31 32 33", () => {
    expect(bytes("{49, 50, 51}", 10)).toEqual({ ok: true, value: [[0x31, 0x32, 0x33]] });
  });

  it("Given 49 50 51 with the base at 16, When read, Then it is bytes 49 50 51", () => {
    expect(bytes("49 50 51")).toEqual({ ok: true, value: [[0x49, 0x50, 0x51]] });
  });

  it("Given 0x31 50 51 with the base at 10, When read, Then it is an error at 0x31", () => {
    expect(bytes("0x31 50 51", 10)).toEqual({ ok: false, error: { code: "hexInDecimal", at: { line: 1, column: 1 } } });
  });

  it("Given 256 with the base at 10, When read, Then it is an error at 256 for being above 255", () => {
    expect(bytes("256", 10)).toEqual({ ok: false, error: { code: "tooWide", width: 8, at: { line: 1, column: 1 } } });
  });

  it.each(["31 32 33", "313233", "3132 33"])("Given %s, When read, Then it is bytes 31 32 33", (text) => {
    expect(bytes(text)).toEqual({ ok: true, value: [[0x31, 0x32, 0x33]] });
  });

  it.each(["0x31, 0x32, 0x33", "{0x31, 0x32, 0x33}"])("Given %s, When read, Then it is bytes 31 32 33", (text) => {
    expect(bytes(text)).toEqual({ ok: true, value: [[0x31, 0x32, 0x33]] });
  });

  it("Given 0x1021 0x31 with the element at 8, When read, Then it is an error at 0x1021 for being above 0xFF", () => {
    expect(bytes("0x1021 0x31")).toEqual({ ok: false, error: { code: "tooWide", width: 8, at: { line: 1, column: 1 } } });
  });

  it("Given {0x1021, 0x0031} with the element at 16 LE, When read, Then it is bytes 21 10 31 00", () => {
    expect(bytes("{0x1021, 0x0031}", 16, { bits: 16, order: "le" })).toEqual({ ok: true, value: [[0x21, 0x10, 0x31, 0x00]] });
  });

  it("Given 1021 31 with the element at 16 BE, When read, Then it is bytes 10 21 00 31", () => {
    expect(bytes("1021 31", 16, { bits: 16, order: "be" })).toEqual({ ok: true, value: [[0x10, 0x21, 0x00, 0x31]] });
  });

  it("Given 0x12345678 with the element at 32 BE, When read, Then it is bytes 12 34 56 78", () => {
    expect(bytes("0x12345678", 16, { bits: 32, order: "be" })).toEqual({ ok: true, value: [[0x12, 0x34, 0x56, 0x78]] });
  });

  it("Given 0x12345 with the element at 16 BE, When read, Then it is an error at 0x12345 for being above 0xFFFF", () => {
    expect(bytes("0x12345", 16, { bits: 16, order: "be" })).toEqual({
      ok: false,
      error: { code: "tooWide", width: 16, at: { line: 1, column: 1 } },
    });
  });

  it("Given {4129, 49} with the base at 10 and the element at 16 LE, When read, Then it is bytes 21 10 31 00", () => {
    expect(bytes("{4129, 49}", 10, { bits: 16, order: "le" })).toEqual({ ok: true, value: [[0x21, 0x10, 0x31, 0x00]] });
  });

  it("Given {0x3, 0x31}, When read, Then it is bytes 03 31", () => {
    expect(bytes("{0x3, 0x31}")).toEqual({ ok: true, value: [[0x03, 0x31]] });
  });

  it("Given 313 233, When read, Then it is an error at 313 for its odd number of digits", () => {
    expect(bytes("313 233")).toEqual({ ok: false, error: { code: "oddHex", at: { line: 1, column: 1 } } });
  });

  it("Given 0x1021u, When read, Then it is an error at u in column 7", () => {
    expect(bytes("0x1021u")).toEqual({ ok: false, error: { code: "badChar", at: { line: 1, column: 7 } } });
  });

  it("Given crc=0x29B1, When read, Then it is an error at r in column 2", () => {
    expect(bytes("crc=0x29B1")).toEqual({ ok: false, error: { code: "badChar", at: { line: 1, column: 2 } } });
  });

  it("Given uint8_t msg[] = {0x31, 0x32};, When read, Then it is an error at u in column 1", () => {
    expect(bytes("uint8_t msg[] = {0x31, 0x32};")).toEqual({ ok: false, error: { code: "badChar", at: { line: 1, column: 1 } } });
  });

  it("Given a hexdump line with its character column, When read, Then it is an error at | in column 21", () => {
    expect(bytes("00000000  31 32 33  |123|")).toEqual({ ok: false, error: { code: "badChar", at: { line: 1, column: 21 } } });
  });
});

describe("readValues: the rows of the table in spec chapter 2, Reading pasted text", () => {
  it("Given [0x0000, 0x1021, 0x2042] in width 16, When read, Then it is the values 0x0000 0x1021 0x2042", () => {
    expect(readValues("[0x0000, 0x1021, 0x2042]", 16, 16)).toEqual({ ok: true, value: [0x0000n, 0x1021n, 0x2042n] });
  });
});

describe("readBytes: frames and positions", () => {
  it("Given several lines, When read, Then each non-blank line is one frame", () => {
    expect(bytes("31 32\n\n33")).toEqual({ ok: true, value: [[0x31, 0x32], [0x33]] });
  });

  it("Given brackets that span lines, When read, Then each line with a number is still one frame", () => {
    expect(bytes("{\n0x31, 0x32,\n0x33\n}")).toEqual({ ok: true, value: [[0x31, 0x32], [0x33]] });
  });

  it("Given an error on a later line, When read, Then its line and column are given", () => {
    expect(bytes("31 32\r\n  33 zz")).toEqual({ ok: false, error: { code: "badChar", at: { line: 2, column: 6 } } });
  });

  it("Given 0x with no digits after it, When read, Then the x is the error", () => {
    expect(bytes("0x")).toEqual({ ok: false, error: { code: "badChar", at: { line: 1, column: 2 } } });
  });

  it("Given 0X in capitals and ; as a separator, When read, Then they are read like 0x and a comma", () => {
    expect(bytes("0X31;0x32")).toEqual({ ok: true, value: [[0x31, 0x32]] });
  });

  it("Given 32 LE, When read, Then the low byte comes first", () => {
    expect(bytes("0x12345678", 16, { bits: 32, order: "le" })).toEqual({ ok: true, value: [[0x78, 0x56, 0x34, 0x12]] });
  });

  it("Given blank text, When read, Then there are no frames", () => {
    expect(bytes(" \n ,; ")).toEqual({ ok: true, value: [] });
  });
});

describe("readValue", () => {
  it("Given one number in brackets, When read, Then it is that value", () => {
    expect(readValue("{0x1021}", 16, 16)).toEqual({ ok: true, value: 0x1021n });
  });

  it("Given a number above width bits, When read, Then it is an error at that number", () => {
    expect(readValue("  0x8", 16, 3)).toEqual({ ok: false, error: { code: "tooWide", width: 3, at: { line: 1, column: 3 } } });
  });

  it("Given two numbers, When read, Then the second one is an error", () => {
    expect(readValue("10 21", 16, 16)).toEqual({ ok: false, error: { code: "oneValue", at: { line: 1, column: 4 } } });
  });

  it("Given no number, When read, Then it is an error with no position", () => {
    expect(readValue("  ", 16, 16)).toEqual({ ok: false, error: { code: "notHex" } });
  });
});

describe("readCrc: a CRC given as one number or as its bytes", () => {
  it("Given one number, When read, Then it is the CRC whatever the byte order", () => {
    expect(readCrc("0x29B1", 16, E8, "le", 16)).toEqual({ ok: true, value: 0x29b1n });
  });

  it.each([
    ["29 B1", "be"],
    ["B1 29", "le"],
    ["{0xB1, 0x29}", "le"],
  ] as const)("Given the bytes %s read %s, When read, Then the CRC is 0x29B1", (text, order) => {
    expect(readCrc(text, 16, E8, order, 16)).toEqual({ ok: true, value: 0x29b1n });
  });

  it("Given 3 bytes for a width of 16, When read, Then it is an error that asks for 2 bytes", () => {
    expect(readCrc("29 B1 00", 16, E8, "be", 16)).toEqual({ ok: false, error: { code: "crcBytes", expected: 2 } });
  });

  it("Given 2 bytes above 12 bits for a width of 12, When read, Then it is an error at the first number", () => {
    expect(readCrc("FF FF", 16, E8, "be", 12)).toEqual({
      ok: false,
      error: { code: "tooWide", width: 12, at: { line: 1, column: 1 } },
    });
  });

  it("Given no number, When read, Then there is no CRC to compare", () => {
    expect(readCrc(" ", 16, E8, "be", 16)).toEqual({ ok: false, error: { code: "notHex" } });
  });
});
