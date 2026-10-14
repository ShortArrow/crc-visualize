import { describe, expect, it } from "vitest";
import { narrowHash, parseRoute } from "./route";

describe("parseRoute", () => {
  it.each(["", "#", "#other"])("Given フラグメント %j, When ページを決める, Then 可視化のページ", (hash) => {
    expect(parseRoute(hash)).toEqual({ page: "visualizer" });
  });

  it("Given フラグメント #names, When ページを決める, Then 名前の規則のページ", () => {
    expect(parseRoute("#names")).toEqual({ page: "names" });
  });

  it("Given フラグメント #names/poly, When ページを決める, Then 名前の規則のページで poly の行を指す", () => {
    expect(parseRoute("#names/poly")).toEqual({ page: "names", param: "poly" });
  });

  it("Given パラメータ名でないものを指すフラグメント #names/foo, When ページを決める, Then 名前の規則のページで行は指さない", () => {
    expect(parseRoute("#names/foo")).toEqual({ page: "names" });
  });

  it("Given フラグメント #narrow, When ページを決める, Then 絞り込みのページで道筋は空", () => {
    expect(parseRoute("#narrow")).toEqual({ page: "narrow", path: { fixed: [] } });
  });

  it("Given フラグメント #narrow/width=16/poly=0x1021/init, When ページを決める, Then 固定した値と開いた分かれ目を持つ", () => {
    expect(parseRoute("#narrow/width=16/poly=0x1021/init")).toEqual({
      page: "narrow",
      path: {
        fixed: [
          { param: "width", value: 16 },
          { param: "poly", value: 0x1021 },
        ],
        open: "init",
      },
    });
  });

  it.each(["#narrow/width=16/foo=1/poly=0x1021", "#narrow/width=16/poly=abc", "#narrow/width=16/init/poly=0x1021"])(
    "Given 解釈できない部分を含むフラグメント %s, When ページを決める, Then その手前までの道筋にする",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ page: "narrow", path: { fixed: [{ param: "width", value: 16 }] } });
    },
  );
});

describe("narrowHash", () => {
  it("Given 固定した値と開いた分かれ目, When フラグメントにする, Then 値を順に並べ分かれ目を最後に付ける", () => {
    const path = {
      fixed: [
        { param: "width", value: 16 },
        { param: "refin", value: true },
      ],
      open: "xorout",
    } as const;

    expect(narrowHash(path)).toBe("#narrow/width=16/refin=true/xorout");
  });

  it("Given 空の道筋, When フラグメントにする, Then #narrow", () => {
    expect(narrowHash({ fixed: [] })).toBe("#narrow");
  });
});
