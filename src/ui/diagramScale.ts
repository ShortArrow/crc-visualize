/** Factor one press of − or ＋ changes the diagram's scale by. */
export const ZOOM_STEP = 1.25;
/** Smallest scale of the diagram, in CSS px per unit of its view box, unless the whole width fits only below it (see lowestScale). */
export const MIN_SCALE = 0.25;
/** Largest scale of the diagram, in CSS px per unit of its view box. */
export const MAX_SCALE = 3;

/** How far the diagram zooms out: MIN_SCALE, or lower when its whole width fits its area only at fits. */
export function lowestScale(fits: number): number {
  return Math.min(MIN_SCALE, fits);
}

const clamp = (scale: number, lowest: number) => Math.min(MAX_SCALE, Math.max(lowest, scale));

/** Scale after zooming steps times from scale (positive in, negative out, fractions allowed), kept within lowest and MAX_SCALE. */
export function zoomBy(scale: number, steps: number, lowest = MIN_SCALE): number {
  return clamp(scale * ZOOM_STEP ** steps, lowest);
}

/** Zoom steps a wheel turn of deltaY px stands for: 100 px is one step, turning up (negative) zooms in. */
export function wheelSteps(deltaY: number): number {
  return -deltaY / 100;
}

/** Scale after two fingers that started from scale at start px apart are now distance px apart, kept within lowest and MAX_SCALE. */
export function pinchScale(scale: number, start: number, distance: number, lowest = MIN_SCALE): number {
  return clamp((scale * distance) / start, lowest);
}
