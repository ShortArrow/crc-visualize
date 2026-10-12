import { describe, expect, it } from "vitest";
import { parseRoute } from "./route";

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
});
