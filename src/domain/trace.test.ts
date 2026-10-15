import { describe, expect, it } from "vitest";
import { bits, plain3 } from "../testing/fixtures";
import { PRESETS, TUTORIAL } from "./presets";
import { bitsFromBytes, reflectValue, registerValue, trace, type Bit, type CrcParams } from "./trace";

const ascii = (s: string): Bit[] => bitsFromBytes([...new TextEncoder().encode(s)]);
const crcOf = (params: CrcParams, input: readonly Bit[]): number => registerValue(trace(params, input).at(-1)!.reg);

/** CRC-3 with init 100 (r[2] = 1). */
const msbSet: CrcParams = { ...plain3, init: 0b100 };

describe("reflectValue", () => {
  it.each([
    [0x8005, 16, 0xa001],
    [0x04c11db7, 32, 0xedb88320],
    [0b011, 3, 0b110],
  ])("Given a value and width, When 0x%s is reflected over %i bits, Then it becomes %s", (value, width, expected) => {
    expect(reflectValue(value, width)).toBe(expected);
  });
});

describe("trace", () => {
  it("Given the tutorial preset CRC-3/TUTORIAL, When 10101 is fed, Then the CRC is 101", () => {
    expect(crcOf(TUTORIAL.params, bits("10101"))).toBe(0b101);
  });

  it.each(PRESETS)("Given preset $name, When 123456789 is fed, Then the CRC matches the check value", ({ params, check }) => {
    expect(crcOf(params, ascii("123456789"))).toBe(check);
  });

  it("Given CRC-3 with init 110, When 1 is fed, Then the first step loads init into the register", () => {
    const [first] = trace({ ...plain3, init: 0b110 }, bits("1"));

    expect(first).toMatchObject({ kind: "init", cursor: 0 });
    expect(registerValue(first!.reg)).toBe(0b110);
  });

  it("Given CRC-3 with init 100 (r[2] = 1), When 1 is fed, Then feedback is msb 1 XOR input bit 1 = 0 and the register is unchanged", () => {
    const feedback = trace(msbSet, bits("1")).find((s) => s.kind === "feedback");

    expect(feedback).toMatchObject({ inBit: 1, msb: 1, fb: 0, cursor: 0 });
    expect(registerValue(feedback!.reg)).toBe(0b100);
  });

  it("Given CRC-3 with init 100 (r[2] = 1), When 00 is fed, Then each shift carries the original r[2] that overflowed out", () => {
    const shifts = trace(msbSet, bits("00")).filter((s) => s.kind === "shift");

    expect(shifts.map((s) => s.dropped)).toEqual([1, 0]);
  });

  it("Given CRC-3 with init 100 (r[2] = 1), When nothing is fed, Then the register is ordered r[0] to r[2]", () => {
    const [first] = trace(msbSet, []);

    expect(first!.reg).toEqual([0, 0, 1]);
  });

  it("Given CRC-3 with init 000, When 1 is fed giving feedback 1, Then xor follows shift and cursor advances", () => {
    const steps = trace(plain3, bits("1"));

    expect(steps.map((s) => s.kind)).toEqual(["init", "feedback", "shift", "xor", "done"]);
    const [, , shift, xor] = steps;
    expect(registerValue(shift!.reg)).toBe(0b000);
    expect(shift!.cursor).toBe(1);
    expect(registerValue(xor!.reg)).toBe(0b011);
  });

  it("Given CRC-3 with init 001, When 0 is fed giving feedback 0, Then there is no xor step and it ends with shift", () => {
    const steps = trace({ ...plain3, init: 0b001 }, bits("0"));

    expect(steps.map((s) => s.kind)).toEqual(["init", "feedback", "shift", "done"]);
    expect(registerValue(steps[2]!.reg)).toBe(0b010);
  });

  it("Given CRC-3 with refout on and xorout 111, When 1 is fed, Then reflectOut and xorOut, which change the value, become steps", () => {
    const steps = trace({ ...plain3, refout: true, xorout: 0b111 }, bits("1"));

    expect(steps.slice(-3).map((s) => s.kind)).toEqual(["reflectOut", "xorOut", "done"]);
    expect(steps.slice(-3).map((s) => registerValue(s.reg))).toEqual([0b110, 0b001, 0b001]);
  });

  it("Given an 8-bit CRC with refin on, When 2 bytes are fed, Then each byte gets a reflectIn and that byte is reflected in the displayed stream", () => {
    const params: CrcParams = { width: 8, poly: 0x07, init: 0, refin: true, refout: false, xorout: 0 };
    const input = bits("1100000010000000");

    const steps = trace(params, input);

    const reflects = steps.filter((s) => s.kind === "reflectIn");
    expect(reflects.map((s) => s.byteIndex)).toEqual([0, 1]);
    expect(steps[0]!.stream).toEqual(input);
    expect(reflects[0]!.stream).toEqual(bits("0000001110000000"));
    expect(reflects[1]!.stream).toEqual(bits("0000001100000001"));
  });

  it("Given width 32 with init 0xFFFFFFFF, When nothing is fed, Then the value keeps its sign intact", () => {
    const params: CrcParams = { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: false, refout: false, xorout: 0 };

    expect(crcOf(params, [])).toBe(0xffffffff);
  });
});
