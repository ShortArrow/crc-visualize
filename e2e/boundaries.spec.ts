import { expect, type Locator, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

const PANES_KEY = "crc-visualize:panes:v1";

/** The pane layout saved in localStorage, or null. */
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as { sidebarWidth: number } | null, PANES_KEY);

const box = async (locator: Locator) => (await locator.boundingBox())!;

/** The gap (px) between the sidebar and the editor area, and the sidebar's corner radius. */
async function panelGap(page: Page) {
  const sidebar = await box(page.locator(".sidebar"));
  const editor = await box(page.locator(".editor"));
  const radius = await page.locator(".sidebar").evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
  return { gap: editor.x - (sidebar.x + sidebar.width), radius };
}

/** The colour of the line a boundary draws (its ::after), "rgba(0, 0, 0, 0)" when it shows none. */
const line = (splitter: Locator) => splitter.evaluate((el) => getComputedStyle(el, "::after").backgroundColor);

test.describe("Panels and the boundaries between them", () => {
  for (const [size, gap, radius] of [
    [{ width: 1920, height: 950 }, 8, 8],
    [{ width: 1366, height: 638 }, 4, 8],
    [{ width: 844, height: 390 }, 1, 0],
  ] as const) {
    test(`on ${size.width}×${size.height}, the sidebar and the editor area are ${gap === 1 ? "not set apart" : `${gap} px apart`}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await given("the Visualizer with the sidebar open", async () => {
        const v = await Visualizer.open(page);
        if (!(await page.locator(".sidebar").isVisible())) await v.workbench.sidebarToggle().click();
      });
      await then(`the gap is ${gap} px and the corners are rounded by ${radius} px`, async () => {
        const measured = await panelGap(page);
        expect(measured.gap).toBeCloseTo(gap, 0);
        expect(measured.radius).toBe(radius);
      });
    });
  }

  test("a boundary shows its line only while pointed at or focused, and the keys and a double click move it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 950 });
    const v = await given("the Visualizer", () => Visualizer.open(page));
    const splitter = v.workbench.splitter("sidebar");
    await then("the boundary shows no line, and is named for the keyboard", async () => {
      expect(await line(splitter)).toBe("rgba(0, 0, 0, 0)");
      await expect(splitter).toHaveAttribute("tabindex", "0");
      await expect(splitter).toHaveAttribute("aria-label", /.+/);
    });
    await when("focusing it and pressing → twice", async () => {
      await splitter.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
    });
    await then("it shows its line, and the sidebar is 32 px wider and saved so", async () => {
      expect(await line(splitter)).not.toBe("rgba(0, 0, 0, 0)");
      expect((await saved(page))?.sidebarWidth).toBe(300 + 32);
    });
    await when("double-clicking it", () => splitter.dblclick());
    await then("the sidebar is back to 300 px, and saved so", async () => expect((await saved(page))?.sidebarWidth).toBe(300));
  });

  test("a drag is saved when it ends, and the sidebar stays within 180 to 480 px", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 950 });
    const v = await given("the Visualizer", () => Visualizer.open(page));
    const handle = await box(v.workbench.splitter("sidebar"));
    const [x, y] = [handle.x + handle.width / 2, handle.y + handle.height / 2];
    await when("pressing on the boundary and moving 400 px to the right", async () => {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 400, y, { steps: 5 });
    });
    await then("the sidebar stops at 480 px, and nothing new is saved yet", async () => {
      expect((await box(page.locator(".sidebar"))).width).toBeLessThanOrEqual(480 + 2);
      expect((await saved(page))?.sidebarWidth ?? 300).toBe(300);
    });
    await when("releasing", () => page.mouse.up());
    await then("480 px is saved", async () => expect((await saved(page))?.sidebarWidth).toBe(480));
    await when("dragging it 600 px to the left", () => v.workbench.drag("sidebar", -600, 0));
    await then("the sidebar stops at 180 px", async () => expect((await saved(page))?.sidebarWidth).toBe(180));
  });

  test("each panel a boundary divides keeps at least 80 px", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 950 });
    const v = await given("the Visualizer", () => Visualizer.open(page));
    await when("dragging the boundary under the diagram 2000 px down", () => v.workbench.drag("panel", 0, 2000));
    await then("the panel below keeps at least 80 px", async () =>
      expect((await box(page.locator(".visualizer .panel"))).height).toBeGreaterThanOrEqual(80),
    );
  });
});
