import { useEffect, useRef, useState, type RefObject } from "react";
import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useMessages } from "../i18n/I18n";
import { pinchScale, wheelSteps, zoomBy } from "./diagramScale";

/** The zoom of the diagram: undefined at Fit (the automatic size), otherwise its scale in CSS px per unit of its view box. */
export type DiagramZoom = Readonly<{
  scale: number | undefined;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}>;

/** The scale the diagram in area is drawn at now: the view box fitted into the svg box, as the svg's default aspect ratio does. */
function drawnScale(area: HTMLElement | null): number {
  const svg = area?.querySelector<SVGSVGElement>("svg.lfsr");
  const box = svg?.viewBox.baseVal;
  if (!svg || !box || box.width === 0 || box.height === 0) return 1;
  return Math.min(svg.clientWidth / box.width, svg.clientHeight / box.height);
}

const distance = (touches: TouchList) =>
  Math.hypot(touches[0]!.clientX - touches[1]!.clientX, touches[0]!.clientY - touches[1]!.clientY);

/**
 * Zoom of the diagram drawn in area for the configuration run. It starts at Fit and goes back to Fit whenever run changes; it is not
 * saved. Besides the buttons, Ctrl with the wheel and a two-finger pinch over area zoom it.
 */
export function useDiagramZoom(run: string, area: RefObject<HTMLElement | null>): DiagramZoom {
  const [zoom, setZoom] = useState<{ run: string; scale: number } | undefined>(undefined);
  const scale = zoom?.run === run ? zoom.scale : undefined;
  const current = useRef({ run, scale });
  current.current = { run, scale };
  const zoomTo = (f: (scale: number) => number) => {
    const now = current.current;
    setZoom({ run: now.run, scale: f(now.scale ?? drawnScale(area.current)) });
  };
  const zoomToRef = useRef(zoomTo);
  zoomToRef.current = zoomTo;

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    let pinch: { start: number; scale: number } | undefined;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomToRef.current((s) => zoomBy(s, wheelSteps(e.deltaY)));
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const now = current.current;
      pinch = { start: distance(e.touches), scale: now.scale ?? drawnScale(el) };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const { start, scale } = pinch;
      zoomToRef.current(() => pinchScale(scale, start, distance(e.touches)));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = undefined;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [area]);

  return {
    scale,
    zoomIn: () => zoomTo((s) => zoomBy(s, 1)),
    zoomOut: () => zoomTo((s) => zoomBy(s, -1)),
    fit: () => setZoom(undefined),
  };
}

/** The −, ＋ and Fit buttons of the diagram. */
export function DiagramZoomButtons({ zoom }: { zoom: DiagramZoom }) {
  const m = useMessages();
  const buttons = [
    { key: "out", label: m.visualizer.zoom.out, Icon: ZoomOut, onClick: zoom.zoomOut },
    { key: "in", label: m.visualizer.zoom.in, Icon: ZoomIn, onClick: zoom.zoomIn },
    { key: "fit", label: m.visualizer.zoom.fit, Icon: Maximize, onClick: zoom.fit },
  ] as const;
  return (
    <span className="zoom-buttons">
      {buttons.map(({ key, label, Icon, onClick }) => (
        <button key={key} type="button" data-zoom={key} title={label} aria-label={label} onClick={onClick}>
          <Icon size={16} aria-hidden />
        </button>
      ))}
    </span>
  );
}
