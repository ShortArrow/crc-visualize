/**
 * Pane layout. sidebarWidth is the sidebar width (px), panelRatio is the fraction of the editor area's height taken by the bottom panel,
 * and codeRatio is the fraction of the bottom panel's width taken by the pseudocode. It is fitted to the viewer's screen, so it is not put in the URL.
 */
export type PaneLayout = Readonly<{ sidebarOpen: boolean; sidebarWidth: number; panelRatio: number; codeRatio: number }>;

export const DEFAULT_PANES: PaneLayout = { sidebarOpen: true, sidebarWidth: 300, panelRatio: 0.4, codeRatio: 0.6 };

/** localStorage key. Bump the version when the stored format changes. */
export const PANES_KEY = "crc-visualize:panes:v1";

const MIN_SIDEBAR = 200;
const MIN_RATIO = 0.15;
const MAX_RATIO = 0.85;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isNumber = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Restores the pane layout from the stored string raw. Unreadable or malformed items fall back to the defaults. */
export function restoreLayout(raw: string | null): PaneLayout {
  let v: unknown;
  try {
    v = raw === null ? undefined : JSON.parse(raw);
  } catch {
    v = undefined;
  }
  const s = typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const d = DEFAULT_PANES;
  return {
    sidebarOpen: typeof s.sidebarOpen === "boolean" ? s.sidebarOpen : d.sidebarOpen,
    sidebarWidth: isNumber(s.sidebarWidth) ? s.sidebarWidth : d.sidebarWidth,
    panelRatio: isNumber(s.panelRatio) ? s.panelRatio : d.panelRatio,
    codeRatio: isNumber(s.codeRatio) ? s.codeRatio : d.codeRatio,
  };
}

/** Fits the pane layout to a screen viewWidth (px) wide. The sidebar ranges from 200px to half the screen; split ratios range over 0.15–0.85. */
export function fitLayout(layout: PaneLayout, viewWidth: number): PaneLayout {
  return {
    ...layout,
    sidebarWidth: Math.round(clamp(layout.sidebarWidth, MIN_SIDEBAR, Math.max(MIN_SIDEBAR, viewWidth / 2))),
    panelRatio: clamp(layout.panelRatio, MIN_RATIO, MAX_RATIO),
    codeRatio: clamp(layout.codeRatio, MIN_RATIO, MAX_RATIO),
  };
}

/** Reads the pane layout from localStorage. Returns the defaults where storage is unavailable. */
export function loadLayout(): PaneLayout {
  try {
    return restoreLayout(localStorage.getItem(PANES_KEY));
  } catch {
    return DEFAULT_PANES;
  }
}

/** Writes the pane layout to localStorage. Does nothing where storage is unavailable. */
export function saveLayout(layout: PaneLayout): void {
  try {
    localStorage.setItem(PANES_KEY, JSON.stringify(layout));
  } catch {
    return;
  }
}
