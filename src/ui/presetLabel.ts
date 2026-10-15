import type { Preset } from "../domain/presets";

/**
 * Name shown for a preset in the selector. Aliases follow the official name in full-width parentheses, separated by "、".
 * When an alias starts with the same prefix as the official name (such as "CRC-16/"), that prefix is omitted.
 */
export function presetLabel(preset: Preset): string {
  if (preset.aliases.length === 0) return preset.name;
  const prefix = preset.name.slice(0, preset.name.indexOf("/") + 1);
  const aliases = preset.aliases.map((a) => (a.startsWith(prefix) ? a.slice(prefix.length) : a));
  return `${preset.name}（${aliases.join("、")}）`;
}
