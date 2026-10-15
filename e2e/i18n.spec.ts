import { expect } from "@playwright/test";
import { NamesPage } from "./support/namesPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Display language (browser in English)", () => {
  test.use({ locale: "en-US" });

  test("without a saved language, uses the browser's preferred language", async ({ page }) => {
    const v = await given("the browser prefers English and nothing is saved", () => Visualizer.open(page));
    await then("the page text is in English and the document language is en", async () => {
      await expect(v.workbench.sidebar().locator("h2").first()).toHaveText("Settings");
      await expect(v.workbench.statusbar()).toContainText("Initialize");
      await expect(v.workbench.localeSelect()).toHaveValue("en");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });
});

test.describe("Display language", () => {
  test("switching language in the status bar changes all text and persists in the URL and across reloads", async ({ page }) => {
    const v = await given("the visualizer page is open in Japanese", () => Visualizer.open(page));
    await when("selecting Deutsch in the status bar", () => v.workbench.localeSelect().selectOption("de"));
    await then("the page text is in German and the URL query carries lang=de", async () => {
      await expect(v.workbench.sidebar().locator("h2").first()).toHaveText("Einstellungen");
      await expect(v.workbench.statusbar()).toContainText("Initialisierung");
      await expect(page.locator(".log-pane h2")).toHaveText("Verlauf");
      await expect(page.locator("html")).toHaveAttribute("lang", "de");
      expect(new URL(page.url()).searchParams.get("lang")).toBe("de");
    });
    await when("reloading and moving to the naming page", async () => {
      await page.reload();
      await v.workbench.pageLink("names").click();
    });
    await then("the naming page is still in German", async () => {
      const n = await NamesPage.shown(page);
      await expect(n.root.locator("#names-parts h2")).toHaveText("Aufbau eines Namens");
    });
  });

  test("opens in the language of the URL query lang", async ({ page }) => {
    const v = await given("the page is open with lang=zh", () => Visualizer.open(page, "?lang=zh"));
    await then("the page text is in Chinese", async () => {
      await expect(v.workbench.statusbar()).toContainText("初始化");
      await expect(v.workbench.localeSelect()).toHaveValue("zh");
    });
  });

  test("settings errors are shown in the chosen language", async ({ page }) => {
    const v = await given("the page is open in French", () => Visualizer.open(page, "?lang=fr"));
    await when("entering 0 for width", () => v.settings.param("width").locator("input").fill("0"));
    await then("the error text is in French", async () => {
      await expect(v.settings.param("width").locator(".error")).toHaveText("Saisissez un entier de 1 à 32");
    });
  });
});
