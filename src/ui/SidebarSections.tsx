import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/** One section of the sidebar: id names it in localStorage and in data-section. */
export type Section = Readonly<{ id: string; title: string; body: ReactNode }>;

/** localStorage key of the ids of the closed sections; bump the version when the stored format changes. */
export const CLOSED_SECTIONS_KEY = "crc-visualize:sidebar-sections:v1";

/** Ids of the sections the viewer closed; none where storage is unavailable or holds something else. */
function loadClosed(): readonly string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLOSED_SECTIONS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveClosed(closed: readonly string[]): void {
  try {
    localStorage.setItem(CLOSED_SECTIONS_KEY, JSON.stringify(closed));
  } catch {
    return;
  }
}

/**
 * Sections stacked in the sidebar, each opened and closed by pressing its heading (an accordion); all open at first. Which are
 * closed fits the viewer's screen, so it is kept in localStorage only. The heading buttons keep a phone's drawer open (data-stay).
 */
export function SidebarSections({ sections }: Readonly<{ sections: readonly Section[] }>) {
  const [closed, setClosed] = useState(loadClosed);
  useEffect(() => saveClosed(closed), [closed]);
  const toggle = (id: string) => setClosed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  return (
    <>
      {sections.map(({ id, title, body }) => {
        const open = !closed.includes(id);
        const Chevron = open ? ChevronDown : ChevronRight;
        return (
          <section key={id} className={`sidebar-section ${open ? "open" : ""}`} data-section={id}>
            <h2>
              <button type="button" aria-expanded={open} data-stay onClick={() => toggle(id)}>
                <Chevron size={14} />
                {title}
              </button>
            </h2>
            {open ? <div className="sidebar-section-body">{body}</div> : null}
          </section>
        );
      })}
    </>
  );
}
