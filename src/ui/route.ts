import { PARAM_NAMES, type ParamName } from "../domain/trace";

/** URL のフラグメントが指すページ。param は名前の規則のページで強調するパラメータの行。 */
export type Route = Readonly<{ page: "visualizer" }> | Readonly<{ page: "names"; param?: ParamName }>;

/** 名前の規則のページのフラグメント。param を渡すとその行を指す。 */
export const namesHash = (param?: ParamName): string => (param ? `#names/${param}` : "#names");

/** フラグメント hash（"#names/poly" など）からページを決める。 */
export function parseRoute(hash: string): Route {
  const [page, param] = hash.replace(/^#/, "").split("/", 2);
  if (page !== "names") return { page: "visualizer" };
  return PARAM_NAMES.includes(param as ParamName) ? { page: "names", param: param as ParamName } : { page: "names" };
}
