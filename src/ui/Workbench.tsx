import {
  ArrowRightLeft,
  BookOpen,
  Cpu,
  ListTree,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  SearchCheck,
  ShieldCheck,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useMessages } from "../i18n/I18n";
import { LOCALE_NAMES, LOCALES, type Locale } from "../i18n/locale";
import { namesHash, narrowHash, type Route } from "./route";
import { DockSlot } from "./Dock";
import { Splitter } from "./Splitter";
import { fitLayout, type PaneLayout } from "./panes";
import { useTier } from "./phone";
import { viewWidth } from "./zoom";

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
  { page: "estimate", href: "#estimate", Icon: Search },
];

/**
 * VS Code-style screen frame. Divides into the activity bar on the left, a collapsible sidebar, the editor area and the status bar at the bottom,
 * filling the whole screen. The page itself does not scroll; only each area scrolls internally.
 * On a phone (class phone), the activity bar runs along the bottom instead, and the sidebar is a drawer over the editor area: closed at
 * first, and closed again on choosing a link or button in it (other than one marked data-stay) or tapping beside it. The drawer's state is not saved in layout. The
 * dock between the editor area and the page links holds the parts the page shows with Docked. Ctrl+B (⌘+B) toggles the sidebar. On a short screen (class short), the
 * layout is the PC one with the parts that take height packed (docs/spec.md, Screen tiers).
 */
export function Workbench({ route, layout, onLayout, locale, onLocale, sidebar, editor, status }: Props) {
  const m = useMessages();
  const tier = useTier();
  const phone = tier === "phone";
  const [drawer, setDrawer] = useState(false);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const open = phone ? drawer : layout.sidebarOpen;
  const toggle = () => (phone ? setDrawer(!drawer) : onLayout({ ...layout, sidebarOpen: !open }));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "b") return;
      e.preventDefault();
      onLayout({ ...layout, sidebarOpen: !layout.sidebarOpen });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const closeOnChoice = (e: MouseEvent) => {
    if (phone && (e.target as Element).closest("a, button:not([data-stay])")) setDrawer(false);
  };
  const style = { "--sidebar-width": `${layout.sidebarWidth}px` } as CSSProperties;
  return (
    <div className={`workbench ${tier === "pc" ? "" : tier} ${open ? "" : "sidebar-closed"}`} style={style}>
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
        <button type="button" className="sidebar-toggle" title={m.workbench.sidebarToggle} aria-pressed={open} onClick={toggle}>
          {open ? <PanelLeftClose size={ICON_SIZE} /> : <PanelLeftOpen size={ICON_SIZE} />}
          {phone ? <span className="sidebar-toggle-label">{m.workbench.sidebarLabel}</span> : null}
        </button>
      </nav>
      {open ? (
        <>
          {phone ? <div className="drawer-shade" onClick={() => setDrawer(false)} /> : null}
          <aside className="sidebar" onClick={closeOnChoice}>
            {sidebar}
          </aside>
          {phone ? null : (
            <Splitter
              axis="x"
              name="sidebar"
              onMove={(x) => onLayout(fitLayout({ ...layout, sidebarWidth: x - ACTIVITY_WIDTH }, viewWidth()))}
            />
          )}
        </>
      ) : null}
      <section className="editor">
        <DockSlot.Provider value={phone ? dock : null}>{editor}</DockSlot.Provider>
      </section>
      {phone ? <div className="dock" ref={setDock} /> : null}
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
