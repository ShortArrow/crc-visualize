import type { Preset } from "../domain/presets";

/** How many aliases the selector shows after the official name. */
export const LABEL_ALIASES = 3;

/**
 * Name shown for a preset in the selector. Up to the first LABEL_ALIASES aliases follow the official name in full-width parentheses, separated by "、".
 * When an alias starts with the same prefix as the official name (such as "CRC-16/"), that prefix is omitted.
 */
export function presetLabel(preset: Preset): string {
  if (preset.aliases.length === 0) return preset.name;
  const prefix = preset.name.slice(0, preset.name.indexOf("/") + 1);
  const aliases = preset.aliases.slice(0, LABEL_ALIASES).map((a) => (a.startsWith(prefix) ? a.slice(prefix.length) : a));
  return `${preset.name}（${aliases.join("、")}）`;
}
