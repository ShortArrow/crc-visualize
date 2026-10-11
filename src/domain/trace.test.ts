import { describe, expect, it } from "vitest";
import { bits, plain3 } from "../testing/fixtures";
import { PRESETS, TUTORIAL } from "./presets";
import { bitsFromBytes, reflectValue, registerValue, trace, type Bit, type CrcParams } from "./trace";

const ascii = (s: string): Bit[] => bitsFromBytes([...new TextEncoder().encode(s)]);
const crcOf = (params: CrcParams, input: readonly Bit[]): number => registerValue(trace(params, input).at(-1)!.reg);

/** init 100 の CRC-3（r[2] = 1）。 */
const msbSet: CrcParams = { ...plain3, init: 0b100 };

describe("reflectValue", () => {
  it.each([
    [0x8005, 16, 0xa001],
    [0x04c11db7, 32, 0xedb88320],
    [0b011, 3, 0b110],
  ])("Given 値と幅, When 0x%s を %i ビットで反転する, Then %s になる", (value, width, expected) => {
    expect(reflectValue(value, width)).toBe(expected);
  });
});

describe("trace", () => {
  it("Given 教材設定 CRC-3/TUTORIAL, When 10101 を流す, Then CRC は 101", () => {
    expect(crcOf(TUTORIAL.params, bits("10101"))).toBe(0b101);
  });

  it.each(PRESETS)("Given プリセット $name, When 123456789 を流す, Then CRC が検査値と一致する", ({ params, check }) => {
    expect(crcOf(params, ascii("123456789"))).toBe(check);
  });

  it("Given CRC-3 で init 110, When 1 を流す, Then 最初のステップは init をレジスタに入れる", () => {
    const [first] = trace({ ...plain3, init: 0b110 }, bits("1"));

    expect(first).toMatchObject({ kind: "init", cursor: 0 });
    expect(registerValue(first!.reg)).toBe(0b110);
  });

  it("Given CRC-3 で init 100（r[2] = 1）, When 1 を流す, Then feedback は msb 1 XOR 入力ビット 1 = 0 で、レジスタは変わらない", () => {
    const feedback = trace(msbSet, bits("1")).find((s) => s.kind === "feedback");

    expect(feedback).toMatchObject({ inBit: 1, msb: 1, fb: 0, cursor: 0 });
    expect(registerValue(feedback!.reg)).toBe(0b100);
  });

  it("Given CRC-3 で init 100（r[2] = 1）, When 00 を流す, Then 各 shift は桁あふれで抜けた元の r[2] を持つ", () => {
    const shifts = trace(msbSet, bits("00")).filter((s) => s.kind === "shift");

    expect(shifts.map((s) => s.dropped)).toEqual([1, 0]);
  });

  it("Given CRC-3 で init 100（r[2] = 1）, When 何も流さない, Then レジスタは r[0] から r[2] の順に並ぶ", () => {
    const [first] = trace(msbSet, []);

    expect(first!.reg).toEqual([0, 0, 1]);
  });

  it("Given CRC-3 で init 000, When feedback 1 になる 1 を流す, Then shift の後に xor が続き、cursor が進む", () => {
    const steps = trace(plain3, bits("1"));

    expect(steps.map((s) => s.kind)).toEqual(["init", "feedback", "shift", "xor", "done"]);
    const [, , shift, xor] = steps;
    expect(registerValue(shift!.reg)).toBe(0b000);
    expect(shift!.cursor).toBe(1);
    expect(registerValue(xor!.reg)).toBe(0b011);
  });

  it("Given CRC-3 で init 001, When feedback 0 になる 0 を流す, Then xor ステップを置かず shift で終わる", () => {
    const steps = trace({ ...plain3, init: 0b001 }, bits("0"));

    expect(steps.map((s) => s.kind)).toEqual(["init", "feedback", "shift", "done"]);
    expect(registerValue(steps[2]!.reg)).toBe(0b010);
  });

  it("Given CRC-3 で refout あり・xorout 111, When 1 を流す, Then 値が変わる reflectOut と xorOut がステップになる", () => {
    const steps = trace({ ...plain3, refout: true, xorout: 0b111 }, bits("1"));

    expect(steps.slice(-3).map((s) => s.kind)).toEqual(["reflectOut", "xorOut", "done"]);
    expect(steps.slice(-3).map((s) => registerValue(s.reg))).toEqual([0b110, 0b001, 0b001]);
  });

  it("Given 8 ビット CRC で refin あり, When 2 バイト流す, Then バイトごとに reflectIn を置き、表示するストリームのそのバイトを反転する", () => {
    const params: CrcParams = { width: 8, poly: 0x07, init: 0, refin: true, refout: false, xorout: 0 };
    const input = bits("1100000010000000");

    const steps = trace(params, input);

    const reflects = steps.filter((s) => s.kind === "reflectIn");
    expect(reflects.map((s) => s.byteIndex)).toEqual([0, 1]);
    expect(steps[0]!.stream).toEqual(input);
    expect(reflects[0]!.stream).toEqual(bits("0000001110000000"));
    expect(reflects[1]!.stream).toEqual(bits("0000001100000001"));
  });

  it("Given width 32 で init 0xFFFFFFFF, When 何も流さない, Then 値の符号が崩れない", () => {
    const params: CrcParams = { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: false, refout: false, xorout: 0 };

    expect(crcOf(params, [])).toBe(0xffffffff);
  });
});
