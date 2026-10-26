import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { SCREENS, tierOf } from "./support/screens";
import { Visualizer } from "./support/visualizer";
import { NOT_YET_MET } from "./support/notYetMet";

const QUERY = "?width=16&poly=0x1021&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";
const PAGES = ["", "#names", "#narrow", "#cyclic", "#redundancy", "#check", "#equivalence", "#table", "#estimate"];
/** The fixed bars whose controls must be in view without scrolling (docs/spec.md chapter 7, Controls). */
const FIXED_BARS = ".visualizer > .controls, .hardware-head, .dock";

/** Opens the page at hash with the sidebar open or closed, toggling it when the page opens the other way. */
async function open(page: Page, hash: string, sidebar: boolean): Promise<Visualizer> {
  await page.goto(`/${QUERY}${hash}`);
  const v = Visualizer.on(page);
  await expect(page.locator(".editor > *").first()).toBeVisible();
  if ((await v.workbench.sidebar().isVisible()) !== sidebar) await v.workbench.sidebarToggle().click();
  await expect(v.workbench.sidebar()).toBeVisible({ visible: sidebar });
  return v;
}

/** Expects no control of the fixed bars to need scrolling, and no other control to be cut off where scrolling cannot reach it. */
async function nothingCut(v: Visualizer): Promise<void> {
  expect(await v.workbench.cutControls(FIXED_BARS, true), "controls of the fixed bars").toEqual([]);
  expect(await v.workbench.cutControls(".workbench", false), "other controls").toEqual([]);
}

test.beforeEach(({}, info) => test.fail(NOT_YET_MET.has(info.title), "the app does not meet this rule yet"));

test.describe("Screens: controls", () => {
  for (const screen of SCREENS)
    for (const sidebar of tierOf(screen) === "phone" ? [false] : [true, false]) {
      const on = `on ${screen.name} (${screen.width}×${screen.height}) with the sidebar ${sidebar ? "open" : "closed"}`;
      test(`${on}, no control is cut off on any page`, async ({ page }) => {
        await page.setViewportSize({ width: screen.width, height: screen.height });
        const v = await given(`the visualizer is open with the sidebar ${sidebar ? "open" : "closed"}`, () =>
          open(page, "", sidebar),
        );
        await then("the playback controls and the diagram heading are in view, and no control is cut off", () => nothingCut(v));
        for (const hash of PAGES.slice(1)) {
          await when(`opening ${hash}`, () => open(page, hash, sidebar));
          await then("no control is cut off", () => nothingCut(v));
        }
      });
    }
});
