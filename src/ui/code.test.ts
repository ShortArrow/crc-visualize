import { describe, expect, it } from "vitest";
import { PARAM_NAMES, trace, type Bit, type CrcParams, type Step } from "../domain/trace";
import { codeLines, type CodeLine, type ParamChip } from "./code";

const plain3: CrcParams = { width: 3, poly: 0b011, init: 0, refin: false, refout: false, xorout: 0 };
const full3: CrcParams = { ...plain3, refin: true, refout: true, xorout: 7 };
const bits = (s: string): Bit[] => [...s].map((c) => (c === "1" ? 1 : 0));
const stepOf = (steps: Step[], kind: Step["kind"]) => steps.find((s) => s.kind === kind)!;
const initStep = (params: CrcParams) => trace(params, [])[0]!;
const texts = (lines: CodeLine[]) => lines.map((l) => l.text.trim());
const chips = (line: CodeLine) => line.parts.filter((p): p is ParamChip => typeof p !== "string");
const activeText = (params: CrcParams, step: Step) => texts(codeLines(params, step).filter((l) => l.active));

describe("codeLines", () => {
  it("パラメータは名前で書き、チップに値を持たせる", () => {
    const lines = codeLines({ ...plain3, init: 5 }, initStep(plain3));
    expect(texts(lines)).toEqual(
      expect.arrayContaining([
        "crc = init;",
        "feedback = ((crc >> (width - 1)) & 1) ^ bit;",
        "crc = (crc << 1) & mask;",
        "crc ^= poly;",
      ]),
    );
    const chipOf = (text: string) => chips(lines.find((l) => l.text.trim() === text)!);
    expect(chipOf("crc = init;")).toEqual([{ param: "init", label: "init", value: "0x5" }]);
    expect(chipOf("crc ^= poly;")).toEqual([{ param: "poly", label: "poly", value: "0x3" }]);
    expect(chipOf("crc = (crc << 1) & mask;")).toEqual([{ param: "width", label: "mask", value: "0x7" }]);
    expect(chipOf("feedback = ((crc >> (width - 1)) & 1) ^ bit;")).toEqual([
      { param: "width", label: "width", value: "3" },
    ]);
  });

  it.each([
    ["すべて無効", plain3],
    ["すべて有効", full3],
  ])("%s: 6 つのパラメータはどれもコードのどこかに現れる", (_, params) => {
    const used = new Set(codeLines(params, initStep(params)).flatMap((l) => chips(l).map((c) => c.param)));
    expect([...used].sort()).toEqual([...PARAM_NAMES].sort());
  });

  it("無効なパラメータの行は消さずに disabled で残す", () => {
    const disabled = codeLines(plain3, initStep(plain3)).filter((l) => l.disabled);
    expect(disabled.map((l) => chips(l)[0]!.param)).toEqual(["refin", "refout", "xorout"]);
    expect(disabled.every((l) => l.note !== undefined)).toBe(true);
    expect(codeLines(full3, initStep(full3)).some((l) => l.disabled)).toBe(false);
  });

  it("有効なら refin・refout・xorout の処理行になる", () => {
    expect(texts(codeLines(full3, initStep(full3)))).toEqual(
      expect.arrayContaining(["if (refin) byte = reflect(byte, 8);", "if (refout) crc = reflect(crc, width);", "crc ^= xorout;"]),
    );
  });

  it("各ステップは対応する 1 行だけをハイライトする", () => {
    const steps = trace(full3, bits("10000000"));
    expect(activeText(full3, stepOf(steps, "init"))).toEqual(["crc = init;"]);
    expect(activeText(full3, stepOf(steps, "reflectIn"))).toEqual(["if (refin) byte = reflect(byte, 8);"]);
    expect(activeText(full3, stepOf(steps, "feedback"))).toEqual(["feedback = ((crc >> (width - 1)) & 1) ^ bit;"]);
    expect(activeText(full3, stepOf(steps, "shift"))).toEqual(["crc = (crc << 1) & mask;"]);
    expect(activeText(full3, stepOf(steps, "xor"))).toEqual(["crc ^= poly;"]);
    expect(activeText(full3, stepOf(steps, "reflectOut"))).toEqual(["if (refout) crc = reflect(crc, width);"]);
    expect(activeText(full3, stepOf(steps, "xorOut"))).toEqual(["crc ^= xorout;"]);
    expect(activeText(full3, stepOf(steps, "done"))).toEqual(["return crc;"]);
  });

  it("feedback 行には 最上位ビット ⊕ 入力ビット の計算結果を注記する", () => {
    const step = stepOf(trace({ ...plain3, init: 4 }, bits("0")), "feedback");
    expect(codeLines(plain3, step).find((l) => l.active)!.note).toBe("msb 1 ⊕ bit 0 = feedback 1");
  });

  it("shift ステップでは if の評価結果を示し、feedback = 0 なら本体を飛ばしたと示す", () => {
    const taken = stepOf(trace(plain3, bits("1")), "shift");
    const skipped = stepOf(trace(plain3, bits("0")), "shift");
    const ifLine = (step: Step) => codeLines(plain3, step).find((l) => l.text.includes("if (feedback == 1)"))!;
    const body = (step: Step) => codeLines(plain3, step).find((l) => l.text.trim() === "crc ^= poly;")!;
    expect(ifLine(taken)).toMatchObject({ note: "true" });
    expect(body(taken).skipped).toBe(false);
    expect(ifLine(skipped)).toMatchObject({ note: "false" });
    expect(body(skipped).skipped).toBe(true);
  });
});
