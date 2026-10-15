import type { PointerEvent } from "react";

/**
 * Boundary between areas. While dragging, keeps passing the pointer position (clientX if axis is "x", clientY if "y") to onMove.
 * An "x" boundary splits left and right areas; a "y" boundary splits top and bottom areas.
 */
export function Splitter({ axis, name, onMove }: { axis: "x" | "y"; name: string; onMove: (position: number) => void }) {
  const position = (e: PointerEvent) => (axis === "x" ? e.clientX : e.clientY);
  return (
    <div
      className={`splitter splitter-${axis}`}
      data-splitter={name}
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onMove(position(e));
      }}
    />
  );
}
