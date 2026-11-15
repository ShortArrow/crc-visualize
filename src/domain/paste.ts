/** The base numbers without 0x are read in. */
export type Base = 16 | 10;

/** The size of one element where bytes are read, and the order its bytes are laid out in: be high byte first, le low byte first. */
export type Element = Readonly<{ bits: 8 | 16 | 32; order: "be" | "le" }>;

/** A place in pasted text, both counted from 1, the column in characters. */
export type Position = Readonly<{ line: number; column: number }>;

/**
 * Errors in pasted text. badChar: a character that is neither part of a number nor a separator. hexInDecimal: a number with 0x
 * while the base is 10. oddHex: a hexadecimal number without 0x of an odd number of digits where it is split into bytes.
 * tooWide: a number that does not fit in width bits. oneValue: a second number where one value is read. notHex: no number at all.
 */
export type PasteError =
  | Readonly<{ code: "badChar" | "hexInDecimal" | "oddHex" | "oneValue"; at: Position }>
  | Readonly<{ code: "tooWide"; width: number; at: Position }>
  | Readonly<{ code: "notHex" }>;

export type Read<T> = { ok: true; value: T } | { ok: false; error: PasteError };

type Token = Readonly<{ text: string; at: Position }>;

const SEPARATOR = /[\s,;{}[\]()]/u;
const DIGITS: Record<Base, RegExp> = { 16: /[0-9a-f]/i, 10: /[0-9]/ };

const ok = <T>(value: T): Read<T> => ({ ok: true, value });
const fail = (error: PasteError): Read<never> => ({ ok: false, error });

/** Splits each line into the runs of characters between separators. */
function tokenLines(text: string): Token[][] {
  return text.split(/\r?\n/).map((line, i) => {
    const tokens: Token[] = [];
    const chars = [...line];
    let start = -1;
    chars.forEach((c, j) => {
      if (SEPARATOR.test(c)) {
        if (start >= 0) tokens.push({ text: chars.slice(start, j).join(""), at: { line: i + 1, column: start + 1 } });
        start = -1;
      } else if (start < 0) start = j;
    });
    if (start >= 0) tokens.push({ text: chars.slice(start).join(""), at: { line: i + 1, column: start + 1 } });
    return tokens;
  });
}

type NumberToken = Readonly<{ digits: string; prefixed: boolean; at: Position }>;

/** Checks that a token is one number in base, and splits off its 0x. */
function readNumber(token: Token, base: Base): Read<NumberToken> {
  const chars = [...token.text];
  const prefixed = chars.length > 2 && chars[0] === "0" && (chars[1] === "x" || chars[1] === "X");
  if (prefixed && base === 10) return fail({ code: "hexInDecimal", at: token.at });
  const skip = prefixed ? 2 : 0;
  const bad = chars.findIndex((c, j) => j >= skip && !DIGITS[base].test(c));
  if (bad >= 0) return fail({ code: "badChar", at: { line: token.at.line, column: token.at.column + bad } });
  return ok({ digits: chars.slice(skip).join(""), prefixed, at: token.at });
}

const valueOf = (n: NumberToken, base: Base): bigint => BigInt(base === 16 ? `0x${n.digits}` : n.digits);

function fitting(n: NumberToken, base: Base, width: number): Read<bigint> {
  const v = valueOf(n, base);
  return v < 1n << BigInt(width) ? ok(v) : fail({ code: "tooWide", width, at: n.at });
}

/** The bytes one number stands for: pairs of digits for bare hex in 8-bit elements, otherwise one element in its byte order. */
function bytesOf(n: NumberToken, base: Base, element: Element): Read<number[]> {
  if (base === 16 && !n.prefixed && element.bits === 8) {
    if (n.digits.length % 2 !== 0) return fail({ code: "oddHex", at: n.at });
    return ok(n.digits.match(/../g)!.map((h) => Number.parseInt(h, 16)));
  }
  const v = fitting(n, base, element.bits);
  if (!v.ok) return v;
  const count = element.bits / 8;
  const be = Array.from({ length: count }, (_, k) => Number((v.value >> BigInt(8 * (count - 1 - k))) & 0xffn));
  return ok(element.order === "be" ? be : be.reverse());
}

/** Reads each line of the text as numbers in base, stopping at the first error. Lines without a number are left out. */
function readLines<T>(text: string, base: Base, each: (n: NumberToken) => Read<T>): Read<T[][]> {
  const lines: T[][] = [];
  for (const tokens of tokenLines(text)) {
    const line: T[] = [];
    for (const token of tokens) {
      const n = readNumber(token, base);
      if (!n.ok) return n;
      const v = each(n.value);
      if (!v.ok) return v;
      line.push(v.value);
    }
    if (line.length > 0) lines.push(line);
  }
  return ok(lines);
}

/** Reads pasted text as bytes, one frame per line that holds a number, as spec chapter 2 "Reading pasted text" says. */
export function readBytes(text: string, base: Base, element: Element): Read<number[][]> {
  const lines = readLines(text, base, (n) => bytesOf(n, base, element));
  return lines.ok ? ok(lines.value.map((line) => line.flat())) : lines;
}

/** Reads pasted text as values, each number one value that fits in width bits. */
export function readValues(text: string, base: Base, width: number): Read<bigint[]> {
  const lines = readLines(text, base, (n) => fitting(n, base, width));
  return lines.ok ? ok(lines.value.flat()) : lines;
}

/** Reads pasted text as exactly one value that fits in width bits. */
export function readValue(text: string, base: Base, width: number): Read<bigint> {
  const tokens = tokenLines(text).flat();
  const values = readValues(text, base, width);
  if (!values.ok) return values;
  if (values.value.length === 0) return fail({ code: "notHex" });
  if (values.value.length > 1) return fail({ code: "oneValue", at: tokens[1]!.at });
  return ok(values.value[0]!);
}

/** The choices of the element badge, as they are written in the URL. */
export const ELEMENT_IDS = ["8", "16be", "16le", "32be", "32le"] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

/** The element an element badge choice stands for. */
export function elementOf(id: ElementId): Element {
  const bits = Number.parseInt(id, 10) as Element["bits"];
  return { bits, order: id.endsWith("le") ? "le" : "be" };
}
