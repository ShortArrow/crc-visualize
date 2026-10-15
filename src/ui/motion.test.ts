import { describe, expect, it } from "vitest";
import { routeKeyframes } from "./motion";

describe("routeKeyframes", () => {
  it("Given a polyline of 2 segments of length 10 and 30, When turning it into keyframes, Then each vertex's offset is the fraction of the path length from the start", () => {
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

  it("Given a path of a single point with length 0, When turning it into keyframes, Then it stays at the start", () => {
    expect(routeKeyframes([{ x: 5, y: 5 }])).toEqual([
      { transform: "translate(5px, 5px)", offset: 0 },
      { transform: "translate(5px, 5px)", offset: 1 },
    ]);
  });
});
