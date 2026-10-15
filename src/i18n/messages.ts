import type { ConfigError } from "../domain/parse";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ja, type Messages } from "./ja";
import type { Locale } from "./locale";
import { zh } from "./zh";

export type { Messages };

/** UI text per language. */
export const MESSAGES: Record<Locale, Messages> = { ja, en, zh, es, de, fr };

/** Turns an item error into text. */
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
