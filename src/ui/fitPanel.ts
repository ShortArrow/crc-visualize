import { useLayoutEffect, useState, type DependencyList, type RefObject } from "react";
import { fitPanelRatio } from "./panes";

const px = (value: string) => parseFloat(value) || 0;

/** Measures the split and the diagram's area in hardware, and returns fitPanelRatio of ratio for them. */
function measure(split: HTMLElement, hardware: HTMLElement, ratio: number): number {
  const svg = hardware.querySelector<SVGSVGElement>("svg.lfsr");
  const head = hardware.querySelector<HTMLElement>(".hardware-head");
  const splitter = split.querySelector<HTMLElement>('[data-splitter="panel"]');
  if (!svg || !head) return ratio;
  const area = getComputedStyle(hardware);
  const view = svg.viewBox.baseVal;
  return fitPanelRatio(
    ratio,
    {
      height: split.clientHeight - (splitter?.offsetHeight ?? 0),
      chrome: head.offsetHeight + px(area.paddingTop) + px(area.paddingBottom),
      width: hardware.clientWidth - px(area.paddingLeft) - px(area.paddingRight),
    },
    { width: view.width, height: view.height },
    px(getComputedStyle(svg).minWidth),
  );
}

/**
 * The bottom panel's share of the visualizer's split: ratio, raised while the diagram shrinks to its area's width so that the area ends
 * right below the diagram (docs/spec.md, Screen tiers). It is measured again whenever the split changes size or deps change, and is
 * ratio itself while fitting is off (a phone, or a zoomed diagram).
 */
export function useFittedPanelRatio(
  split: RefObject<HTMLElement | null>,
  hardware: RefObject<HTMLElement | null>,
  ratio: number,
  fitting: boolean,
  deps: DependencyList,
): number {
  const [fitted, setFitted] = useState(ratio);
  useLayoutEffect(() => {
    const [s, h] = [split.current, hardware.current];
    if (!fitting || !s || !h) {
      setFitted(ratio);
      return;
    }
    const update = () => setFitted(measure(s, h, ratio));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(s);
    return () => observer.disconnect();
  }, [ratio, fitting, ...deps]);
  return fitted;
}
