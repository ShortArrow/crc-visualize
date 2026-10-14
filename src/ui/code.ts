import type { CrcParams, Step, StepKind } from "../domain/trace";
import type { Messages } from "../i18n/messages";
import { CODE_LANGS, type CodeLang } from "./codeLangs";
import { chips, type CodePart } from "./codeTemplate";

export { CODE_LANGS, type CodeLang };
export type { CodePart, ParamChip } from "./codeTemplate";

/**
 * コード 1 行分の表示状態。
 * text: チップを label に置き換えた行の文字列。active: 現在のステップが実行中の行。
 * note: 行末に添える注記。skipped: 分岐で実行されない行。disabled: パラメータが無効で実行されない行。
 */
export type CodeLine = Readonly<{
  parts: readonly CodePart[];
  text: string;
  active: boolean;
  skipped: boolean;
  disabled: boolean;
  note?: string;
}>;

const lineText = (parts: readonly CodePart[]) => parts.map((p) => (typeof p === "string" ? p : p.label)).join("");

/** 分岐 if (feedback == 1) の評価結果。shift ステップでのみ決まる。 */
const branchTaken = (step: Step): boolean | undefined => (step.kind === "shift" ? step.fb === 1 : undefined);

/** パラメータが無効で、kind のステップが実行されない（値を変えない）ときの注記。 */
function disabledNote(kind: StepKind | undefined, p: CrcParams, m: Messages): string | undefined {
  if (kind === "reflectIn" && !p.refin) return m.code.refinOff;
  if (kind === "reflectOut" && !p.refout) return m.code.refoutOff;
  if (kind === "xorOut" && p.xorout === 0) return m.code.xoroutZero;
  return undefined;
}

/** params のコードを lang で書き、step の実行位置と評価結果つきで返す。注記は m の言語で書く。 */
export function codeLines(params: CrcParams, step: Step, m: Messages, lang: CodeLang): CodeLine[] {
  const taken = branchTaken(step);
  const def = CODE_LANGS[lang];
  return def.template(chips(params, def.lit), params).map(({ parts, runs, role }) => {
    const disabled = disabledNote(runs, params, m);
    const active = runs === step.kind;
    const note =
      disabled ??
      (active && step.kind === "feedback"
        ? `msb ${step.msb} ⊕ bit ${step.inBit} = feedback ${step.fb}`
        : role === "if" && taken !== undefined
          ? String(taken)
          : undefined);
    return {
      parts,
      text: lineText(parts),
      active,
      skipped: role === "ifBody" && taken === false,
      disabled: disabled !== undefined,
      ...(note === undefined ? {} : { note }),
    };
  });
}
