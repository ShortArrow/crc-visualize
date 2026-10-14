import { describe, expect, it } from "vitest";
import { PARAM_NAMES, trace, type CrcParams, type Step } from "../domain/trace";
import { bits, firstStep, plain3, stepOf } from "../testing/fixtures";
import { ja } from "../i18n/ja";
import { codeLines, type CodeLine, type ParamChip } from "./code";

/** refin・refout・xorout が全て有効な CRC-3。 */
const full3: CrcParams = { ...plain3, refin: true, refout: true, xorout: 7 };
const initStep = (params: CrcParams) => trace(params, [])[0]!;
const texts = (lines: CodeLine[]) => lines.map((l) => l.text.trim());
const chips = (line: CodeLine) => line.parts.filter((p): p is ParamChip => typeof p !== "string");
const activeText = (params: CrcParams, step: Step) => texts(codeLines(params, step, ja).filter((l) => l.active));
const ifLine = (step: Step) => codeLines(plain3, step, ja).find((l) => l.text.includes("if (feedback == 1)"))!;
const xorBody = (step: Step) => codeLines(plain3, step, ja).find((l) => l.text.trim() === "crc ^= poly;")!;

describe("codeLines", () => {
  it("Given init 5 の CRC-3, When コードを組み立てる, Then パラメータは名前で書き、チップに値を持たせる", () => {
    const lines = codeLines({ ...plain3, init: 5 }, initStep(plain3), ja);

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
    expect(chipOf("feedback = ((crc >> (width - 1)) & 1) ^ bit;")).toEqual([{ param: "width", label: "width", value: "3" }]);
  });

  it.each([
    ["refin・refout・xorout が全て無効", plain3],
    ["refin・refout・xorout が全て有効", full3],
  ])("Given %s, When コードを組み立てる, Then 6 つのパラメータはどれもコードのどこかに現れる", (_, params) => {
    const used = new Set(codeLines(params, initStep(params), ja).flatMap((l) => chips(l).map((c) => c.param)));

    expect([...used].sort()).toEqual([...PARAM_NAMES].sort());
  });

  it("Given refin・refout・xorout が全て無効, When コードを組み立てる, Then それらの行は消さず、理由を添えて disabled で残す", () => {
    const disabled = codeLines(plain3, initStep(plain3), ja).filter((l) => l.disabled);

    expect(disabled.map((l) => chips(l)[0]!.param)).toEqual(["refin", "refout", "xorout"]);
    expect(disabled.every((l) => l.note !== undefined)).toBe(true);
  });

  it("Given refin・refout・xorout が全て有効, When コードを組み立てる, Then それらは disabled でない処理の行になる", () => {
    const lines = codeLines(full3, initStep(full3), ja);

    expect(lines.some((l) => l.disabled)).toBe(false);
    expect(texts(lines)).toEqual(
      expect.arrayContaining(["if (refin) byte = reflect(byte, 8);", "if (refout) crc = reflect(crc, width);", "crc ^= xorout;"]),
    );
  });

  it("Given refin・refout・xorout が全て有効, When 各種類のステップを表示する, Then 対応する 1 行だけが現在行になる", () => {
    const steps = trace(full3, bits("10000000"));

    const active = (kind: Step["kind"]) => activeText(full3, stepOf(steps, kind));

    expect(active("init")).toEqual(["crc = init;"]);
    expect(active("reflectIn")).toEqual(["if (refin) byte = reflect(byte, 8);"]);
    expect(active("feedback")).toEqual(["feedback = ((crc >> (width - 1)) & 1) ^ bit;"]);
    expect(active("shift")).toEqual(["crc = (crc << 1) & mask;"]);
    expect(active("xor")).toEqual(["crc ^= poly;"]);
    expect(active("reflectOut")).toEqual(["if (refout) crc = reflect(crc, width);"]);
    expect(active("xorOut")).toEqual(["crc ^= xorout;"]);
    expect(active("done")).toEqual(["return crc;"]);
  });

  it("Given init 100 の CRC-3 に 0 を流した feedback ステップ, When コードを組み立てる, Then feedback の行に 最上位ビット ⊕ 入力ビット の結果を注記する", () => {
    const step = firstStep({ ...plain3, init: 4 }, "0", "feedback");

    expect(codeLines(plain3, step, ja).find((l) => l.active)!.note).toBe("msb 1 ⊕ bit 0 = feedback 1");
  });

  it("Given feedback 1 のクロックの shift ステップ, When コードを組み立てる, Then if は true で、本体は飛ばさない", () => {
    const taken = firstStep(plain3, "1", "shift");

    expect(ifLine(taken)).toMatchObject({ note: "true" });
    expect(xorBody(taken).skipped).toBe(false);
  });

  it("Given feedback 0 のクロックの shift ステップ, When コードを組み立てる, Then if は false で、本体を飛ばしたと示す", () => {
    const skipped = firstStep(plain3, "0", "shift");

    expect(ifLine(skipped)).toMatchObject({ note: "false" });
    expect(xorBody(skipped).skipped).toBe(true);
  });
});
