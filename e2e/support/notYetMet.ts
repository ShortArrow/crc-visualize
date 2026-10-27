/**
 * Titles of the screen tests whose spec rule the app does not meet yet. They are expected to fail; once one passes, Playwright
 * reports it as an unexpected pass, so the fix removes it from this list in the same change.
 */
export const NOT_YET_MET: ReadonlySet<string> = new Set([]);
