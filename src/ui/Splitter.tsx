import type { PointerEvent } from "react";

/**
 * 領域の境界。ドラッグ中はポインタの位置（axis が "x" なら clientX、"y" なら clientY）を onMove に渡し続ける。
 * axis が "x" の境界は左右の領域を、"y" の境界は上下の領域を分ける。
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
