import type { Preset } from "./presets";

/** A reveng canonical name "CRC-<width>/<suffix>" split into parts; origin names the standard, product or organisation that first used it. */
export type NameParts = Readonly<{ head: string; width: string; origin: string }>;

export function splitPresetName(name: string): NameParts {
  const [, head = "", width = "", origin = ""] = /^([^-]+)-(\d+)\/(.+)$/.exec(name) ?? [];
  return { head, width, origin };
}

/** One row of a family; differs lists the columns whose values differ from the family's first preset (reflect is the refin and refout pair). */
export type FamilyRow = Readonly<{ preset: Preset; differs: Readonly<{ init: boolean; reflect: boolean; xorout: boolean }> }>;

/** A group of presets sharing width and poly. */
export type PolyFamily = Readonly<{ width: number; poly: number; rows: readonly FamilyRow[] }>;

/**
 * Lists the groups of two or more presets sharing width and poly, in ascending order of width then poly.
 * Within a group, rows follow the order of presets, and each row records how it differs from the first preset.
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

/** One row of the table mapping an alias to its canonical name. */
export type AliasEntry = Readonly<{ alias: string; name: string }>;

/** Lists every alias in presets in alphanumeric order, each with its canonical name. */
export function aliasIndex(presets: readonly Preset[]): AliasEntry[] {
  return presets
    .flatMap((p) => p.aliases.map((alias) => ({ alias, name: p.name })))
    .sort((a, b) => a.alias.localeCompare(b.alias, "en"));
}

/** A name whose meaning varies by convention, and the canonical names it may refer to. */
export const AMBIGUOUS_NAMES: readonly Readonly<{ alias: string; candidates: readonly string[] }>[] = [
  { alias: "CRC-16-CCITT", candidates: ["CRC-16/KERMIT", "CRC-16/IBM-3740", "CRC-16/XMODEM"] },
];
