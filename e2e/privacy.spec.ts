import { expect, type Locator } from "@playwright/test";
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

const PHONE = { width: 390, height: 844 };

/** The contrast ratio (WCAG 2.2) of the link's text against the nearest background behind it. */
async function textContrast(link: Locator): Promise<number> {
  return link.evaluate((el) => {
    const rgba = (css: string) => css.match(/[\d.]+/g)!.map(Number);
    let back: Element | null = el;
    while (back && (rgba(getComputedStyle(back).backgroundColor)[3] ?? 1) === 0) back = back.parentElement;
    const lum = ([r, g, b]: number[]) =>
      [r!, g!, b!]
        .map((c) => c / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
    const fg = lum(rgba(getComputedStyle(el).color));
    const bg = lum(rgba(getComputedStyle(back!).backgroundColor));
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
}

test.describe("Privacy link on a phone", () => {
  test("the link leaves the status bar to the crc and sits at the end of the drawer, large and clear enough", async ({
    page,
  }) => {
    const v = await given("the visualizer page is open on a 390 px wide phone", async () => {
      await page.setViewportSize(PHONE);
      return Visualizer.open(page);
    });
    await then("the status bar has no link, and its preset name and crc are not cut off", async () => {
      await expect(v.workbench.privacyLink()).toHaveCount(0);
      for (const part of [".status-preset", ".status-crc"]) {
        const cut = await v.workbench
          .statusbar()
          .locator(part)
          .evaluate((el) => el.scrollWidth > el.clientWidth);
        expect(cut, part).toBe(false);
      }
    });
    await when("opening the drawer", () => v.workbench.sidebarToggle().click());
    await then("the drawer ends with the link 個人情報の扱い to /privacy", async () => {
      const link = v.workbench.drawerPrivacyLink();
      await expect(link).toHaveText("個人情報の扱い");
      await expect(link).toHaveAttribute("href", "/privacy");
      expect(await link.evaluate((el) => el === el.parentElement!.lastElementChild)).toBe(true);
    });
    await then("the link is at least 24 px high and wide, and its text has a contrast of at least 7:1", async () => {
      const box = (await v.workbench.drawerPrivacyLink().boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
      expect(await textContrast(v.workbench.drawerPrivacyLink())).toBeGreaterThanOrEqual(7);
    });
  });
});
