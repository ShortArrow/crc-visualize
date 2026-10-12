import type { Preset } from "../domain/presets";

/**
 * プリセットの選択肢に出す名前。正式名の後に全角括弧で別名を「、」区切りで添える。
 * 別名が正式名と同じ接頭辞（"CRC-16/" など）で始まるときは、その接頭辞を省く。
 */
export function presetLabel(preset: Preset): string {
  if (preset.aliases.length === 0) return preset.name;
  const prefix = preset.name.slice(0, preset.name.indexOf("/") + 1);
  const aliases = preset.aliases.map((a) => (a.startsWith(prefix) ? a.slice(prefix.length) : a));
  return `${preset.name}（${aliases.join("、")}）`;
}
