/**
 * Titles of the screen tests whose spec rule the app does not meet yet. They are expected to fail; once one passes, Playwright
 * reports it as an unexpected pass, so the fix removes it from this list in the same change.
 */
export const NOT_YET_MET: ReadonlySet<string> = new Set([
  "on iPad (10th generation) (820×1106), the cyclic page keeps what an action changes in view",
  "on iPad (10th generation) (820×1106), the redundancy page keeps what an action changes in view",
  "on iPad (10th generation) (820×1106), the visualizer keeps what an action changes in view",
  "on iPad (10th generation) in landscape (1180×746), the table page keeps what an action changes in view",
  "on iPad mini (744×1059), the cyclic page keeps what an action changes in view",
  "on iPad mini (744×1059), the redundancy page keeps what an action changes in view",
  "on iPad mini (744×1059), the table page keeps what an action changes in view",
]);
