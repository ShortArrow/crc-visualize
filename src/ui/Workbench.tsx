import {
  ArrowRightLeft,
  BookOpen,
  Cpu,
  ListTree,
  PanelLeft,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Table2,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useMessages } from "../i18n/I18n";
import { LOCALE_NAMES, LOCALES, type Locale } from "../i18n/locale";
import { namesHash, narrowHash, type Route } from "./route";
import { Splitter } from "./Splitter";
import { fitLayout, type PaneLayout } from "./panes";

type Props = Readonly<{
  route: Route;
  layout: PaneLayout;
  onLayout: (layout: PaneLayout) => void;
  locale: Locale;
  onLocale: (locale: Locale) => void;
  sidebar: ReactNode;
  editor: ReactNode;
  status: ReactNode;
}>;

const ICON_SIZE = 22;
const ACTIVITY_WIDTH = 48;

/** Links to the pages in the activity bar, top to bottom. */
const PAGE_LINKS: readonly Readonly<{ page: Route["page"]; href: string; Icon: LucideIcon }>[] = [
  { page: "visualizer", href: "#", Icon: Cpu },
  { page: "names", href: namesHash(), Icon: BookOpen },
  { page: "narrow", href: narrowHash({ fixed: [] }), Icon: ListTree },
  { page: "cyclic", href: "#cyclic", Icon: RefreshCw },
  { page: "redundancy", href: "#redundancy", Icon: ShieldCheck },
  { page: "check", href: "#check", Icon: SearchCheck },
  { page: "equivalence", href: "#equivalence", Icon: ArrowRightLeft },
  { page: "table", href: "#table", Icon: Table2 },
];

/**
 * VS Code-style screen frame. Divides into the activity bar on the left, a collapsible sidebar, the editor area and the status bar at the bottom,
 * filling the whole screen. The page itself does not scroll; only each area scrolls internally.
 */
export function Workbench({ route, layout, onLayout, locale, onLocale, sidebar, editor, status }: Props) {
  const m = useMessages();
  const open = layout.sidebarOpen;
  const style = { "--sidebar-width": `${layout.sidebarWidth}px` } as CSSProperties;
  return (
    <div className={`workbench ${open ? "" : "sidebar-closed"}`} style={style}>
      <nav className="activity">
        {PAGE_LINKS.map(({ page, href, Icon }) => (
          <a
            key={page}
            href={href}
            className={route.page === page ? "current" : ""}
            data-page={page}
            title={m.pages[page]}
            aria-label={m.pages[page]}
          >
            <Icon size={ICON_SIZE} />
          </a>
        ))}
        <button
          type="button"
          className="sidebar-toggle"
          title={m.workbench.sidebarToggle}
          aria-pressed={open}
          onClick={() => onLayout({ ...layout, sidebarOpen: !open })}
        >
          <PanelLeft size={ICON_SIZE} />
        </button>
      </nav>
      {open ? (
        <>
          <aside className="sidebar">{sidebar}</aside>
          <Splitter
            axis="x"
            name="sidebar"
            onMove={(x) => onLayout(fitLayout({ ...layout, sidebarWidth: x - ACTIVITY_WIDTH }, innerWidth))}
          />
        </>
      ) : null}
      <section className="editor">{editor}</section>
      <footer className="statusbar">
        {status}
        <select
          className="locale-select"
          value={locale}
          title={m.workbench.language}
          aria-label={m.workbench.language}
          onChange={(e) => onLocale(e.target.value as Locale)}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </footer>
    </div>
  );
}
