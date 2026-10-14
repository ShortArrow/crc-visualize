import { formatValue, parseValue, type Choice, type NarrowPath } from "../domain/narrow";
import { PARAM_NAMES, type ParamName } from "../domain/trace";

/**
 * URL のフラグメントが指すページ。param は名前の規則のページで強調するパラメータの行、
 * path は絞り込みのページの固定の道筋（候補に収める前の、書かれたとおりのもの）。
 */
export type Route =
  | Readonly<{ page: "visualizer" }>
  | Readonly<{ page: "names"; param?: ParamName }>
  | Readonly<{ page: "narrow"; path: NarrowPath }>;

/** 名前の規則のページのフラグメント。param を渡すとその行を指す。 */
export const namesHash = (param?: ParamName): string => (param ? `#names/${param}` : "#names");

/** 絞り込みのページのフラグメント。固定した値を "/<名前>=<値>" で順に、開いた分かれ目を "/<名前>" で最後に付ける。 */
export const narrowHash = ({ fixed, open }: NarrowPath): string =>
  ["#narrow", ...fixed.map((c) => `${c.param}=${formatValue(c.param, c.value)}`), ...(open ? [open] : [])].join("/");

const isParam = (name: string | undefined): name is ParamName => PARAM_NAMES.includes(name as ParamName);

/** フラグメント hash（"#names/poly" など）からページを決める。 */
export function parseRoute(hash: string): Route {
  const [page, ...rest] = hash.replace(/^#/, "").split("/");
  if (page === "narrow") return { page: "narrow", path: parseNarrowPath(rest) };
  if (page !== "names") return { page: "visualizer" };
  return isParam(rest[0]) ? { page: "names", param: rest[0] } : { page: "names" };
}

/** "/" で分けた絞り込みの道筋を読む。解釈できない部分が現れたら、その手前までにする。 */
function parseNarrowPath(segments: readonly string[]): NarrowPath {
  const fixed: Choice[] = [];
  for (const [i, segment] of segments.entries()) {
    const [name, text] = segment.split("=", 2);
    if (!isParam(name)) break;
    if (text === undefined) return i === segments.length - 1 ? { fixed, open: name } : { fixed };
    const value = parseValue(name, text);
    if (value === undefined) break;
    fixed.push({ param: name, value });
  }
  return { fixed };
}
