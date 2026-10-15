import { describe, expect, it } from "vitest";
import { isPhone } from "./phone";

describe("isPhone", () => {
  it.each([320, 390, 430, 699])("Given a %i px wide window, When asking, Then it is a phone", (width) => {
    expect(isPhone(width)).toBe(true);
  });

  it.each([700, 768, 1366])("Given a %i px wide window, When asking, Then it is not a phone", (width) => {
    expect(isPhone(width)).toBe(false);
  });
});
