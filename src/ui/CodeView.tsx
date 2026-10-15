import type { CrcParams, Step } from "../domain/trace";
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

type Props = Readonly<{ params: CrcParams; step: Step; focus: ParamFocus; lang: CodeLang }>;

/** Writes the code (software representation) in lang. Highlights the line of the current step and shows parameters as chips. */
export function CodeView({ params, step, focus, lang }: Props) {
  const m = useMessages();
  return (
    <pre className="code" data-lang={lang}>
      {codeLines(params, step, m, lang).map((line, i) => {
        const flags = [line.active && "active", line.skipped && "skipped", line.disabled && "disabled"];
        return (
          <div key={i} className={["code-line", ...flags].filter(Boolean).join(" ")}>
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
