import { useEffect, useRef, type DependencyList, type RefObject } from "react";

/**
 * Scrolls only as far as needed to bring the span from first to last (first above or before last) into view. When the span is
 * taller than the view, first stays in view.
 */
function reveal(first: Element | null, last: Element | null): void {
  last?.scrollIntoView({ block: "nearest", inline: "nearest" });
  first?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Runs action each time deps change after the first render, leaving the first render's scroll position alone. */
function useAfterChange(action: () => void, deps: DependencyList): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    action();
  }, deps);
}

/**
 * Returns a ref whose element is scrolled into view (only as far as needed) each time deps change after the first render, so
 * what an action changed is shown without the viewer scrolling.
 */
export function useReveal<T extends Element>(deps: DependencyList): RefObject<T | null> {
  const ref = useRef<T>(null);
  useAfterChange(() => reveal(ref.current, ref.current), deps);
  return ref;
}

/** Like useReveal, for the span from the element of the first ref to that of the second, which comes after it on the page. */
export function useRevealSpan<A extends Element, B extends Element>(
  deps: DependencyList,
): readonly [RefObject<A | null>, RefObject<B | null>] {
  const first = useRef<A>(null);
  const last = useRef<B>(null);
  useAfterChange(() => reveal(first.current, last.current), deps);
  return [first, last];
}
