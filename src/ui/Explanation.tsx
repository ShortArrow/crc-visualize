import { Children, type ReactNode } from "react";
import { useMessages } from "../i18n/I18n";
import { useTier } from "./phone";

/**
 * Explanation paragraphs of a page, one paragraph per child. On a short screen they are folded together behind one Explanation
 * heading, closed at first, so the drawings and tables after them stay in view (docs/spec.md, Screen tiers); elsewhere they are
 * plain notes.
 */
export function Explanation({ children }: { children: ReactNode }) {
  const m = useMessages();
  const notes = Children.toArray(children).map((child, i) => (
    <p key={i} className="note">
      {child}
    </p>
  ));
  if (useTier() !== "short") return <>{notes}</>;
  return (
    <details className="explanation" data-explain>
      <summary>{m.workbench.explanation}</summary>
      {notes}
    </details>
  );
}
