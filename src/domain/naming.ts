import type { Preset } from "./presets";

/** reveng の正式名 "CRC-<幅>/<後半の名前>" を分けたもの。origin は最初に使われた規格・製品・団体などの名前。 */
export type NameParts = Readonly<{ head: string; width: string; origin: string }>;

export function splitPresetName(name: string): NameParts {
  const [, head = "", width = "", origin = ""] = /^([^-]+)-(\d+)\/(.+)$/.exec(name) ?? [];
  return { head, width, origin };
}

/** 一族の 1 行。differs は一族の先頭のプリセットと値が違う列（reflect は refin と refout の組）。 */
export type FamilyRow = Readonly<{ preset: Preset; differs: Readonly<{ init: boolean; reflect: boolean; xorout: boolean }> }>;

/** 幅と poly が同じプリセットの組。 */
export type PolyFamily = Readonly<{ width: number; poly: number; rows: readonly FamilyRow[] }>;

/**
 * 幅と poly が同じプリセットが 2 つ以上ある組を、幅・poly の小さい順に並べる。
 * 組の中は presets の順で、先頭のプリセットとの違いを各行に持たせる。
 */
export function polyFamilies(presets: readonly Preset[]): PolyFamily[] {
  const groups = new Map<string, Preset[]>();
  for (const p of presets) {
    const key = `${p.params.width}:${p.params.poly}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.values()]
    .filter((members) => members.length >= 2)
    .map((members) => {
      const head = members[0]!.params;
      const rows = members.map((preset) => {
        const q = preset.params;
        const differs = {
          init: q.init !== head.init,
          reflect: q.refin !== head.refin || q.refout !== head.refout,
          xorout: q.xorout !== head.xorout,
        };
        return { preset, differs };
      });
      return { width: head.width, poly: head.poly, rows };
    })
    .sort((a, b) => a.width - b.width || a.poly - b.poly);
}

/** 別名から正式名を引く表の 1 行。 */
export type AliasEntry = Readonly<{ alias: string; name: string }>;

/** presets の全ての別名を英数字順に並べ、それぞれの正式名を添える。 */
export function aliasIndex(presets: readonly Preset[]): AliasEntry[] {
  return presets
    .flatMap((p) => p.aliases.map((alias) => ({ alias, name: p.name })))
    .sort((a, b) => a.alias.localeCompare(b.alias, "en"));
}

/** 流儀によって指すものが割れる呼び名と、その候補の正式名。 */
export const AMBIGUOUS_NAMES: readonly Readonly<{ alias: string; candidates: readonly string[] }>[] = [
  { alias: "CRC-16-CCITT", candidates: ["CRC-16/KERMIT", "CRC-16/IBM-3740", "CRC-16/XMODEM"] },
];
