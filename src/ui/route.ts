import { DEFAULT_GENERATOR, findGenerator, type Generator } from "../domain/cyclic";
import { formatValue, parseValue, type Choice, type NarrowPath } from "../domain/narrow";
import { PARAM_NAMES, type ParamName } from "../domain/trace";

/**
 * The page a URL fragment points to. param is the parameter row highlighted on the naming-rules page,
 * path is the fixed path on the narrowing page (as written, before being fitted to the candidates), and generator is the generator polynomial on pages that show a chosen generator polynomial.
 */
export type Route =
  | Readonly<{ page: "visualizer" }>
  | Readonly<{ page: "names"; param?: ParamName }>
  | Readonly<{ page: "narrow"; path: NarrowPath }>
  | Readonly<{ page: "equivalence" }>
  | Readonly<{ page: "check" }>
  | Readonly<{ page: "table" }>
  | Readonly<{ page: GeneratorPage; generator: Generator }>;

/** A page that shows a generator polynomial chosen from the list. */
export type GeneratorPage = "cyclic" | "redundancy";

const GENERATOR_PAGES: readonly string[] = ["cyclic", "redundancy"] satisfies GeneratorPage[];

/** Fragment of the naming-rules page. Passing param points to its row. */
export const namesHash = (param?: ParamName): string => (param ? `#names/${param}` : "#names");

/** Fragment of the narrowing page. Appends the fixed values as "/<name>=<value>" in order, then the open branch as "/<name>" last. */
export const narrowHash = ({ fixed, open }: NarrowPath): string =>
  ["#narrow", ...fixed.map((c) => `${c.param}=${formatValue(c.param, c.value)}`), ...(open ? [open] : [])].join("/");

/** Fragment pointing to generator polynomial g on page, a page that shows a chosen generator polynomial. */
export const generatorHash = (page: GeneratorPage, { width, poly }: Generator): string =>
  `#${page}/width=${formatValue("width", width)}/poly=${formatValue("poly", poly)}`;

const isGeneratorPage = (page: string | undefined): page is GeneratorPage => GENERATOR_PAGES.includes(page ?? "");

const isParam = (name: string | undefined): name is ParamName => PARAM_NAMES.includes(name as ParamName);

/** Determines the page from the fragment hash (such as "#names/poly"). */
export function parseRoute(hash: string): Route {
  const [page, ...rest] = hash.replace(/^#/, "").split("/");
  if (page === "equivalence") return { page: "equivalence" };
  if (page === "check") return { page: "check" };
  if (page === "table") return { page: "table" };
  if (page === "narrow") return { page: "narrow", path: parseNarrowPath(rest) };
  if (isGeneratorPage(page)) return { page, generator: parseGenerator(rest) ?? DEFAULT_GENERATOR };
  if (page !== "names") return { page: "visualizer" };
  return isParam(rest[0]) ? { page: "names", param: rest[0] } : { page: "names" };
}

/** Reads a narrowing path split by "/". Stops just before the first part that cannot be parsed. */
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

/** Finds a generator polynomial in the list from a sequence of "width=<decimal>" and "poly=<hex>". */
function parseGenerator([widthPart, polyPart]: readonly string[]): Generator | undefined {
  const width = widthPart?.startsWith("width=") ? parseValue("width", widthPart.slice(6)) : undefined;
  const poly = polyPart?.startsWith("poly=") ? parseValue("poly", polyPart.slice(5)) : undefined;
  return typeof width === "number" && typeof poly === "number" ? findGenerator(width, poly) : undefined;
}
