/** The screen size (CSS px) the pages are laid out for. */
export const REFERENCE_SCREEN = { width: 1600, height: 1000 } as const;

/**
 * The zoom of the whole app on a width × height (CSS px) screen: 1 up to REFERENCE_SCREEN, and beyond it in both directions as much
 * as keeps neither side below REFERENCE_SCREEN, so that a 2K or 4K screen shows the pages as on a REFERENCE_SCREEN, only larger.
 */
export const uiZoom = (width: number, height: number): number =>
  Math.max(1, Math.min(width / REFERENCE_SCREEN.width, height / REFERENCE_SCREEN.height));

/** uiZoom for the browser window as it is now. */
export const screenZoom = (): number => uiZoom(innerWidth, innerHeight);

/** The width of the browser window in the app's own (unenlarged) CSS px. */
export const viewWidth = (): number => innerWidth / screenZoom();

/** Enlarges the whole app by screenZoom, now and whenever the window is resized. */
export function followScreenZoom(): void {
  const apply = () => {
    document.documentElement.style.zoom = String(screenZoom());
  };
  apply();
  addEventListener("resize", apply);
}
