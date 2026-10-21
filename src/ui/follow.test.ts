import { describe, expect, it } from "vitest";
import { followScroll } from "./follow";

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
