const FIELDS = ["INPUT", "SELECT", "TEXTAREA"];

/**
 * Whether a key pressed with focus on an element of tagName is left to that element rather than taken as a playback shortcut:
 * every key in a field, and Space on a button, which presses it.
 */
export const leftToTarget = (tagName: string, key: string): boolean =>
  FIELDS.includes(tagName) || (tagName === "BUTTON" && key === " ");
