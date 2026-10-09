import type { CrcParams, Step } from "../domain/trace";
import { codeLines } from "./code";

/** 擬似コード（ソフトウェア表現）。現在のステップの行をハイライトする。 */
export function CodeView({ params, step }: Readonly<{ params: CrcParams; step: Step }>) {
  return (
    <pre className="code">
      {codeLines(params, step).map((line, i) => (
        <div key={i} className={`code-line ${line.active ? "active" : ""} ${line.skipped ? "skipped" : ""}`}>
          <span className="ln">{i + 1}</span>
          <span>{line.text}</span>
          {line.note ? <span className={`note note-${line.note}`}>{`// ${line.note}`}</span> : null}
        </div>
      ))}
    </pre>
  );
}
