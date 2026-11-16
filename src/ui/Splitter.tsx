import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { screenZoom } from "./zoom";

/** How far one press of an arrow key moves a boundary (px). */
const KEY_STEP = 16;

type Props = Readonly<{
  axis: "x" | "y";
  name: string;
  /** What the boundary resizes, read out for the keyboard. */
  label: string;
  /** A drag started: what onMove's deltas are measured from is as it is now. */
  onStart: () => void;
  /** How far the pointer has moved since the drag started (px, toward the right or the bottom when positive). */
  onMove: (delta: number) => void;
  /** An arrow key moved the boundary by delta px (toward the right or the bottom when positive). */
  onStep: (delta: number) => void;
  /** A double click asked for the boundary's starting position. */
  onReset: () => void;
  /** A drag ended. */
  onEnd: () => void;
}>;

/**
 * Boundary between areas. A drag calls onStart, then keeps passing to onMove how far the pointer has moved along axis since it was
 * pressed, in the app's own CSS px (undoing the enlargement by screenZoom), and calls onEnd when it ends; so the boundary keeps its
 * place under the pointer wherever in its width it was grabbed. It takes the keyboard focus:
 * the arrow keys along axis call onStep, and a double click calls onReset. An "x" boundary splits left and right areas; a "y"
 * boundary splits top and bottom areas.
 */
export function Splitter({ axis, name, label, onStart, onMove, onStep, onReset, onEnd }: Props) {
  const pressed = useRef(0);
  const position = (e: PointerEvent) => (axis === "x" ? e.clientX : e.clientY) / screenZoom();
  const keys = axis === "x" ? { ArrowLeft: -KEY_STEP, ArrowRight: KEY_STEP } : { ArrowUp: -KEY_STEP, ArrowDown: KEY_STEP };
  const onKeyDown = (e: KeyboardEvent) => {
    const delta = (keys as Record<string, number>)[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    onStep(delta);
  };
  return (
    <div
      className={`splitter splitter-${axis}`}
      data-splitter={name}
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
        pressed.current = position(e);
        document.body.dataset.resizing = axis;
        onStart();
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onMove(position(e) - pressed.current);
      }}
      onLostPointerCapture={() => {
        delete document.body.dataset.resizing;
        onEnd();
      }}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
    />
  );
}
