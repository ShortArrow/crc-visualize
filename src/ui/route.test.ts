import { describe, expect, it } from "vitest";
import { generatorHash, narrowHash, parseRoute } from "./route";

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

describe("巡回のページのフラグメント", () => {
  it("Given フラグメント #cyclic, When ページを決める, Then 既定の生成多項式の巡回のページ", () => {
    expect(parseRoute("#cyclic")).toEqual({ page: "cyclic", generator: { width: 3, poly: 0x3 } });
  });

  it("Given フラグメント #cyclic/width=4/poly=0xF, When ページを決める, Then その生成多項式", () => {
    expect(parseRoute("#cyclic/width=4/poly=0xF")).toEqual({ page: "cyclic", generator: { width: 4, poly: 0xf } });
  });

  it.each(["#cyclic/width=4/poly=0x5", "#cyclic/width=x/poly=0x3", "#cyclic/poly=0x3"])(
    "Given 一覧に無いか解釈できないフラグメント %j, When ページを決める, Then 既定の生成多項式",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ page: "cyclic", generator: { width: 3, poly: 0x3 } });
    },
  );

  it("Given 生成多項式, When フラグメントにする, Then width は 10 進、poly は大文字の 16 進で書き、読み戻せる", () => {
    expect(generatorHash("cyclic", { width: 4, poly: 0xf })).toBe("#cyclic/width=4/poly=0xF");
    expect(parseRoute(generatorHash("cyclic", { width: 5, poly: 0x5 }))).toEqual({
      page: "cyclic",
      generator: { width: 5, poly: 0x5 },
    });
  });
});

describe("冗長のページのフラグメント", () => {
  it("Given フラグメント #redundancy, When ページを決める, Then 既定の生成多項式の冗長のページ", () => {
    expect(parseRoute("#redundancy")).toEqual({ page: "redundancy", generator: { width: 3, poly: 0x3 } });
  });

  it("Given 生成多項式, When 冗長のページのフラグメントにする, Then 読み戻せる", () => {
    expect(generatorHash("redundancy", { width: 4, poly: 0x3 })).toBe("#redundancy/width=4/poly=0x3");
    expect(parseRoute("#redundancy/width=4/poly=0x3")).toEqual({ page: "redundancy", generator: { width: 4, poly: 0x3 } });
  });
});

describe("置き換えのページのフラグメント", () => {
  it.each(["#equivalence", "#equivalence/foo"])("Given フラグメント %j, When ページを決める, Then 置き換えのページ", (hash) => {
    expect(parseRoute(hash)).toEqual({ page: "equivalence" });
  });
});

describe("検査のページのフラグメント", () => {
  it("Given フラグメント #check, When ページを決める, Then 検査のページ", () => {
    expect(parseRoute("#check")).toEqual({ page: "check" });
  });
});
