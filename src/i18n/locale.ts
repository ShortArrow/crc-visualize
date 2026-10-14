/** 画面の文を出せる言語。zh は簡体字の中国語。 */
export const LOCALES = ["ja", "en", "zh", "es", "de", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

/** 言語の選択肢に出す、各言語の自称。 */
export const LOCALE_NAMES: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
};

export const isLocale = (x: unknown): x is Locale => LOCALES.includes(x as Locale);

/** ブラウザの優先言語の並び preferred を先頭から見て、言語コードが一致した最初の言語。どれとも一致しなければ英語。 */
export function pickLocale(preferred: readonly string[]): Locale {
  return preferred.map((tag) => tag.split("-")[0]!.toLowerCase()).find(isLocale) ?? "en";
}
