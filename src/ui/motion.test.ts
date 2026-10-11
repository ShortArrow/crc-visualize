import { describe, expect, it } from "vitest";
import { routeKeyframes } from "./motion";

describe("routeKeyframes", () => {
  it("Given 長さ 10 と 30 の 2 区間からなる折れ線, When キーフレームにする, Then 各頂点の offset は始点からの道のりの割合になる", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 30 },
    ];

    expect(routeKeyframes(points)).toEqual([
      { transform: "translate(0px, 0px)", offset: 0 },
      { transform: "translate(10px, 0px)", offset: 0.25 },
      { transform: "translate(10px, 30px)", offset: 1 },
    ]);
  });

  it("Given 1 点だけの長さ 0 の経路, When キーフレームにする, Then 始点に留まる", () => {
    expect(routeKeyframes([{ x: 5, y: 5 }])).toEqual([
      { transform: "translate(5px, 5px)", offset: 0 },
      { transform: "translate(5px, 5px)", offset: 1 },
    ]);
  });
});
