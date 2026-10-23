import type { CrcParams, Step, StepKind } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { CODE_LANGS, codeLines, type CodeLang, type CodePart } from "./code";
import { focusHandlers, type ParamFocus } from "./paramFocus";

function Part({ part, focus }: { part: CodePart; focus: ParamFocus }) {
  if (typeof part === "string") return <>{part}</>;
  return (
    <span
      className={`chip ${focus.focused === part.param ? "hl" : ""}`}
      data-param={part.param}
      tabIndex={0}
      {...focusHandlers(focus, part.param)}
    >
      <span className="chip-name">{part.label}</span>
      <span className="chip-value">{part.value}</span>
    </span>
  );
}

type Props = Readonly<{
  params: CrcParams;
  step: Step;
  focus: ParamFocus;
  lang: CodeLang;
  /** Line breakpoints by the step kind their line runs: true if enabled, false if disabled. */
  lineBreaks: ReadonlyMap<StepKind, boolean>;
  onToggleLine: (runs: StepKind) => void;
}>;

/**
 * Writes the code (software representation) in lang. Highlights the line of the current step and shows parameters as chips.
 * Left of the line number of each line that runs a step, pressing sets or removes a breakpoint, shown as a dot (bp-set, or bp-off
 * when disabled).
 */
export function CodeView({ params, step, focus, lang, lineBreaks, onToggleLine }: Props) {
  const m = useMessages();
  return (
    <pre className="code" data-lang={lang}>
      {codeLines(params, step, m, lang).map((line, i) => {
        const flags = [line.active && "active", line.skipped && "skipped", line.disabled && "disabled"];
        return (
          <div key={i} className={["code-line", ...flags].filter(Boolean).join(" ")}>
            {line.runs ? (
              <button
                type="button"
                className={`bp-gutter ${{ true: "bp-set", false: "bp-off", undefined: "" }[String(lineBreaks.get(line.runs))]}`}
                title={m.debug.toggleLine}
                aria-label={m.debug.toggleLine}
                onClick={() => onToggleLine(line.runs!)}
              />
            ) : (
              <span className="bp-gutter" />
            )}
            <span className="ln">{i + 1}</span>
            <span className="code-text">
              {line.parts.map((part, k) => (
                <Part key={k} part={part} focus={focus} />
              ))}
            </span>
            {line.note ? <span className={`note note-${line.note}`}>{`${CODE_LANGS[lang].comment} ${line.note}`}</span> : null}
          </div>
        );
      })}
    </pre>
  );
}

const CODE_LANG_IDS = Object.keys(CODE_LANGS) as CodeLang[];

/** Selects the language to write the code in. Only the pseudocode name is shown in the display language. */
export function CodeLangSelect({ value, onChange }: Readonly<{ value: CodeLang; onChange: (lang: CodeLang) => void }>) {
  const m = useMessages();
  return (
    <select
      className="code-lang"
      value={value}
      title={m.code.language}
      aria-label={m.code.language}
      onChange={(e) => onChange(e.target.value as CodeLang)}
    >
      {CODE_LANG_IDS.map((id) => (
        <option key={id} value={id}>
          {id === "pseudo" ? m.code.pseudo : CODE_LANGS[id].label}
        </option>
      ))}
    </select>
  );
}
