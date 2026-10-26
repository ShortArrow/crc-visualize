/** Horizontal span of a scroll view: its scroll position and visible width. */
export type View = Readonly<{ left: number; width: number }>;

/** Horizontal span of content, in the same coordinates as the scroll position. */
export type Span = Readonly<{ from: number; to: number }>;

/**
 * Scroll position that brings line into view along the axis of view, when the first covered px of the view are hidden under a sticky
 * heading. Keeps left when line is wholly in the uncovered part; otherwise puts its start just below the covered part, never below 0.
 */
export function lineScroll(view: View, covered: number, line: Span): number {
  if (line.from >= view.left + covered && line.to <= view.left + view.width) return view.left;
  return Math.max(0, line.from - covered);
}

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
 * Scrolls scroller to bring the element matching msb and the leftmost element matching flowing into view (see followTarget and
 * followScroll), sideways and, when the diagram is taller than the scroller, up or down. Does nothing when none match.
 */
export function followElements(scroller: HTMLElement, msb: string, flowing: string): void {
  const msbBox = scroller.querySelector(msb)?.getBoundingClientRect();
  const flowBoxes = [...scroller.querySelectorAll(flowing)].map((e) => e.getBoundingClientRect());
  const area = scroller.getBoundingClientRect();
  const [x0, y0] = [area.left - scroller.scrollLeft, area.top - scroller.scrollTop];
  const target = followTarget(
    msbBox && { from: msbBox.left - x0, to: msbBox.right - x0 },
    flowBoxes.map((b) => ({ from: b.left - x0, to: b.right - x0 })),
  );
  if (!target) return;
  const boxes = [msbBox, ...flowBoxes].filter(
    (b): b is DOMRect => b !== undefined && b.right - x0 >= target.from && b.left - x0 <= target.to,
  );
  const vertical = { from: Math.min(...boxes.map((b) => b.top)) - y0, to: Math.max(...boxes.map((b) => b.bottom)) - y0 };
  const left = followScroll({ left: scroller.scrollLeft, width: scroller.clientWidth }, target);
  const top = followScroll({ left: scroller.scrollTop, width: scroller.clientHeight }, vertical);
  if (left !== scroller.scrollLeft || top !== scroller.scrollTop) scroller.scrollTo({ left, top, behavior: "smooth" });
}

/**
 * What the diagram follows at a step: from the most significant register to the head of the flow (the leftmost part values flow
 * through), so both are kept in view together when they fit. Either may be missing; undefined when both are.
 */
export function followTarget(msb: Span | undefined, flowing: readonly Span[]): Span | undefined {
  const head = flowing.reduce<Span | undefined>((left, span) => (left && left.from <= span.from ? left : span), undefined);
  if (!msb || !head) return msb ?? head;
  return { from: Math.min(msb.from, head.from), to: Math.max(msb.to, head.to) };
}
