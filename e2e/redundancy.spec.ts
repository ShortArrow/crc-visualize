import { expect } from "@playwright/test";
import { RedundancyPage } from "./support/redundancyPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("冗長", () => {
  test("付け足した CRC のビットと、符号語が並び全体の一部であることを示す", async ({ page }) => {
    const v = await given("可視化のページを開いている", () => Visualizer.open(page));
    await when("アクティビティバーで冗長に切り替える", () => v.workbench.pageLink("redundancy").click());
    await then("x³ + x + 1 の符号語を本文 4 ビットと CRC 3 ビットに分けて示す", async () => {
      const r = await RedundancyPage.shown(page);
      expect(r.hash()).toBe("#redundancy");
      await expect(r.sentBits("message")).toHaveCount(4);
      await expect(r.sentBits("crc")).toHaveCount(3);
      await expect(v.workbench.statusbar()).toContainText("n = 7");
    });
    await then("128 通りの並びのうち符号語は 16 通りで、受け取った並びは符号語の点にある", async () => {
      const r = await RedundancyPage.shown(page);
      await expect(r.counts()).toContainText("128");
      await expect(r.counts()).toContainText("16");
      await expect(r.counts()).toContainText("1/8");
      await expect(r.gridDots()).toHaveCount(128);
      await expect(r.gridDots("codeword")).toHaveCount(16);
      await expect(r.gridDots("received")).toHaveClass(/codeword/);
    });
  });

  test("受け取った並びのビットを反転すると誤りを見つけ、g(x) と同じ形の誤りは見逃す", async ({ page }) => {
    const r = await given("x³ + x + 1 の冗長のページを開いている", () => RedundancyPage.open(page));
    await then("誤りなし", async () => {
      await expect(r.verdict()).toHaveAttribute("data-verdict", "clean");
      await expect(r.remainder()).toHaveText("000");
      await expect(r.burstLength()).toHaveText("0");
    });
    await when("x⁵ と x¹ のビットを反転する", async () => {
      await r.receivedBit(1).click();
      await r.receivedBit(5).click();
    });
    await then("長さ 5 の誤りを見つけ、受け取った並びは符号語の点から外れる", async () => {
      await expect(r.error()).toHaveText("0100010");
      await expect(r.burstLength()).toHaveText("5");
      await expect(r.verdict()).toHaveAttribute("data-verdict", "detected");
      await expect(r.remainder()).not.toHaveText("000");
      await expect(r.gridDots("received")).not.toHaveClass(/codeword/);
    });
    await when("元に戻す", () => r.resetError().click());
    await then("誤りなしに戻る", async () => {
      await expect(r.verdict()).toHaveAttribute("data-verdict", "clean");
      await expect(r.error()).toHaveText("0000000");
    });
    await when("見逃す例を選ぶ", () => r.missedExample().click());
    await then("g(x) の形の長さ 4 の誤りは余りが 0 で見逃し、受け取った並びは別の符号語になる", async () => {
      await expect(r.error()).toHaveText("0001011");
      await expect(r.burstLength()).toHaveText("4");
      await expect(r.remainder()).toHaveText("000");
      await expect(r.verdict()).toHaveAttribute("data-verdict", "missed");
      await expect(r.gridDots("received")).toHaveClass(/codeword/);
    });
  });

  test("並びが多い生成多項式では格子を出さず数だけ示す", async ({ page }) => {
    const r = await given("x⁵ + x² + 1 の冗長のページを開いている", () =>
      RedundancyPage.open(page, "#redundancy/width=5/poly=0x5"),
    );
    await then("31 ビットの符号語で、格子は無い", async () => {
      await expect(r.sentBits()).toHaveCount(31);
      await expect(r.gridDots()).toHaveCount(0);
      await expect(r.counts()).toContainText("1/32");
    });
  });
});
