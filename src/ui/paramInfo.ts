import { reflectValue, type CrcParams, type ParamName } from "../domain/trace";
import type { Messages } from "../i18n/messages";

/** Settings items other than parameters. Item names are shown in English; each language's name and description appear in the description pane. */
export type FieldName = "preset" | "inputMode" | "input" | "range" | "crcField";

/** Items explained in the description pane. */
export type HelpTopic = ParamName | FieldName;

/** Item names in the settings panel. Shown in English in every language. */
export const FIELD_LABELS: Record<FieldName, string> = {
  preset: "preset",
  inputMode: "input mode",
  input: "input",
  range: "range",
  crcField: "crc in input",
};

const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;

function shiftDirection({ refin, refout }: CrcParams, m: Messages): string {
  if (refin && refout) return m.help.shiftRight;
  if (!refin && !refout) return m.help.shiftLeft;
  return m.help.shiftMixed;
}

/** Notes appended to the description of param depending on the current settings. Text is written in the language of m. */
export function paramNotes(param: ParamName, params: CrcParams, m: Messages): string[] {
  switch (param) {
    case "poly":
      return [m.help.reflectedPoly(hex(reflectValue(params.poly, params.width)))];
    case "refin":
    case "refout":
      return [shiftDirection(params, m)];
    default:
      return [];
  }
}
