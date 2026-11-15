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

/** Turns an item error into text, followed by the line and column of the error in pasted text when it has one. */
export function errorText(m: Messages, error: ConfigError): string {
  const text = message(m, error);
  return "at" in error ? text + m.errors.at(error.at.line, error.at.column) : text;
}

function message(m: Messages, error: ConfigError): string {
  switch (error.code) {
    case "tooWide":
      return m.errors.tooWide(error.width);
    case "tooLong":
    case "tooManyFrames":
    case "frameTooLong":
      return m.errors[error.code](error.max);
    default:
      return m.errors[error.code];
  }
}
