import { describe, expect, it } from "vitest";
import { leftToBrowser, leftToTarget } from "./keys";

describe("leftToTarget", () => {
  it.each(["INPUT", "SELECT", "TEXTAREA"])("Given focus in a %s, When any key is pressed, Then the field takes it", (tag) => {
    expect(leftToTarget(tag, " ")).toBe(true);
    expect(leftToTarget(tag, "ArrowLeft")).toBe(true);
  });

  it("Given focus on a button, When Space is pressed, Then the button takes it, so it is pressed rather than playback toggled", () => {
    expect(leftToTarget("BUTTON", " ")).toBe(true);
  });

  it("Given focus on a button, When an arrow key is pressed, Then the shortcut takes it", () => {
    expect(leftToTarget("BUTTON", "ArrowRight")).toBe(false);
  });

  it("Given focus on the page, When Space is pressed, Then the shortcut takes it", () => {
    expect(leftToTarget("BODY", " ")).toBe(false);
  });
});

describe("leftToBrowser", () => {
  it.each(["ctrlKey", "altKey", "metaKey"] as const)(
    "Given %s is held, When a playback key is pressed, Then the browser takes it",
    (key) => {
      expect(leftToBrowser({ ctrlKey: false, altKey: false, metaKey: false, [key]: true })).toBe(true);
    },
  );

  it("Given no modifier is held, When a playback key is pressed, Then the shortcut takes it", () => {
    expect(leftToBrowser({ ctrlKey: false, altKey: false, metaKey: false })).toBe(false);
  });
});
