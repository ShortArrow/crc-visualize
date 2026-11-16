import type { Preset } from "./presets";
import { reflectValue } from "./trace";

/** The notations of a poly other than the normal one: reversed, Koopman, and with the x^width term included. */
export const POLY_NOTATIONS = ["reversed", "koopman", "full"] as const;
export type PolyNotation = (typeof POLY_NOTATIONS)[number];

/** The presets whose poly is a pasted value in normal notation, and, only when there are none, those it is in each other notation. */
export type PolyMatch = Readonly<{
  normal: readonly Preset[];
  /** In the order of POLY_NOTATIONS; a notation that no preset matches is left out. */
  others: readonly Readonly<{ notation: PolyNotation; presets: readonly Preset[] }>[];
}>;

/** The poly of preset written in notation. */
function written({ params: { width, poly } }: Preset, notation: PolyNotation): bigint {
  switch (notation) {
    case "reversed":
      return reflectValue(poly, width);
    case "koopman":
      return (poly >> 1n) | (1n << BigInt(width - 1));
    case "full":
      return poly | (1n << BigInt(width));
  }
}

const ofWidth = (presets: readonly Preset[], width: number | undefined) =>
  width === undefined ? presets : presets.filter((p) => p.params.width === width);

/** Compares a pasted poly with the presets of width (every width when undefined). */
export function polyMatches(presets: readonly Preset[], value: bigint, width: number | undefined): PolyMatch {
  const candidates = ofWidth(presets, width);
  const normal = candidates.filter((p) => p.params.poly === value);
  if (normal.length > 0) return { normal, others: [] };
  const others = POLY_NOTATIONS.map((notation) => ({
    notation,
    presets: candidates.filter((p) => written(p, notation) === value),
  })).filter((o) => o.presets.length > 0);
  return { normal, others };
}

/** The presets of width (every width when undefined) whose check, the CRC of 123456789, is value. */
export function checkMatches(presets: readonly Preset[], value: bigint, width: number | undefined): Preset[] {
  return ofWidth(presets, width).filter((p) => p.check === value);
}
