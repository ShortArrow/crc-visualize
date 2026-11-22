import { expect } from "@playwright/test";
import { NamesPage } from "./support/namesPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Privacy page", () => {
  test("the status bar links to the privacy page, which describes the measurement and links back to the app", async ({
    page,
  }) => {
    const v = await given("the visualizer page is open in Japanese", () => Visualizer.open(page));
    await then("the status bar holds the link, named in Japanese, to /privacy", async () => {
      await expect(v.workbench.privacyLink()).toHaveText("個人情報の扱い");
      await expect(v.workbench.privacyLink()).toHaveAttribute("href", "/privacy");
    });
    await when("following the link", () => v.workbench.privacyLink().click());
    await then("the privacy page at /privacy says what is measured, in English and Japanese", async () => {
      expect(new URL(page.url()).pathname).toBe("/privacy");
      await expect(page.locator("h1")).toHaveText("Privacy");
      await expect(page.locator("main")).toContainText("Cloudflare Web Analytics");
      await expect(page.locator("[lang=ja] h2")).toHaveText("個人情報の扱い");
    });
    await when("following the link back to the app", () => page.locator("a.back").first().click());
    await then("the app is shown again", async () => {
      await expect(v.workbench.statusbar()).toBeVisible();
    });
  });

  test("the link is on the other pages too", async ({ page }) => {
    const v = await given("the visualizer page is open", () => Visualizer.open(page));
    await when("moving to the naming page", async () => {
      await v.workbench.pageLink("names").click();
      await NamesPage.shown(page);
    });
    await then("the status bar still links to /privacy", async () => {
      await expect(v.workbench.privacyLink()).toHaveAttribute("href", "/privacy");
    });
  });
});

test.describe("Privacy page (browser in English)", () => {
  test.use({ locale: "en-US" });

  test("the link is named in the display language", async ({ page }) => {
    const v = await given("the browser prefers English", () => Visualizer.open(page));
    await then("the link reads Privacy", async () => {
      await expect(v.workbench.privacyLink()).toHaveText("Privacy");
    });
  });
});
