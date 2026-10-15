import { describe, expect, it } from "vitest";
import { uiZoom } from "./zoom";

describe("uiZoom", () => {
  it.each([
    [1366, 768],
    [1600, 1000],
    [1920, 900],
    [3840, 1000],
    [1600, 2000],
  ])("Given a %i×%i screen, no larger than 1600×1000 on one side, When zooming, Then 1", (width, height) => {
    expect(uiZoom(width, height)).toBe(1);
  });

  it.each([
    [1920, 1080, 1.08],
    [2560, 1440, 1.44],
    [3840, 2160, 2.16],
    [3200, 1500, 1.5],
  ])(
    "Given a %i×%i screen, When zooming, Then %f, so that the smaller side shrinks to the size of 1600×1000",
    (width, height, zoom) => {
      expect(uiZoom(width, height)).toBeCloseTo(zoom);
    },
  );
});
