import { ArrowRightLeft, BookOpen, Cpu, ListTree, PanelLeft, RefreshCw, ShieldCheck } from "lucide-react";
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

/**
 * VS Code 風の画面の枠。左端のアクティビティバー、開閉できるサイドバー、エディタ領域、下端のステータスバーに分け、
 * 画面全体に広げる。ページ自体はスクロールさせず、各領域の中だけをスクロールする。
 */
export function Workbench({ route, layout, onLayout, locale, onLocale, sidebar, editor, status }: Props) {
  const m = useMessages();
  const open = layout.sidebarOpen;
  const style = { "--sidebar-width": `${layout.sidebarWidth}px` } as CSSProperties;
  return (
    <div className={`workbench ${open ? "" : "sidebar-closed"}`} style={style}>
      <nav className="activity">
        <a
          href="#"
          className={route.page === "visualizer" ? "current" : ""}
          data-page="visualizer"
          title={m.pages.visualizer}
          aria-label={m.pages.visualizer}
        >
          <Cpu size={ICON_SIZE} />
        </a>
        <a
          href={namesHash()}
          className={route.page === "names" ? "current" : ""}
          data-page="names"
          title={m.pages.names}
          aria-label={m.pages.names}
        >
          <BookOpen size={ICON_SIZE} />
        </a>
        <a
          href={narrowHash({ fixed: [] })}
          className={route.page === "narrow" ? "current" : ""}
          data-page="narrow"
          title={m.pages.narrow}
          aria-label={m.pages.narrow}
        >
          <ListTree size={ICON_SIZE} />
        </a>
        <a
          href="#cyclic"
          className={route.page === "cyclic" ? "current" : ""}
          data-page="cyclic"
          title={m.pages.cyclic}
          aria-label={m.pages.cyclic}
        >
          <RefreshCw size={ICON_SIZE} />
        </a>
        <a
          href="#redundancy"
          className={route.page === "redundancy" ? "current" : ""}
          data-page="redundancy"
          title={m.pages.redundancy}
          aria-label={m.pages.redundancy}
        >
          <ShieldCheck size={ICON_SIZE} />
        </a>
        <a
          href="#equivalence"
          className={route.page === "equivalence" ? "current" : ""}
          data-page="equivalence"
          title={m.pages.equivalence}
          aria-label={m.pages.equivalence}
        >
          <ArrowRightLeft size={ICON_SIZE} />
        </a>
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
