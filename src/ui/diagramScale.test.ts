import { describe, expect, it } from "vitest";
import { lowestScale, MAX_SCALE, MIN_SCALE, pinchScale, wheelSteps, zoomBy, ZOOM_STEP } from "./diagramScale";

describe("zoomBy", () => {
  it("Given a scale of 1, When zooming in one step, Then the scale grows by ZOOM_STEP", () => {
    expect(zoomBy(1, 1)).toBeCloseTo(ZOOM_STEP);
  });
  it("Given a scale of 1, When zooming out two steps, Then the scale shrinks by ZOOM_STEP twice", () => {
    expect(zoomBy(1, -2)).toBeCloseTo(1 / ZOOM_STEP ** 2);
  });
  it("Given a scale near the maximum, When zooming in, Then the scale stops at MAX_SCALE", () => {
    expect(zoomBy(MAX_SCALE / 1.1, 1)).toBe(MAX_SCALE);
  });
  it("Given a scale near the minimum, When zooming out, Then the scale stops at MIN_SCALE", () => {
    expect(zoomBy(MIN_SCALE * 1.1, -1)).toBe(MIN_SCALE);
  });
});

describe("wheelSteps", () => {
  it("Given the wheel turned up by 100 px, When reading it as zoom, Then it is one step in", () => {
    expect(wheelSteps(-100)).toBe(1);
  });
  it("Given the wheel turned down by 250 px, When reading it as zoom, Then it is two and a half steps out", () => {
    expect(wheelSteps(250)).toBe(-2.5);
  });
});

describe("pinchScale", () => {
  it("Given two fingers spread to twice their distance, When pinching from scale 1, Then the scale doubles", () => {
    expect(pinchScale(1, 100, 200)).toBe(2);
  });
  it("Given two fingers brought together far, When pinching, Then the scale stops at MIN_SCALE", () => {
    expect(pinchScale(0.5, 400, 10)).toBe(MIN_SCALE);
  });
});

describe("lowestScale", () => {
  it("Given a diagram that fits its area's width at 0.4, When finding how far it zooms out, Then it stops at MIN_SCALE", () => {
    expect(lowestScale(0.4)).toBe(MIN_SCALE);
  });
  it("Given a diagram that fits its area's width only at 0.07, When finding how far it zooms out, Then it goes down to 0.07", () => {
    expect(lowestScale(0.07)).toBe(0.07);
  });
});

describe("zooming out a diagram wider than its area at MIN_SCALE", () => {
  it("Given the lowest scale 0.07, When zooming out from just above it, Then the scale stops at 0.07", () => {
    expect(zoomBy(0.08, -1, 0.07)).toBe(0.07);
  });
  it("Given the lowest scale 0.07, When zooming out from MIN_SCALE, Then the scale goes below MIN_SCALE", () => {
    expect(zoomBy(MIN_SCALE, -1, 0.07)).toBeCloseTo(MIN_SCALE / ZOOM_STEP);
  });
  it("Given the lowest scale 0.07, When pinching far together, Then the scale stops at 0.07", () => {
    expect(pinchScale(0.5, 400, 10, 0.07)).toBe(0.07);
  });
});

describe("zooming in a diagram drawn below MIN_SCALE", () => {
  it("Given the lowest scale 0.07 and a scale of 0.1, When zooming in one step, Then the scale grows by ZOOM_STEP", () => {
    expect(zoomBy(0.1, 1, 0.07)).toBeCloseTo(0.1 * ZOOM_STEP);
  });
});
