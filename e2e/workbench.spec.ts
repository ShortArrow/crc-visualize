import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Screen frame", () => {
  test("the page itself does not scroll and is divided into activity bar, sidebar, editor area and status bar", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await then("the page overflows neither vertically nor horizontally", async () => {
      expect(await v.workbench.pageOverflow()).toEqual({ x: 0, y: 0 });
    });
    await then("the sidebar shows the settings, and the status bar shows the preset name, step and crc", async () => {
      await expect(v.workbench.sidebar().locator(".config")).toBeVisible();
      await expect(v.workbench.statusbar()).toContainText("CRC-3/TUTORIAL");
      await expect(v.workbench.statusbar()).toContainText("初期化");
      await expect(v.workbench.statusbar()).toContainText("crc = 0b000 0x0");
    });
    await when("advancing to the xor step", () => v.goTo("xor"));
    await then("the step and crc in the status bar change", async () => {
      await expect(v.workbench.statusbar()).toContainText("多項式と XOR");
      await expect(v.workbench.statusbar()).toContainText("crc = 0b011 0x3");
    });
  });

  test("closing the sidebar with Ctrl+B widens the diagram, and it stays closed after a reload", async ({ page }) => {
    const v = await given("the page is open with the default settings and the sidebar open", () => Visualizer.open(page));
    const before = await v.workbench.size(".hardware");
    await when("pressing Ctrl+B", () => page.keyboard.press("Control+b"));
    await then("the sidebar disappears and the diagram area widens", async () => {
      await expect(v.workbench.sidebar()).toHaveCount(0);
      expect((await v.workbench.size(".hardware")).width).toBeGreaterThan(before.width);
    });
    await when("reloading", () => page.reload());
    await then("the sidebar stays closed", async () => {
      await expect(v.workbench.sidebar()).toHaveCount(0);
      await expect(v.workbench.sidebarToggle()).toHaveAttribute("aria-pressed", "false");
    });
    await when("pressing the toggle in the activity bar", () => v.workbench.sidebarToggle().click());
    await then("the sidebar opens", async () => {
      await expect(v.workbench.sidebar()).toBeVisible();
    });
  });

  test("dragging a splitter resizes the areas, and the sizes survive a reload", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    const sidebar = (await v.workbench.size(".sidebar")).width;
    const panel = (await v.workbench.size(".panel")).height;
    await when("dragging the sidebar splitter 80px right and the diagram/panel splitter 60px up", async () => {
      await v.workbench.drag("sidebar", 80, 0);
      await v.workbench.drag("panel", 0, -60);
    });
    await then("the sidebar is 80px wider and the panel 60px taller", async () => {
      expect((await v.workbench.size(".sidebar")).width).toBeCloseTo(sidebar + 80, -1);
      expect((await v.workbench.size(".panel")).height).toBeCloseTo(panel + 60, -1);
    });
    await when("reloading", () => page.reload());
    await then("the sizes stay as resized", async () => {
      expect((await v.workbench.size(".sidebar")).width).toBeCloseTo(sidebar + 80, -1);
      expect((await v.workbench.size(".panel")).height).toBeCloseTo(panel + 60, -1);
    });
  });
});
