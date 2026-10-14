/**
 * 画面割り。sidebarWidth はサイドバーの幅（px）、panelRatio はエディタ領域のうち下のパネルが占める高さの比、
 * codeRatio は下のパネルのうち擬似コードが占める幅の比。見る人の画面に合わせる設定なので URL には載せない。
 */
export type PaneLayout = Readonly<{ sidebarOpen: boolean; sidebarWidth: number; panelRatio: number; codeRatio: number }>;

export const DEFAULT_PANES: PaneLayout = { sidebarOpen: true, sidebarWidth: 300, panelRatio: 0.4, codeRatio: 0.6 };

/** localStorage のキー。保存形式を変えるときは版を上げる。 */
export const PANES_KEY = "crc-visualize:panes:v1";

const MIN_SIDEBAR = 200;
const MIN_RATIO = 0.15;
const MAX_RATIO = 0.85;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isNumber = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** 保存文字列 raw から画面割りを復元する。読めない・形の正しくない項目は既定値にする。 */
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

/** 画面割りを横幅 viewWidth（px）の画面に収める。サイドバーは 200px から画面の半分まで、境界の比は 0.15〜0.85。 */
export function fitLayout(layout: PaneLayout, viewWidth: number): PaneLayout {
  return {
    ...layout,
    sidebarWidth: Math.round(clamp(layout.sidebarWidth, MIN_SIDEBAR, Math.max(MIN_SIDEBAR, viewWidth / 2))),
    panelRatio: clamp(layout.panelRatio, MIN_RATIO, MAX_RATIO),
    codeRatio: clamp(layout.codeRatio, MIN_RATIO, MAX_RATIO),
  };
}

/** localStorage から画面割りを読む。ストレージが使えない環境では既定値を返す。 */
export function loadLayout(): PaneLayout {
  try {
    return restoreLayout(localStorage.getItem(PANES_KEY));
  } catch {
    return DEFAULT_PANES;
  }
}

/** 画面割りを localStorage に書く。ストレージが使えない環境では何もしない。 */
export function saveLayout(layout: PaneLayout): void {
  try {
    localStorage.setItem(PANES_KEY, JSON.stringify(layout));
  } catch {
    return;
  }
}
