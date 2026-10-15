/** Languages the UI text is available in. zh is Simplified Chinese. */
export const LOCALES = ["ja", "en", "zh", "es", "de", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

/** Each language's name for itself, shown in the language selector. */
export const LOCALE_NAMES: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
};

export const isLocale = (x: unknown): x is Locale => LOCALES.includes(x as Locale);

/** The first language whose code matches, scanning the browser's preferred languages preferred from the front. English if none matches. */
export function pickLocale(preferred: readonly string[]): Locale {
  return preferred.map((tag) => tag.split("-")[0]!.toLowerCase()).find(isLocale) ?? "en";
}
