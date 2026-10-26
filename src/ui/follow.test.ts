import { describe, expect, it } from "vitest";
import { followScroll, followTarget } from "./follow";

describe("followScroll", () => {
  it("Given the part already in view, When following, Then the scroll position stays", () => {
    expect(followScroll({ left: 100, width: 400 }, { from: 150, to: 300 })).toBe(100);
  });

  it("Given the part right of the view, When following, Then the part is centred", () => {
    expect(followScroll({ left: 0, width: 400 }, { from: 900, to: 1000 })).toBe(750);
  });

  it("Given the part left of the view, When following, Then the part is centred, not past the start", () => {
    expect(followScroll({ left: 800, width: 400 }, { from: 100, to: 200 })).toBe(0);
  });

  it("Given the part partly out of view, When following, Then the part is centred", () => {
    expect(followScroll({ left: 0, width: 400 }, { from: 300, to: 500 })).toBe(200);
  });

  it("Given a part wider than the view, When following, Then its left edge comes to the left of the view", () => {
    expect(followScroll({ left: 0, width: 400 }, { from: 200, to: 900 })).toBe(200);
  });
});

describe("followTarget", () => {
  it("Given the MSB left of every flowing part, When choosing what to follow, Then it runs from the MSB to the leftmost flowing part", () => {
    expect(
      followTarget({ from: 100, to: 140 }, [
        { from: 600, to: 640 },
        { from: 300, to: 340 },
      ]),
    ).toEqual({ from: 100, to: 340 });
  });
  it("Given a flowing part left of the MSB, When choosing what to follow, Then it runs from that part to the MSB", () => {
    expect(
      followTarget({ from: 100, to: 140 }, [
        { from: 20, to: 60 },
        { from: 900, to: 940 },
      ]),
    ).toEqual({ from: 20, to: 140 });
  });
  it("Given nothing flowing, When choosing what to follow, Then it is the MSB alone", () => {
    expect(followTarget({ from: 100, to: 140 }, [])).toEqual({ from: 100, to: 140 });
  });
  it("Given no MSB, When choosing what to follow, Then it is the leftmost flowing part", () => {
    expect(
      followTarget(undefined, [
        { from: 600, to: 640 },
        { from: 300, to: 340 },
      ]),
    ).toEqual({ from: 300, to: 340 });
  });
});
