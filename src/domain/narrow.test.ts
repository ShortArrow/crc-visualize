import { describe, expect, it } from "vitest";
import { branches, fitPath, formatValue, matching, parseValue, splittingParams } from "./narrow";
import { CATALOGUE } from "./presets";

const names = (presets: readonly { name: string }[]) => presets.map((p) => p.name);

describe("matching", () => {
  it("Given path width=16, poly=0x1021, When candidates are narrowed, Then the 6 with width 16 and poly 0x1021 remain", () => {
    const fixed = [
      { param: "width", value: 16 },
      { param: "poly", value: 0x1021 },
    ] as const;

    expect(matching(CATALOGUE, fixed)).toHaveLength(6);
  });

  it("Given an empty path, When candidates are narrowed, Then every preset remains", () => {
    expect(matching(CATALOGUE, [])).toEqual(CATALOGUE);
  });
});

describe("splittingParams", () => {
  it("Given all presets, When the splittable parameters are listed, Then every parameter appears in PARAM_NAMES order", () => {
    expect(splittingParams(CATALOGUE)).toEqual(["width", "poly", "init", "refin", "refout", "xorout"]);
  });

  it("Given candidates with width 16 and poly 0x8005, When the splittable parameters are listed, Then width and poly, shared by all candidates, are absent", () => {
    const family = matching(CATALOGUE, [
      { param: "width", value: 16 },
      { param: "poly", value: 0x8005 },
    ]);

    expect(splittingParams(family)).not.toContain("width");
    expect(splittingParams(family)).not.toContain("poly");
    expect(splittingParams(family)).toContain("init");
  });

  it("Given a single candidate, When the splittable parameters are listed, Then there are none", () => {
    expect(splittingParams(CATALOGUE.slice(0, 1))).toEqual([]);
  });
});

describe("branches", () => {
  it("Given all presets, When split by width, Then branches are in ascending order of value and each holds the candidates with that value", () => {
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

  it("Given all presets, When split by refin, Then the false branch comes first", () => {
    expect(branches(CATALOGUE, "refin").map((b) => b.value)).toEqual([false, true]);
  });

  it("Given candidates with width 16 and poly 0x8005, When split by init, Then each branch keeps preset list order", () => {
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
  it("Given a fully splittable path and an open branch point, When the path is fitted, Then it stays as is", () => {
    const path = {
      fixed: [
        { param: "width", value: 16 },
        { param: "poly", value: 0x1021 },
      ],
      open: "init",
    } as const;

    expect(fitPath(CATALOGUE, path)).toEqual(path);
  });

  it("Given a path containing a value with no candidates, When the path is fitted, Then it is cut just before that value and the branch point closes", () => {
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

  it("Given a path splitting by a parameter shared by all candidates, When the path is fitted, Then it is cut just before that parameter", () => {
    const path = {
      fixed: [
        { param: "width", value: 16 },
        { param: "poly", value: 0x8005 },
        { param: "width", value: 16 },
      ],
    } as const;

    expect(fitPath(CATALOGUE, path)).toEqual({ fixed: path.fixed.slice(0, 2) });
  });

  it("Given a branch point after the candidates are down to one, When the path is fitted, Then the branch point closes", () => {
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
  ] as const)("Given %s value %j, When formatted, Then %s", (param, value, text) => {
    expect(formatValue(param, value)).toBe(text);
  });
});

describe("parseValue", () => {
  it.each([
    ["width", "16", 16],
    ["poly", "0x1021", 0x1021],
    ["refin", "true", true],
    ["refout", "false", false],
  ] as const)("Given %s text %s, When parsed, Then %j", (param, text, value) => {
    expect(parseValue(param, text)).toBe(value);
  });

  it.each([
    ["width", "abc"],
    ["width", "0x10"],
    ["poly", "1021"],
    ["refin", "1"],
  ] as const)("Given unparsable %s text %s, When parsed, Then there is no value", (param, text) => {
    expect(parseValue(param, text)).toBeUndefined();
  });
});
