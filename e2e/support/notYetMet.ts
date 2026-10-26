/**
 * Titles of the screen tests whose spec rule the app does not meet yet. They are expected to fail; once one passes, Playwright
 * reports it as an unexpected pass, so the fix removes it from this list in the same change.
 */
export const NOT_YET_MET: ReadonlySet<string> = new Set([
  "on 1366×768 at 100% (1366×638), the visualizer keeps what an action changes in view",
  "on 1920×1080 at 150% (1280×590), the visualizer keeps what an action changes in view",
  "on iPhone 12 to 14 in landscape (844×390), the check page keeps what an action changes in view",
  "on iPhone 12 to 14 in landscape (844×390), the cyclic page keeps what an action changes in view",
  "on iPhone 12 to 14 in landscape (844×390), the redundancy page keeps what an action changes in view",
  "on iPhone 12 to 14 in landscape (844×390), the visualizer keeps what an action changes in view",
  "on iPhone 15 / 16 (393×852), the table page keeps what an action changes in view",
]);
