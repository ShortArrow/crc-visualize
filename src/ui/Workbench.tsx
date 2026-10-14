import { BookOpen, Cpu, PanelLeft } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { namesHash, type Route } from "./route";
import { Splitter } from "./Splitter";
import { fitLayout, type PaneLayout } from "./panes";

type Props = Readonly<{
  route: Route;
  layout: PaneLayout;
  onLayout: (layout: PaneLayout) => void;
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
export function Workbench({ route, layout, onLayout, sidebar, editor, status }: Props) {
  const open = layout.sidebarOpen;
  const style = { "--sidebar-width": `${layout.sidebarWidth}px` } as CSSProperties;
  return (
    <div className={`workbench ${open ? "" : "sidebar-closed"}`} style={style}>
      <nav className="activity">
        <a href="#" className={route.page === "visualizer" ? "current" : ""} title="可視化" aria-label="可視化">
          <Cpu size={ICON_SIZE} />
        </a>
        <a href={namesHash()} className={route.page === "names" ? "current" : ""} title="名前の規則" aria-label="名前の規則">
          <BookOpen size={ICON_SIZE} />
        </a>
        <button
          type="button"
          className="sidebar-toggle"
          title="サイドバーの開閉（Ctrl+B）"
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
      <footer className="statusbar">{status}</footer>
    </div>
  );
}
