/** Horizontal span of a scroll view: its scroll position and visible width. */
export type View = Readonly<{ left: number; width: number }>;

/** Horizontal span of content, in the same coordinates as the scroll position. */
export type Span = Readonly<{ from: number; to: number }>;

/**
 * Scroll position that brings span into view. Keeps left when span is already wholly in view; otherwise centres span, or puts its left
 * edge at the left of the view when span is wider than the view. Never below 0.
 */
export function followScroll(view: View, span: Span): number {
  if (span.from >= view.left && span.to <= view.left + view.width) return view.left;
  const size = span.to - span.from;
  const left = size > view.width ? span.from : (span.from + span.to - view.width) / 2;
  return Math.max(0, left);
}

/**
 * Scrolls scroller sideways to bring the union of the elements matching selector inside it into view (see followScroll). Does nothing
 * when none match.
 */
export function followElements(scroller: HTMLElement, selector: string): void {
  const boxes = [...scroller.querySelectorAll(selector)].map((e) => e.getBoundingClientRect());
  if (boxes.length === 0) return;
  const origin = scroller.getBoundingClientRect().left - scroller.scrollLeft;
  const span = { from: Math.min(...boxes.map((b) => b.left)) - origin, to: Math.max(...boxes.map((b) => b.right)) - origin };
  const left = followScroll({ left: scroller.scrollLeft, width: scroller.clientWidth }, span);
  if (left !== scroller.scrollLeft) scroller.scrollTo({ left, behavior: "smooth" });
}
