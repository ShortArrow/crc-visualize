import { describe, expect, it } from "vitest";
import { isPhone, tierOf } from "./phone";

describe("isPhone", () => {
  it.each([320, 390, 430, 699])("Given a %i px wide window, When asking, Then it is a phone", (width) => {
    expect(isPhone(width)).toBe(true);
  });

  it.each([700, 768, 1366])("Given a %i px wide window, When asking, Then it is not a phone", (width) => {
    expect(isPhone(width)).toBe(false);
  });
});

describe("tierOf", () => {
  it.each([
    [375, 667, "phone"],
    [390, 844, "phone"],
    [699, 400, "phone"],
    [844, 390, "short"],
    [1280, 590, "short"],
    [1366, 638, "short"],
    [1366, 649, "short"],
    [1366, 650, "pc"],
    [1536, 734, "pc"],
    [1920, 950, "pc"],
  ] as const)("Given a %i×%i window, When asking its tier, Then it is %s", (width, height, tier) => {
    expect(tierOf(width, height)).toBe(tier);
  });
});
