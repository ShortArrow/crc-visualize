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
  ] as const)(
    "Given the browser's preferred languages %j, When choosing the display language, Then %s, the first language whose code matches",
    (preferred, locale) => {
      expect(pickLocale(preferred)).toBe(locale);
    },
  );

  it.each([[[]], [["ko-KR", "ru"]]] as const)(
    "Given preferred languages %j that match none, When choosing the display language, Then English",
    (preferred) => {
      expect(pickLocale(preferred)).toBe("en");
    },
  );
});
