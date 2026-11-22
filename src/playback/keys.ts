import type { PlayerMsg } from "./playback";

const FIELDS = ["INPUT", "SELECT", "TEXTAREA"];

/**
 * Whether a key pressed with focus on an element of tagName is left to that element rather than taken as a playback shortcut:
 * every key in a field, and Space on a button, which presses it.
 */
export const leftToTarget = (tagName: string, key: string): boolean =>
  FIELDS.includes(tagName) || (tagName === "BUTTON" && key === " ");

/**
 * Whether a key pressed with Ctrl, Alt or ⌘ held is left to the browser (Alt+← goes back, Ctrl+L to the address bar) rather than
 * taken as a playback shortcut.
 */
export const leftToBrowser = ({
  ctrlKey,
  altKey,
  metaKey,
}: Readonly<{ ctrlKey: boolean; altKey: boolean; metaKey: boolean }>): boolean => ctrlKey || altKey || metaKey;

const KEY_MSG: Record<string, PlayerMsg> = {
  " ": { type: "toggle" },
  ArrowLeft: { type: "prev" },
  ArrowRight: { type: "next" },
  Home: { type: "first" },
  End: { type: "last" },
};

/** What a playback key does: a message to the player, "loop" to toggle looping, or undefined for a key that is not a shortcut. */
export const keyAction = (key: string): PlayerMsg | "loop" | undefined =>
  KEY_MSG[key] ?? (key.toLowerCase() === "l" ? "loop" : undefined);
