import { describe, expect, it } from "vitest";
import { PARAM_NAMES, trace, type CrcParams, type Step } from "../domain/trace";
import { bits, firstStep, plain3, stepOf } from "../testing/fixtures";
import { ja } from "../i18n/ja";
import { CODE_LANGS, codeLines, type CodeLang, type CodeLine, type ParamChip } from "./code";

/** refin・refout・xorout が全て有効な CRC-3。 */
const full3: CrcParams = { ...plain3, refin: true, refout: true, xorout: 7 };
const initStep = (params: CrcParams) => trace(params, [])[0]!;
const texts = (lines: CodeLine[]) => lines.map((l) => l.text.trim());
const chips = (line: CodeLine) => line.parts.filter((p): p is ParamChip => typeof p !== "string");
const activeText = (params: CrcParams, step: Step) => texts(codeLines(params, step, ja, "pseudo").filter((l) => l.active));
const ifLine = (step: Step) => codeLines(plain3, step, ja, "pseudo").find((l) => l.text.includes("if (feedback == 1)"))!;
const xorBody = (step: Step) => codeLines(plain3, step, ja, "pseudo").find((l) => l.text.trim() === "crc ^= poly;")!;

describe("codeLines", () => {
  it("Given init 5 の CRC-3, When コードを組み立てる, Then パラメータは名前で書き、チップに値を持たせる", () => {
    const lines = codeLines({ ...plain3, init: 5 }, initStep(plain3), ja, "pseudo");

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
    const used = new Set(codeLines(params, initStep(params), ja, "pseudo").flatMap((l) => chips(l).map((c) => c.param)));

    expect([...used].sort()).toEqual([...PARAM_NAMES].sort());
  });

  it("Given refin・refout・xorout が全て無効, When コードを組み立てる, Then それらの行は消さず、理由を添えて disabled で残す", () => {
    const disabled = codeLines(plain3, initStep(plain3), ja, "pseudo").filter((l) => l.disabled);

    expect(disabled.map((l) => chips(l)[0]!.param)).toEqual(["refin", "refout", "xorout"]);
    expect(disabled.every((l) => l.note !== undefined)).toBe(true);
  });

  it("Given refin・refout・xorout が全て有効, When コードを組み立てる, Then それらは disabled でない処理の行になる", () => {
    const lines = codeLines(full3, initStep(full3), ja, "pseudo");

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

    expect(codeLines(plain3, step, ja, "pseudo").find((l) => l.active)!.note).toBe("msb 1 ⊕ bit 0 = feedback 1");
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

const LANG_IDS = Object.keys(CODE_LANGS) as CodeLang[];
const STEP_KINDS: readonly Step["kind"][] = ["init", "reflectIn", "feedback", "shift", "xor", "reflectOut", "xorOut", "done"];

describe("CODE_LANGS", () => {
  it.each(LANG_IDS.flatMap((lang) => [[lang, "全て無効", plain3] as const, [lang, "全て有効", full3] as const]))(
    "Given 言語 %s で refin・refout・xorout が%s, When 全てのステップを表示する, Then どのステップでもちょうど 1 行が現在行になり、種類ごとに同じ行を指す",
    (lang, _, params) => {
      const steps = trace(params, bits("10000000"));
      const activeAt = (step: Step) => codeLines(params, step, ja, lang).flatMap((l, i) => (l.active ? [i] : []));

      for (const step of steps) expect(activeAt(step)).toHaveLength(1);
      for (const kind of STEP_KINDS.filter((k) => steps.some((s) => s.kind === k))) {
        const rows = new Set(steps.filter((s) => s.kind === kind).map((s) => activeAt(s)[0]));
        expect(rows.size).toBe(1);
      }
    },
  );

  it.each(LANG_IDS)("Given 言語 %s, When コードを組み立てる, Then 6 つのパラメータはどれもチップで現れる", (lang) => {
    for (const params of [plain3, full3]) {
      const used = new Set(codeLines(params, initStep(params), ja, lang).flatMap((l) => chips(l).map((c) => c.param)));
      expect([...used].sort()).toEqual([...PARAM_NAMES].sort());
    }
  });

  it.each(LANG_IDS)(
    "Given 言語 %s で refin・refout・xorout が全て無効, When コードを組み立てる, Then その 3 行だけを理由つきで disabled にし、全て有効なら disabled は無い",
    (lang) => {
      const disabled = codeLines(plain3, initStep(plain3), ja, lang).filter((l) => l.disabled);

      const has = (param: string) => (l: CodeLine) => chips(l).some((c) => c.param === param);
      expect(disabled).toHaveLength(3);
      expect(disabled.find(has("refin"))!.note).toBe(ja.code.refinOff);
      expect(disabled.find(has("refout"))!.note).toBe(ja.code.refoutOff);
      expect(disabled.find(has("xorout"))!.note).toBe(ja.code.xoroutZero);
      expect(codeLines(full3, initStep(full3), ja, lang).some((l) => l.disabled)).toBe(false);
    },
  );

  it.each(LANG_IDS)(
    "Given 言語 %s で feedback 0 のクロックの shift ステップ, When コードを組み立てる, Then xor の行を飛ばしたと示す",
    (lang) => {
      const step = firstStep(plain3, "0", "shift");
      const xorRow = codeLines(plain3, stepOf(trace(plain3, bits("1")), "xor"), ja, lang).findIndex((l) => l.active);

      expect(codeLines(plain3, step, ja, lang)[xorRow]!.skipped).toBe(true);
    },
  );

  it.each([
    ["python", "refin", "False"],
    ["haskell", "refout", "False"],
    ["perl", "refin", "0"],
    ["powershell", "refin", "$false"],
    ["pascal", "poly", "$3"],
    ["erlang", "poly", "16#3"],
    ["fsharp", "poly", "0x3u"],
    ["rust", "poly", "0x3"],
  ] as const)(
    "Given 言語 %s, When コードを組み立てる, Then %s のチップの値はその言語のリテラル %s で書く",
    (lang, param, value) => {
      const chip = codeLines(plain3, initStep(plain3), ja, lang)
        .flatMap(chips)
        .find((c) => c.param === param && c.label === param)!;

      expect(chip.value).toBe(value);
    },
  );
});
