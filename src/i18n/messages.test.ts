import { describe, expect, it } from "vitest";
import { ja } from "./ja";
import { LOCALES } from "./locale";
import { MESSAGES } from "./messages";

/** Turns the leaves of a dictionary into a list of "path: type". Functions also carry their argument count. */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}: function/${value.length}`];
  if (Array.isArray(value)) return [`${path}: array`];
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  }
  return [`${path}: ${typeof value}`];
}

/** Every text in a dictionary. Functions are called with placeholder values. */
function texts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String(value(...Array.from({ length: value.length }, () => 1)))];
  if (Array.isArray(value)) return value.flatMap(texts);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(texts);
  return [];
}

const KANA = /[぀-ヿ]/;

describe("MESSAGES", () => {
  it.each(LOCALES)(
    "Given the dictionary for language %s, When comparing its shape with the Japanese dictionary, Then it has the same items and arguments",
    (locale) => {
      expect(shape(MESSAGES[locale])).toEqual(shape(ja));
    },
  );

  it.each(LOCALES)(
    "Given the dictionary for language %s, When looking at every text, Then there is no empty text and no empty alias list",
    (locale) => {
      expect(texts(MESSAGES[locale]).filter((t) => t.trim() === "")).toEqual([]);
      expect(Object.values(MESSAGES[locale].params).every((p) => p.aliases.length > 0)).toBe(true);
    },
  );

  it.each(LOCALES.filter((l) => l !== "ja"))(
    "Given the dictionary for language %s, When looking at every text, Then nothing is left untranslated with kana in it",
    (locale) => {
      expect(texts(MESSAGES[locale]).filter((t) => KANA.test(t))).toEqual([]);
    },
  );
});
