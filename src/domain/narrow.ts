import type { Preset } from "./presets";
import { PARAM_NAMES, type CrcParams, type ParamName } from "./trace";

type ParamValue = CrcParams[ParamName];

/** A fixed parameter and its value. */
export type Choice = Readonly<{ param: ParamName; value: ParamValue }>;

/** A narrowing path; fixed holds the values in the order they were fixed, open is the last branch point whose value is not chosen yet. */
export type NarrowPath = Readonly<{ fixed: readonly Choice[]; open?: ParamName }>;

/** One branch of a branch point; presets are the candidates with that value (in original order). */
export type Branch = Readonly<{ value: ParamValue; presets: readonly Preset[] }>;

/** Presets matching every value in fixed (in original order). */
export const matching = (presets: readonly Preset[], fixed: readonly Choice[]): readonly Preset[] =>
  presets.filter((p) => fixed.every((c) => p.params[c.param] === c.value));

/** Splits presets by the value of param, in ascending order of value (false first). */
export function branches(presets: readonly Preset[], param: ParamName): Branch[] {
  const groups = new Map<ParamValue, Preset[]>();
  for (const p of presets) groups.set(p.params[param], [...(groups.get(p.params[param]) ?? []), p]);
  return [...groups].map(([value, members]) => ({ value, presets: members })).sort((a, b) => Number(a.value) - Number(b.value));
}

/** Parameters that take two or more values among presets, so splitting by them reduces the candidates (in PARAM_NAMES order). */
export const splittingParams = (presets: readonly Preset[]): ParamName[] =>
  PARAM_NAMES.filter((param) => branches(presets, param).length >= 2);

/**
 * Fits path to presets; at the first parameter that cannot split or value with no candidates, the path is cut just before it.
 * open is kept only when it is a parameter that can split the remaining candidates.
 */
export function fitPath(presets: readonly Preset[], path: NarrowPath): NarrowPath {
  const fixed: Choice[] = [];
  let candidates = presets;
  for (const choice of path.fixed) {
    const next = matching(candidates, [choice]);
    if (!splittingParams(candidates).includes(choice.param) || next.length === 0) return { fixed };
    fixed.push(choice);
    candidates = next;
  }
  return path.open && splittingParams(candidates).includes(path.open) ? { fixed, open: path.open } : { fixed };
}

const isFlag = (param: ParamName) => param === "refin" || param === "refout";

/** Text form of a value: width in decimal, refin and refout as true/false, others in uppercase hex. */
export function formatValue(param: ParamName, value: ParamValue): string {
  if (isFlag(param) || param === "width") return String(value);
  return `0x${Number(value).toString(16).toUpperCase()}`;
}

/** Turns formatValue text back into a value; undefined if it cannot be parsed. */
export function parseValue(param: ParamName, text: string): ParamValue | undefined {
  if (isFlag(param)) return text === "true" ? true : text === "false" ? false : undefined;
  const pattern = param === "width" ? /^\d+$/ : /^0x[0-9a-f]+$/i;
  return pattern.test(text) ? Number(text) : undefined;
}
