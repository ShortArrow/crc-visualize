/** Factor one press of − or ＋ changes the diagram's scale by. */
export const ZOOM_STEP = 1.25;
/** Smallest scale of the diagram, in CSS px per unit of its view box. */
export const MIN_SCALE = 0.25;
/** Largest scale of the diagram, in CSS px per unit of its view box. */
export const MAX_SCALE = 3;

const clamp = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/** Scale after zooming steps times from scale (positive in, negative out, fractions allowed), kept within MIN_SCALE and MAX_SCALE. */
export function zoomBy(scale: number, steps: number): number {
  return clamp(scale * ZOOM_STEP ** steps);
}

/** Zoom steps a wheel turn of deltaY px stands for: 100 px is one step, turning up (negative) zooms in. */
export function wheelSteps(deltaY: number): number {
  return -deltaY / 100;
}

/** Scale after two fingers that started from scale at start px apart are now distance px apart, kept within the limits. */
export function pinchScale(scale: number, start: number, distance: number): number {
  return clamp((scale * distance) / start);
}
