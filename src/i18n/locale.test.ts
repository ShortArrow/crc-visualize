import { describe, expect, it } from "vitest";
import { pickLocale } from "./locale";

describe("pickLocale", () => {
  it.each([
    [["ja-JP", "en-US"], "ja"],
    [["zh-CN"], "zh"],
    [["zh-TW", "en"], "zh"],
    [["ko-KR", "fr-CA", "de"], "fr"],
    [["ES"], "es"],
    [["de-AT"], "de"],
  ] as const)("Given ブラウザの優先言語 %j, When 表示言語を決める, Then 言語コードが一致した最初の %s", (preferred, locale) => {
    expect(pickLocale(preferred)).toBe(locale);
  });

  it.each([[[]], [["ko-KR", "ru"]]] as const)(
    "Given どれとも一致しない優先言語 %j, When 表示言語を決める, Then 英語",
    (preferred) => {
      expect(pickLocale(preferred)).toBe("en");
    },
  );
});
