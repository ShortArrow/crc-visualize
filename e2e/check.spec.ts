import { expect } from "@playwright/test";
import { CheckPage } from "./support/checkPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("検査", () => {
  test("受け取った並びを 2 つのやり方で確かめ、ビットを壊すとどちらも誤りを見つける", async ({ page }) => {
    const v = await given("CRC-16/KERMIT を選んでいる", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await when("アクティビティバーで検査に切り替える", () => v.workbench.pageLink("check").click());
    const c = await then("本文 72 ビットの後ろに CRC 16 ビットを付けた並びで、どちらのやり方でも誤りなし", async () => {
      const c = await CheckPage.shown(page);
      await expect(c.bits("message")).toHaveCount(72);
      await expect(c.bits("crc")).toHaveCount(16);
      await expect(c.computed()).toHaveText("0x2189");
      await expect(c.receivedCrc()).toHaveText("0x2189");
      await expect(c.wholeValue()).toHaveText(await c.residue().innerText());
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "true");
      await expect(c.verdict("whole")).toHaveAttribute("data-ok", "true");
      await expect(v.workbench.statusbar()).toContainText("CRC-16/KERMIT");
      return c;
    });
    await then("カタログの検査値と、123456789 で計算した値が並ぶ", async () => {
      await expect(c.catalogueCheck()).toHaveText("0x2189");
      await expect(c.computedCheck()).toHaveText("0x2189");
    });
    await when("本文の 4 ビット目を反転する", () => c.bit(3).click());
    await then("どちらのやり方でも誤りあり", async () => {
      await expect(c.computed()).not.toHaveText("0x2189");
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "false");
      await expect(c.verdict("whole")).toHaveAttribute("data-ok", "false");
    });
    await when("元に戻して、CRC のビットを反転する", async () => {
      await c.resetFlips().click();
      await c.bit(80).click();
    });
    await then("受け取った CRC が変わり、どちらのやり方でも誤りあり", async () => {
      await expect(c.computed()).toHaveText("0x2189");
      await expect(c.receivedCrc()).not.toHaveText("0x2189");
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "false");
      await expect(c.verdict("whole")).toHaveAttribute("data-ok", "false");
    });
  });

  test("refin と refout が違う設定では、符号語ごと通すやり方は当てはまらない", async ({ page }) => {
    const c = await given("refin だけ true の設定で開いている", () =>
      CheckPage.open(page, "?width=16&poly=0x1021&init=0x0&refin=1&refout=0&xorout=0x0&inputMode=text&input=12"),
    );
    await then("計算し直すやり方は誤りなし、符号語ごと通すやり方は理由を出す", async () => {
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "true");
      await expect(c.method("whole").locator(".not-applicable")).toBeVisible();
      await expect(c.catalogueCheck()).toHaveCount(0);
    });
  });

  test("設定が不正なら確かめ方を出さない", async ({ page }) => {
    const c = await given("width が範囲外の設定で開いている", () => CheckPage.open(page, "?width=99"));
    await then("設定が不正だと出し、受け取った並びも確かめ方も無い", async () => {
      await expect(c.invalid()).toBeVisible();
      await expect(c.bits()).toHaveCount(0);
      await expect(c.method("recheck")).toHaveCount(0);
    });
  });
});
