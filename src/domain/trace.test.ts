import { describe, expect, it } from "vitest";
import { PRESETS, TUTORIAL } from "./presets";
import { bitsFromBytes, reflectValue, registerValue, trace, type Bit, type CrcParams } from "./trace";

const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const ascii = (s: string): Bit[] => bitsFromBytes([...new TextEncoder().encode(s)]);
const finalValue = (params: CrcParams, input: readonly Bit[]): number =>
  registerValue(trace(params, input).at(-1)!.reg);

const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };

describe("reflectValue", () => {
  it.each([
    [0x8005, 16, 0xa001],
    [0x04c11db7, 32, 0xedb88320],
    [0b011, 3, 0b110],
  ])("0x%s を %i ビットで反転すると %s", (value, width, expected) => {
    expect(reflectValue(value, width)).toBe(expected);
  });
});

describe("trace", () => {
  it("教材設定で 10101 の CRC は 101", () => {
    expect(finalValue(TUTORIAL.params, bits("10101"))).toBe(0b101);
  });

  it.each(PRESETS)("$name: 123456789 の CRC が check 値と一致する", ({ params, check }) => {
    expect(finalValue(params, ascii("123456789"))).toBe(check);
  });

  it("最初のステップは init をレジスタに入れる", () => {
    const [first] = trace({ ...plain3, init: 0b110 }, bits("1"));
    expect(first).toMatchObject({ kind: "init", cursor: 0 });
    expect(registerValue(first!.reg)).toBe(0b110);
  });

  it("feedback は msb XOR 入力ビットを決め、レジスタを変えない", () => {
    const steps = trace({ ...plain3, init: 0b100 }, bits("1"));
    const feedback = steps.find((s) => s.kind === "feedback");
    expect(feedback).toMatchObject({ inBit: 1, msb: 1, fb: 0, cursor: 0 });
    expect(registerValue(feedback!.reg)).toBe(0b100);
  });

  it("fb = 1 のクロックは shift の後に xor が続き、cursor が進む", () => {
    const steps = trace(plain3, bits("1"));
    expect(steps.map((s) => s.kind)).toEqual(["init", "feedback", "shift", "xor", "done"]);
    const [, , shift, xor] = steps;
    expect(registerValue(shift!.reg)).toBe(0b000);
    expect(shift!.cursor).toBe(1);
    expect(registerValue(xor!.reg)).toBe(0b011);
  });

  it("shift は桁あふれで抜けた元の r[width-1] を持つ", () => {
    const shifts = trace({ ...plain3, init: 0b100 }, bits("00")).filter((s) => s.kind === "shift");
    expect(shifts.map((s) => s.dropped)).toEqual([1, 0]);
  });

  it("fb = 0 のクロックには xor ステップを置かない", () => {
    const steps = trace({ ...plain3, init: 0b001 }, bits("0"));
    expect(steps.map((s) => s.kind)).toEqual(["init", "feedback", "shift", "done"]);
    expect(registerValue(steps[2]!.reg)).toBe(0b010);
  });

  it("refout と xorout は値が変わるときだけステップになる", () => {
    const steps = trace({ ...plain3, refout: true, xorout: 0b111 }, bits("1"));
    expect(steps.slice(-3).map((s) => s.kind)).toEqual(["reflectOut", "xorOut", "done"]);
    expect(steps.slice(-3).map((s) => registerValue(s.reg))).toEqual([0b110, 0b001, 0b001]);
  });

  it("refin はバイトごとに reflectIn ステップを置き、表示ストリームのそのバイトを反転する", () => {
    const params: CrcParams = { width: 8, poly: 0x07, init: 0, refin: true, refout: false, xorout: 0 };
    const input = bits("1100000010000000");
    const steps = trace(params, input);
    const reflects = steps.filter((s) => s.kind === "reflectIn");
    expect(reflects.map((s) => s.byteIndex)).toEqual([0, 1]);
    expect(steps[0]!.stream).toEqual(input);
    expect(reflects[0]!.stream).toEqual(bits("0000001110000000"));
    expect(reflects[1]!.stream).toEqual(bits("0000001100000001"));
  });

  it("レジスタは r[0] から r[width-1] の順に並ぶ", () => {
    const [first] = trace({ ...plain3, init: 0b100 }, []);
    expect(first!.reg).toEqual([0, 0, 1]);
  });

  it("width 32 でも符号が崩れない", () => {
    const p: CrcParams = { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: false, refout: false, xorout: 0 };
    expect(registerValue(trace(p, []).at(-1)!.reg)).toBe(0xffffffff);
  });
});
