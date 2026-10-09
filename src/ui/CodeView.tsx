import type { CrcParams, Step } from "../domain/trace";
import { codeLines, type CodePart } from "./code";
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

type Props = Readonly<{ params: CrcParams; step: Step; focus: ParamFocus }>;

/** 擬似コード（ソフトウェア表現）。現在のステップの行をハイライトし、パラメータをチップで示す。 */
export function CodeView({ params, step, focus }: Props) {
  return (
    <pre className="code">
      {codeLines(params, step).map((line, i) => {
        const flags = [line.active && "active", line.skipped && "skipped", line.disabled && "disabled"];
        return (
          <div key={i} className={["code-line", ...flags].filter(Boolean).join(" ")}>
            <span className="ln">{i + 1}</span>
            <span className="code-text">
              {line.parts.map((part, k) => (
                <Part key={k} part={part} focus={focus} />
              ))}
            </span>
            {line.note ? <span className={`note note-${line.note}`}>{`// ${line.note}`}</span> : null}
          </div>
        );
      })}
    </pre>
  );
}
