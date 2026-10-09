import { describe, expect, it } from "vitest";
import { trace, type Bit, type CrcParams, type Step } from "../domain/trace";
import { codeLines } from "./code";

const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };
const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const stepOf = (steps: Step[], kind: Step["kind"]) => steps.find((s) => s.kind === kind)!;
const activeText = (params: CrcParams, step: Step) =>
  codeLines(params, step)
    .filter((l) => l.active)
    .map((l) => l.text.trim());

describe("codeLines", () => {
  it("定数は設定値で埋める", () => {
    const text = codeLines({ ...plain3, init: 5 }, trace(plain3, [])[0]!).map((l) => l.text.trim());
    expect(text).toEqual(
      expect.arrayContaining(["crc = 0x5;", "fb  = ((crc >> 2) & 1) ^ b;", "crc = (crc << 1) & 0x7;", "crc ^= 0x3;"]),
    );
  });

  it("refout・xorout・refin の行は設定が有効なときだけ出す", () => {
    const step = trace(plain3, [])[0]!;
    const plain = codeLines(plain3, step).map((l) => l.text);
    expect(plain.some((t) => t.includes("reflect"))).toBe(false);
    expect(plain.some((t) => t.includes("XOROUT") || t.includes("crc ^= 0x0"))).toBe(false);
    const full = codeLines({ ...plain3, refin: true, refout: true, xorout: 7 }, step).map((l) => l.text.trim());
    expect(full).toEqual(expect.arrayContaining(["byte = reflect(byte, 8);", "crc = reflect(crc, 3);", "crc ^= 0x7;"]));
  });

  it("各ステップは対応する 1 行だけをハイライトする", () => {
    const params = { ...plain3, refin: true, refout: true, xorout: 7 };
    const steps = trace(params, bits("10000000"));
    expect(activeText(params, stepOf(steps, "init"))).toEqual(["crc = 0x0;"]);
    expect(activeText(params, stepOf(steps, "reflectIn"))).toEqual(["byte = reflect(byte, 8);"]);
    expect(activeText(params, stepOf(steps, "feedback"))).toEqual(["fb  = ((crc >> 2) & 1) ^ b;"]);
    expect(activeText(params, stepOf(steps, "shift"))).toEqual(["crc = (crc << 1) & 0x7;"]);
    expect(activeText(params, stepOf(steps, "xor"))).toEqual(["crc ^= 0x3;"]);
    expect(activeText(params, stepOf(steps, "reflectOut"))).toEqual(["crc = reflect(crc, 3);"]);
    expect(activeText(params, stepOf(steps, "xorOut"))).toEqual(["crc ^= 0x7;"]);
    expect(activeText(params, stepOf(steps, "done"))).toEqual(["return crc;"]);
  });

  it("feedback 行には計算結果を注記する", () => {
    const step = stepOf(trace({ ...plain3, init: 4 }, bits("0")), "feedback");
    expect(codeLines(plain3, step).find((l) => l.active)!.note).toBe("fb = 1 ^ 0 = 1");
  });

  it("shift ステップでは if の評価結果を示し、fb = 0 なら本体を飛ばしたと示す", () => {
    const taken = stepOf(trace(plain3, bits("1")), "shift");
    const skipped = stepOf(trace(plain3, bits("0")), "shift");
    const ifLine = (step: Step) => codeLines(plain3, step).find((l) => l.text.includes("if (fb == 1)"))!;
    const body = (step: Step) => codeLines(plain3, step).find((l) => l.text.trim() === "crc ^= 0x3;")!;
    expect(ifLine(taken)).toMatchObject({ note: "true" });
    expect(body(taken).skipped).toBe(false);
    expect(ifLine(skipped)).toMatchObject({ note: "false" });
    expect(body(skipped).skipped).toBe(true);
  });
});
