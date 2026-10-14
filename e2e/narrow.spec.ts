import { expect } from "@playwright/test";
import { NarrowPage } from "./support/narrowPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("絞り込み", () => {
  test("値を 1 つずつ固定して 1 つのアルゴリズムに決め、可視化で開く", async ({ page }) => {
    const v = await given("可視化のページを開いている", () => Visualizer.open(page));
    await when("アクティビティバーで絞り込みに切り替える", () => v.workbench.pageLink("narrow").click());
    const n = await then("全 21 の候補から始まる", async () => {
      const n = await NarrowPage.shown(page);
      expect(n.hash()).toBe("#narrow");
      await expect(n.candidates()).toHaveCount(21);
      await expect(v.workbench.statusbar()).toContainText("候補 21");
      return n;
    });
    await when("根で width を選ぶ", () => n.splitBy(0, "width").click());
    await then("width の値ごとに候補の数を添えた枝が出る", async () => {
      expect(n.hash()).toBe("#narrow/width");
      await expect(n.branch(0, "16")).toContainText("9");
      await expect(n.branch(0, "3")).toContainText("CRC-3/GSM");
    });
    await when("16、poly、0x1021、init の順に選ぶ", async () => {
      await n.branch(0, "16").locator(":scope > a").click();
      await n.splitBy(1, "poly").click();
      await n.branch(1, "0x1021").locator(":scope > a").click();
      await n.splitBy(2, "init").click();
    });
    await then("道筋が URL に載り、候補が 6 つに減る", async () => {
      expect(n.hash()).toBe("#narrow/width=16/poly=0x1021/init");
      await expect(n.candidates()).toHaveCount(6);
      await expect(n.branch(2, "0x1D0F")).toContainText("CRC-16/SPI-FUJITSU");
    });
    await when("init 0x1D0F の枝を選ぶ", () => n.branch(2, "0x1D0F").locator(":scope > a").click());
    await then("1 つに決まり、可視化で開けるようになる", async () => {
      await expect(n.candidates()).toHaveText(["CRC-16/SPI-FUJITSU"]);
      await expect(n.openInVisualizer()).toBeVisible();
    });
    await when("可視化で開く", () => n.openInVisualizer().click());
    await then("CRC-16/SPI-FUJITSU の設定で可視化のページが出る", async () => {
      expect(n.hash()).toBe("");
      await expect(v.settings.preset()).toHaveValue("CRC-16/SPI-FUJITSU");
    });
  });

  test("選ばなかった枝や違うパラメータを選ぶと、その節から先の道筋を替える", async ({ page }) => {
    const n = await given("#narrow/width=16/poly=0x1021/init を開いている", () =>
      NarrowPage.open(page, "#narrow/width=16/poly=0x1021/init"),
    );
    await when("poly の節で閉じた 0x8005 の枝を選ぶ", () => n.branch(1, "0x8005").locator(":scope > a").click());
    await then("poly から先が 0x8005 に替わる", async () => {
      expect(n.hash()).toBe("#narrow/width=16/poly=0x8005");
      await expect(n.candidates()).toHaveCount(3);
    });
    await when("根で分けるパラメータを refin に替える", () => n.splitBy(0, "refin").click());
    await then("根から先の道筋を捨てて refin で分け直す", async () => {
      expect(n.hash()).toBe("#narrow/refin");
      await expect(n.candidates()).toHaveCount(21);
      await expect(n.branch(0, "false")).toBeVisible();
    });
  });

  test("全ての候補で同じパラメータは分ける選択肢に出ない", async ({ page }) => {
    const n = await given("#narrow/width=16/poly=0x8005 を開いている", () =>
      NarrowPage.open(page, "#narrow/width=16/poly=0x8005"),
    );
    await then("poly の先の節に width と poly は無く、init はある", async () => {
      await expect(n.splitBy(2, "width")).toHaveCount(0);
      await expect(n.splitBy(2, "poly")).toHaveCount(0);
      await expect(n.splitBy(2, "init")).toBeVisible();
    });
  });

  test("解釈できない道筋はその手前までで開く", async ({ page }) => {
    const n = await given("候補の無い値を含む #narrow/width=16/poly=0x7 を開いている", () =>
      NarrowPage.open(page, "#narrow/width=16/poly=0x7"),
    );
    await then("width=16 までの道筋になる", async () => {
      await expect(n.candidates()).toHaveCount(9);
      await expect(n.branch(0, "16")).toHaveClass(/on-path/);
    });
  });
});
