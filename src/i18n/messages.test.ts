import { describe, expect, it } from "vitest";
import { ja } from "./ja";
import { LOCALES } from "./locale";
import { MESSAGES } from "./messages";

/** 辞書の葉を "path: 型" の並びにする。関数は引数の数も添える。 */
function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}: function/${value.length}`];
  if (Array.isArray(value)) return [`${path}: array`];
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  }
  return [`${path}: ${typeof value}`];
}

/** 辞書の全ての文。関数は仮の値を入れて呼ぶ。 */
function texts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String(value(...Array.from({ length: value.length }, () => 1)))];
  if (Array.isArray(value)) return value.flatMap(texts);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(texts);
  return [];
}

const KANA = /[぀-ヿ]/;

describe("MESSAGES", () => {
  it.each(LOCALES)("Given 言語 %s の辞書, When 日本語の辞書と形を比べる, Then 同じ項目と引数を持つ", (locale) => {
    expect(shape(MESSAGES[locale])).toEqual(shape(ja));
  });

  it.each(LOCALES)("Given 言語 %s の辞書, When 全ての文を見る, Then 空の文も空の別名の並びも無い", (locale) => {
    expect(texts(MESSAGES[locale]).filter((t) => t.trim() === "")).toEqual([]);
    expect(Object.values(MESSAGES[locale].params).every((p) => p.aliases.length > 0)).toBe(true);
  });

  it.each(LOCALES.filter((l) => l !== "ja"))(
    "Given 言語 %s の辞書, When 全ての文を見る, Then 仮名を含む訳し残しが無い",
    (locale) => {
      expect(texts(MESSAGES[locale]).filter((t) => KANA.test(t))).toEqual([]);
    },
  );
});
