import type { KeyboardEvent } from "react";
import { useMessages } from "../i18n/I18n";

/** The panes of the Visualizer's panel that a short screen shows one at a time. */
export type PanelTab = "software" | "log";

const TABS: readonly PanelTab[] = ["software", "log"];

/**
 * Tabs choosing which pane of the Visualizer's panel a short screen shows (docs/spec.md, Screen tiers). The arrow keys, Home and
 * End move between them, as in a WAI-ARIA tab list.
 */
export function PanelTabs({ value, onChange }: { value: PanelTab; onChange: (tab: PanelTab) => void }) {
  const m = useMessages();
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = TABS.indexOf(value);
    const next =
      e.key === "ArrowRight"
        ? TABS[(at + 1) % TABS.length]
        : e.key === "ArrowLeft"
          ? TABS[(at + TABS.length - 1) % TABS.length]
          : e.key === "Home"
            ? TABS[0]
            : e.key === "End"
              ? TABS.at(-1)
              : undefined;
    if (!next) return;
    e.preventDefault();
    onChange(next);
    e.currentTarget.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
  };
  return (
    <div className="panel-tabs" role="tablist" aria-label={m.visualizer.panelTabs} onKeyDown={onKey}>
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`panel-tab-${tab}`}
          aria-controls={`panel-${tab}`}
          aria-selected={tab === value}
          tabIndex={tab === value ? 0 : -1}
          data-tab={tab}
          onClick={() => onChange(tab)}
        >
          {tab === "software" ? m.visualizer.software : m.visualizer.log}
        </button>
      ))}
    </div>
  );
}

/** The tab-panel attributes of the pane for tab while tabs are shown (short is true), hiding it unless it is chosen; none otherwise. */
export function tabPanel(short: boolean, tab: PanelTab, chosen: PanelTab) {
  return short ? { id: `panel-${tab}`, role: "tabpanel", "aria-labelledby": `panel-tab-${tab}`, hidden: tab !== chosen } : {};
}
