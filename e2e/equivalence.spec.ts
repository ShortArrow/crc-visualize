import { expect } from "@playwright/test";
import { EquivalencePage } from "./support/equivalencePage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

const ITEMS = ["refin", "refout", "rightShift", "initPrefix", "affine"];

test.describe("置き換え", () => {
  test("今の設定と入力で、置き換えの両辺が同じ CRC になることを示す", async ({ page }) => {
    const v = await given("CRC-16/IBM-SDLC を選んでいる", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/IBM-SDLC");
      return v;
    });
    await when("アクティビティバーで置き換えに切り替える", () => v.workbench.pageLink("equivalence").click());
    const e = await then("5 つの置き換えが全て当てはまり、両辺は検査値 0x906E で一致する", async () => {
      const e = await EquivalencePage.shown(page);
      for (const id of ITEMS) {
        await expect(e.left(id)).toHaveText("0x906E");
        await expect(e.right(id)).toHaveText("0x906E");
      }
      await expect(v.workbench.statusbar()).toContainText("CRC-16/IBM-SDLC");
      return e;
    });
    await then("init 0xFFFF の代わりの前置きは 0x84CF", async () => {
      await expect(e.prefix()).toHaveText("0x84CF");
    });
    await then("右送りで、コードには poly 0x8408 と init 0xFFFF が書かれる", async () => {
      await expect(e.direction()).toHaveAttribute("data-direction", "right");
      await expect(e.codeConstants()).toContainText("0x8408");
      await expect(e.codeConstants()).toContainText("0xFFFF");
    });
  });

  test("今の設定に当てはまらない項目は、計算例の代わりに理由を出す", async ({ page }) => {
    const e = await given("ビット単位の入力の CRC-3/TUTORIAL で開いている", () => EquivalencePage.open(page));
    await then("入力の反転と右送りの実装は当てはまらない", async () => {
      await expect(e.notApplicable("refin")).toContainText("8 ビットの倍数");
      await expect(e.notApplicable("rightShift")).toBeVisible();
      await expect(e.right("refout")).toHaveText(await e.left("refout").innerText());
    });
    await then("左送り", async () => {
      await expect(e.direction()).toHaveAttribute("data-direction", "left");
    });
  });

  test("設定が不正なら計算例を出さない", async ({ page }) => {
    const e = await given("width が範囲外の設定で開いている", () => EquivalencePage.open(page, "?width=99"));
    await then("設定が不正だと出し、計算例と今の設定での補足は無い", async () => {
      await expect(e.invalid()).toBeVisible();
      await expect(e.left("refout")).toHaveCount(0);
      await expect(e.direction()).toHaveCount(0);
    });
  });
});
