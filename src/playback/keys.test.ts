import { describe, expect, it } from "vitest";
import { keyAction, leftToBrowser, leftToTarget } from "./keys";

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

describe("keyAction", () => {
  it.each([" ", "k", "K"])("Given focus on the page, When %j is pressed, Then playback toggles between play and pause", (key) => {
    expect(keyAction(key, 20)).toEqual({ type: "toggle" });
  });

  it.each(["ArrowLeft", "j", "J", ","])(
    "Given focus on the page, When %j is pressed, Then playback steps back one step",
    (key) => {
      expect(keyAction(key, 20)).toEqual({ type: "prev" });
    },
  );

  it.each(["ArrowRight", "l", "L", "."])(
    "Given focus on the page, When %j is pressed, Then playback steps forward one step",
    (key) => {
      expect(keyAction(key, 20)).toEqual({ type: "next" });
    },
  );

  it("Given focus on the page, When Home or End is pressed, Then playback jumps to the first or the last step", () => {
    expect(keyAction("Home", 20)).toEqual({ type: "first" });
    expect(keyAction("End", 20)).toEqual({ type: "last" });
  });

  it.each([
    ["0", 0],
    ["1", 2],
    ["5", 11],
    ["9", 20],
  ])("Given 23 steps, When the digit %s is pressed, Then playback jumps to step %i", (key, index) => {
    expect(keyAction(key, 23)).toEqual({ type: "seek", index });
  });

  it.each(["r", "R"])("Given focus on the page, When %j is pressed, Then looping toggles", (key) => {
    expect(keyAction(key, 20)).toBe("loop");
  });

  it.each(["m", "Enter", "a"])("Given focus on the page, When %j is pressed, Then it is not a playback key", (key) => {
    expect(keyAction(key, 20)).toBeUndefined();
  });
});
