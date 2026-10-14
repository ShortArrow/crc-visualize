import type { Preset } from "./presets";
import { PARAM_NAMES, type CrcParams, type ParamName } from "./trace";

type ParamValue = CrcParams[ParamName];

/** 固定したパラメータとその値。 */
export type Choice = Readonly<{ param: ParamName; value: ParamValue }>;

/** 固定の道筋。fixed は固定した順の値、open は値をまだ選んでいない最後の分かれ目。 */
export type NarrowPath = Readonly<{ fixed: readonly Choice[]; open?: ParamName }>;

/** 分かれ目の 1 本の枝。presets はその値を持つ候補（元の順）。 */
export type Branch = Readonly<{ value: ParamValue; presets: readonly Preset[] }>;

/** fixed の全ての値と一致するプリセット（元の順）。 */
export const matching = (presets: readonly Preset[], fixed: readonly Choice[]): readonly Preset[] =>
  presets.filter((p) => fixed.every((c) => p.params[c.param] === c.value));

/** presets を param の値ごとに分け、値の小さい順（偽が先）に並べる。 */
export function branches(presets: readonly Preset[], param: ParamName): Branch[] {
  const groups = new Map<ParamValue, Preset[]>();
  for (const p of presets) groups.set(p.params[param], [...(groups.get(p.params[param]) ?? []), p]);
  return [...groups].map(([value, members]) => ({ value, presets: members })).sort((a, b) => Number(a.value) - Number(b.value));
}

/** presets の中で値が 2 通り以上あり、分けると候補が減るパラメータ（PARAM_NAMES の順）。 */
export const splittingParams = (presets: readonly Preset[]): ParamName[] =>
  PARAM_NAMES.filter((param) => branches(presets, param).length >= 2);

/**
 * path を presets に収める。分けられないパラメータか候補の無い値が現れたら、その手前までの道筋にする。
 * open は、残りの候補で分けられるパラメータのときだけ残す。
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

/** 値の表記。width は 10 進、refin・refout は true/false、他は大文字の 16 進。 */
export function formatValue(param: ParamName, value: ParamValue): string {
  if (isFlag(param) || param === "width") return String(value);
  return `0x${Number(value).toString(16).toUpperCase()}`;
}

/** formatValue の表記を値に戻す。解釈できなければ undefined。 */
export function parseValue(param: ParamName, text: string): ParamValue | undefined {
  if (isFlag(param)) return text === "true" ? true : text === "false" ? false : undefined;
  const pattern = param === "width" ? /^\d+$/ : /^0x[0-9a-f]+$/i;
  return pattern.test(text) ? Number(text) : undefined;
}
