import { reflectValue, type CrcParams, type ParamName } from "../domain/trace";
import type { Messages } from "../i18n/messages";

/** パラメータ以外の設定項目。項目名は英語で示し、各言語の名前と説明は説明欄に出す。 */
export type FieldName = "preset" | "inputMode" | "input";

/** 説明欄で説明する項目。 */
export type HelpTopic = ParamName | FieldName;

/** 設定パネルでの項目名。どの言語でも英語のまま出す。 */
export const FIELD_LABELS: Record<FieldName, string> = { preset: "preset", inputMode: "input mode", input: "input" };

const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;

function shiftDirection({ refin, refout }: CrcParams, m: Messages): string {
  if (refin && refout) return m.help.shiftRight;
  if (!refin && !refout) return m.help.shiftLeft;
  return m.help.shiftMixed;
}

/** 今の設定値に応じて、param の説明に添える注記。文は m の言語で書く。 */
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
