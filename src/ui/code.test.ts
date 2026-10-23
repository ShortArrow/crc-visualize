import { describe, expect, it } from "vitest";
import { PARAM_NAMES, trace, type CrcParams, type Step } from "../domain/trace";
import { bits, firstStep, plain3, stepOf } from "../testing/fixtures";
import { ja } from "../i18n/ja";
import { CODE_LANGS, codeLines, type CodeLang, type CodeLine, type ParamChip } from "./code";

/** CRC-3 with refin, refout and xorout all enabled. */
const full3: CrcParams = { ...plain3, refin: true, refout: true, xorout: 7 };
const initStep = (params: CrcParams) => trace(params, [])[0]!;
const texts = (lines: CodeLine[]) => lines.map((l) => l.text.trim());
const chips = (line: CodeLine) => line.parts.filter((p): p is ParamChip => typeof p !== "string");
const activeText = (params: CrcParams, step: Step) => texts(codeLines(params, step, ja, "pseudo").filter((l) => l.active));
const ifLine = (step: Step) => codeLines(plain3, step, ja, "pseudo").find((l) => l.text.includes("if (feedback == 1)"))!;
const xorBody = (step: Step) => codeLines(plain3, step, ja, "pseudo").find((l) => l.text.trim() === "crc ^= poly;")!;

describe("codeLines", () => {
  it("Given CRC-3 with init 5, When building the code, Then parameters are written by name and chips carry their values", () => {
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
    ["refin, refout and xorout all disabled", plain3],
    ["refin, refout and xorout all enabled", full3],
  ])("Given %s, When building the code, Then each of the 6 parameters appears somewhere in the code", (_, params) => {
    const used = new Set(codeLines(params, initStep(params), ja, "pseudo").flatMap((l) => chips(l).map((c) => c.param)));

    expect([...used].sort()).toEqual([...PARAM_NAMES].sort());
  });

  it("Given refin, refout and xorout all disabled, When building the code, Then their lines are kept as disabled with a reason instead of being removed", () => {
    const disabled = codeLines(plain3, initStep(plain3), ja, "pseudo").filter((l) => l.disabled);

    expect(disabled.map((l) => chips(l)[0]!.param)).toEqual(["refin", "refout", "xorout"]);
    expect(disabled.every((l) => l.note !== undefined)).toBe(true);
  });

  it("Given refin, refout and xorout all enabled, When building the code, Then they become processing lines that are not disabled", () => {
    const lines = codeLines(full3, initStep(full3), ja, "pseudo");

    expect(lines.some((l) => l.disabled)).toBe(false);
    expect(texts(lines)).toEqual(
      expect.arrayContaining(["if (refin) byte = reflect(byte, 8);", "if (refout) crc = reflect(crc, width);", "crc ^= xorout;"]),
    );
  });

  it("Given refin, refout and xorout all enabled, When showing each kind of step, Then exactly the one corresponding line is the current line", () => {
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

  it("Given the feedback step of CRC-3 with init 100 fed a 0, When building the code, Then the feedback line is noted with the result of MSB ⊕ input bit", () => {
    const step = firstStep({ ...plain3, init: 4 }, "0", "feedback");

    expect(codeLines(plain3, step, ja, "pseudo").find((l) => l.active)!.note).toBe("msb 1 ⊕ bit 0 = feedback 1");
  });

  it("Given the shift step of a clock with feedback 1, When building the code, Then the if is true and the body is not skipped", () => {
    const taken = firstStep(plain3, "1", "shift");

    expect(ifLine(taken)).toMatchObject({ note: "true" });
    expect(xorBody(taken).skipped).toBe(false);
  });

  it("Given the shift step of a clock with feedback 0, When building the code, Then the if is false and the body is shown as skipped", () => {
    const skipped = firstStep(plain3, "0", "shift");

    expect(ifLine(skipped)).toMatchObject({ note: "false" });
    expect(xorBody(skipped).skipped).toBe(true);
  });
});

const LANG_IDS = Object.keys(CODE_LANGS) as CodeLang[];
const STEP_KINDS: readonly Step["kind"][] = ["init", "reflectIn", "feedback", "shift", "xor", "reflectOut", "xorOut", "done"];

describe("CODE_LANGS", () => {
  it.each(LANG_IDS.flatMap((lang) => [[lang, "all disabled", plain3] as const, [lang, "all enabled", full3] as const]))(
    "Given language %s with refin, refout and xorout %s, When showing every step, Then exactly 1 line is current at every step, and steps of the same kind point to the same line",
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

  it.each(LANG_IDS)(
    "Given language %s, When building the code, Then the lines that run steps name their step kind once each, ",
    (lang) => {
      const lines = codeLines(plain3, initStep(plain3), ja, lang);
      const kinds = lines.flatMap((l) => (l.runs ? [l.runs] : []));

      expect(new Set(kinds).size).toBe(kinds.length);
      expect(kinds).toEqual(expect.arrayContaining(["init", "feedback", "shift", "xor"]));
    },
  );

  it.each(LANG_IDS)("Given language %s, When building the code, Then each of the 6 parameters appears as a chip", (lang) => {
    for (const params of [plain3, full3]) {
      const used = new Set(codeLines(params, initStep(params), ja, lang).flatMap((l) => chips(l).map((c) => c.param)));
      expect([...used].sort()).toEqual([...PARAM_NAMES].sort());
    }
  });

  it.each(LANG_IDS)(
    "Given language %s with refin, refout and xorout all disabled, When building the code, Then only those 3 lines are disabled with a reason, and with all enabled none is disabled",
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
    "Given the shift step of a clock with feedback 0 in language %s, When building the code, Then the xor line is shown as skipped",
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
    "Given language %s, When building the code, Then the value of the %s chip is written as that language's literal %s",
    (lang, param, value) => {
      const chip = codeLines(plain3, initStep(plain3), ja, lang)
        .flatMap(chips)
        .find((c) => c.param === param && c.label === param)!;

      expect(chip.value).toBe(value);
    },
  );
});
