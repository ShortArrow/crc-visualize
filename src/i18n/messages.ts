import type { ConfigError } from "../domain/parse";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ja, type Messages } from "./ja";
import type { Locale } from "./locale";
import { zh } from "./zh";

export type { Messages };

/** 言語ごとの画面の文。 */
export const MESSAGES: Record<Locale, Messages> = { ja, en, zh, es, de, fr };

/** 項目の誤り error を文にする。 */
export function errorText(m: Messages, error: ConfigError): string {
  switch (error.code) {
    case "tooWide":
      return m.errors.tooWide(error.width);
    case "tooLong":
      return m.errors.tooLong(error.max);
    default:
      return m.errors[error.code];
  }
}
