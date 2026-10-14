import { expect } from "@playwright/test";
import { NamesPage } from "./support/namesPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("表示言語（ブラウザが英語）", () => {
  test.use({ locale: "en-US" });

  test("保存した言語が無ければ、ブラウザの優先言語で出す", async ({ page }) => {
    const v = await given("ブラウザの優先言語が英語で、保存値が無い", () => Visualizer.open(page));
    await then("画面の文が英語になり、文書の言語も en になる", async () => {
      await expect(v.workbench.sidebar().locator("h2").first()).toHaveText("Settings");
      await expect(v.workbench.statusbar()).toContainText("Initialize");
      await expect(v.workbench.localeSelect()).toHaveValue("en");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });
});

test.describe("表示言語", () => {
  test("ステータスバーで言語を替えると全ての文が替わり、URL と再読み込みでも保たれる", async ({ page }) => {
    const v = await given("日本語で可視化のページを開いている", () => Visualizer.open(page));
    await when("ステータスバーで Deutsch を選ぶ", () => v.workbench.localeSelect().selectOption("de"));
    await then("画面の文がドイツ語になり、URL のクエリに lang=de が載る", async () => {
      await expect(v.workbench.sidebar().locator("h2").first()).toHaveText("Einstellungen");
      await expect(v.workbench.statusbar()).toContainText("Initialisierung");
      await expect(page.locator(".log-pane h2")).toHaveText("Verlauf");
      await expect(page.locator("html")).toHaveAttribute("lang", "de");
      expect(new URL(page.url()).searchParams.get("lang")).toBe("de");
    });
    await when("再読み込みして名前の規則のページへ移る", async () => {
      await page.reload();
      await v.workbench.pageLink("names").click();
    });
    await then("名前の規則のページもドイツ語のまま", async () => {
      const n = await NamesPage.shown(page);
      await expect(n.root.locator("#names-parts h2")).toHaveText("Aufbau eines Namens");
    });
  });

  test("URL のクエリ lang の言語で開く", async ({ page }) => {
    const v = await given("lang=zh を付けて開いている", () => Visualizer.open(page, "?lang=zh"));
    await then("画面の文が中国語になる", async () => {
      await expect(v.workbench.statusbar()).toContainText("初始化");
      await expect(v.workbench.localeSelect()).toHaveValue("zh");
    });
  });

  test("設定の誤りは選んだ言語で出す", async ({ page }) => {
    const v = await given("フランス語で開いている", () => Visualizer.open(page, "?lang=fr"));
    await when("width に 0 を入れる", () => v.settings.param("width").locator("input").fill("0"));
    await then("誤りの文がフランス語になる", async () => {
      await expect(v.settings.param("width").locator(".error")).toHaveText("Saisissez un entier de 1 à 32");
    });
  });
});
