import { describe, expect, it } from "vitest";
import { branches, fitPath, formatValue, matching, parseValue, splittingParams } from "./narrow";
import { CATALOGUE } from "./presets";

const names = (presets: readonly { name: string }[]) => presets.map((p) => p.name);

describe("matching", () => {
  it("Given 道筋 width=16・poly=0x1021, When 候補を絞る, Then 幅 16 で poly 0x1021 の 6 つが残る", () => {
    const fixed = [
      { param: "width", value: 16 },
      { param: "poly", value: 0x1021 },
    ] as const;

    expect(matching(CATALOGUE, fixed)).toHaveLength(6);
  });

  it("Given 空の道筋, When 候補を絞る, Then 全てのプリセットが残る", () => {
    expect(matching(CATALOGUE, [])).toEqual(CATALOGUE);
  });
});

describe("splittingParams", () => {
  it("Given 全プリセット, When 分けられるパラメータを挙げる, Then 全てのパラメータが PARAM_NAMES の順に並ぶ", () => {
    expect(splittingParams(CATALOGUE)).toEqual(["width", "poly", "init", "refin", "refout", "xorout"]);
  });

  it("Given 幅 16・poly 0x8005 の候補, When 分けられるパラメータを挙げる, Then 全ての候補で同じ width と poly は出ない", () => {
    const family = matching(CATALOGUE, [
      { param: "width", value: 16 },
      { param: "poly", value: 0x8005 },
    ]);

    expect(splittingParams(family)).not.toContain("width");
    expect(splittingParams(family)).not.toContain("poly");
    expect(splittingParams(family)).toContain("init");
  });

  it("Given 候補が 1 つ, When 分けられるパラメータを挙げる, Then 何も無い", () => {
    expect(splittingParams(CATALOGUE.slice(0, 1))).toEqual([]);
  });
});

describe("branches", () => {
  it("Given 全プリセット, When width で分ける, Then 値の小さい順に枝が並び、各枝にその値の候補が入る", () => {
    const result = branches(CATALOGUE, "width");

    expect(result.map((b) => [b.value, b.presets.length])).toEqual([
      [3, 1],
      [4, 1],
      [5, 1],
      [7, 1],
      [8, 4],
      [16, 9],
      [32, 4],
    ]);
  });

  it("Given 全プリセット, When refin で分ける, Then 偽の枝が先に並ぶ", () => {
    expect(branches(CATALOGUE, "refin").map((b) => b.value)).toEqual([false, true]);
  });

  it("Given 幅 16・poly 0x8005 の候補, When init で分ける, Then 各枝の候補はプリセットの一覧の順", () => {
    const family = matching(CATALOGUE, [
      { param: "width", value: 16 },
      { param: "poly", value: 0x8005 },
    ]);

    expect(branches(family, "init").map((b) => [b.value, names(b.presets)])).toEqual([
      [0x0, ["CRC-16/ARC"]],
      [0xffff, ["CRC-16/MODBUS", "CRC-16/USB"]],
    ]);
  });
});

describe("fitPath", () => {
  it("Given 全て分けられる道筋と開いた分かれ目, When 道筋を収める, Then そのまま残る", () => {
    const path = {
      fixed: [
        { param: "width", value: 16 },
        { param: "poly", value: 0x1021 },
      ],
      open: "init",
    } as const;

    expect(fitPath(CATALOGUE, path)).toEqual(path);
  });

  it("Given 候補の無い値を含む道筋, When 道筋を収める, Then その手前までになり、分かれ目は閉じる", () => {
    const path = {
      fixed: [
        { param: "width", value: 16 },
        { param: "poly", value: 0x07 },
        { param: "init", value: 0 },
      ],
      open: "xorout",
    } as const;

    expect(fitPath(CATALOGUE, path)).toEqual({ fixed: [{ param: "width", value: 16 }] });
  });

  it("Given 全ての候補で同じパラメータを分ける道筋, When 道筋を収める, Then その手前までになる", () => {
    const path = {
      fixed: [
        { param: "width", value: 16 },
        { param: "poly", value: 0x8005 },
        { param: "width", value: 16 },
      ],
    } as const;

    expect(fitPath(CATALOGUE, path)).toEqual({ fixed: path.fixed.slice(0, 2) });
  });

  it("Given 候補が 1 つに決まった後の分かれ目, When 道筋を収める, Then 分かれ目は閉じる", () => {
    const path = { fixed: [{ param: "width", value: 3 }], open: "init" } as const;

    expect(fitPath(CATALOGUE, path)).toEqual({ fixed: path.fixed });
  });
});

describe("formatValue", () => {
  it.each([
    ["width", 16, "16"],
    ["poly", 0x1021, "0x1021"],
    ["xorout", 0xffffffff, "0xFFFFFFFF"],
    ["refin", true, "true"],
    ["refout", false, "false"],
  ] as const)("Given %s の値 %j, When 表記にする, Then %s", (param, value, text) => {
    expect(formatValue(param, value)).toBe(text);
  });
});

describe("parseValue", () => {
  it.each([
    ["width", "16", 16],
    ["poly", "0x1021", 0x1021],
    ["refin", "true", true],
    ["refout", "false", false],
  ] as const)("Given %s の表記 %s, When 値にする, Then %j", (param, text, value) => {
    expect(parseValue(param, text)).toBe(value);
  });

  it.each([
    ["width", "abc"],
    ["width", "0x10"],
    ["poly", "1021"],
    ["refin", "1"],
  ] as const)("Given %s の解釈できない表記 %s, When 値にする, Then 値は無い", (param, text) => {
    expect(parseValue(param, text)).toBeUndefined();
  });
});
