import type { ReactNode } from "react";
import { useMessages } from "../i18n/I18n";
import { useTier } from "./phone";

/**
 * An explanation paragraph of a page. On a short screen it is folded behind an Explanation heading, closed at first, so the
 * drawings and tables after it stay in view (docs/spec.md, Screen tiers); elsewhere it is a plain note.
 */
export function Explanation({ children }: { children: ReactNode }) {
  const m = useMessages();
  const note = <p className="note">{children}</p>;
  if (useTier() !== "short") return note;
  return (
    <details className="explanation" data-explain>
      <summary>{m.workbench.explanation}</summary>
      {note}
    </details>
  );
}
