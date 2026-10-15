import type { CrcParams, Step, StepKind } from "../domain/trace";
import type { Messages } from "../i18n/messages";
import { CODE_LANGS, type CodeLang } from "./codeLangs";
import { chips, type CodePart } from "./codeTemplate";

export { CODE_LANGS, type CodeLang };
export type { CodePart, ParamChip } from "./codeTemplate";

/**
 * Display state of one line of code.
 * text: the line's string with chips replaced by their label. active: the line the current step is executing.
 * note: a note appended to the end of the line. skipped: a line not executed because of the branch. disabled: a line not executed because its parameter is disabled.
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

/** Result of evaluating the branch if (feedback == 1). Decided only in the shift step. */
const branchTaken = (step: Step): boolean | undefined => (step.kind === "shift" ? step.fb === 1 : undefined);

/** Note for when a parameter is disabled and steps of kind are not executed (do not change the value). */
function disabledNote(kind: StepKind | undefined, p: CrcParams, m: Messages): string | undefined {
  if (kind === "reflectIn" && !p.refin) return m.code.refinOff;
  if (kind === "reflectOut" && !p.refout) return m.code.refoutOff;
  if (kind === "xorOut" && p.xorout === 0) return m.code.xoroutZero;
  return undefined;
}

/** Writes the code for params in lang and returns it with the execution position and evaluation results of step. Notes are written in the language of m. */
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
