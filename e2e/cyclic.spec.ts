import { expect } from "@playwright/test";
import { CyclicPage } from "./support/cyclicPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("巡回", () => {
  test("符号語を回しても余りは 0 のままで、状態の輪の x^k が同じだけ進み、n 回で元に戻る", async ({ page }) => {
    const v = await given("可視化のページを開いている", () => Visualizer.open(page));
    await when("アクティビティバーで巡回に切り替える", () => v.workbench.pageLink("cyclic").click());
    const c = await then("x³ + x + 1 の 7 ビットの符号語と 7 つの状態の輪が出る", async () => {
      const c = await CyclicPage.shown(page);
      expect(c.hash()).toBe("#cyclic");
      await expect(c.wordBits()).toHaveCount(7);
      await expect(c.states()).toHaveCount(7);
      await expect(c.word()).toHaveText("1101001");
      await expect(c.remainder()).toHaveText("000");
      await expect(c.currentState()).toHaveAttribute("data-power", "0");
      await expect(v.workbench.statusbar()).toContainText("x³ + x + 1");
      await expect(v.workbench.statusbar()).toContainText("n = 7");
      return c;
    });
    await when("1 回回す", () => c.forward().click());
    await then("各ビットの次数が 1 上がり最高次が x^0 へ回り込むが、余りは 0 のまま。状態は x^1 = 010", async () => {
      await expect(c.word()).toHaveText("1010011");
      await expect(c.remainder()).toHaveText("000");
      await expect(c.currentState()).toHaveAttribute("data-power", "1");
      await expect(c.currentState()).toContainText("010");
    });
    await when("さらに 6 回回す", async () => {
      for (let i = 0; i < 6; i++) await c.forward().click();
    });
    await then("7 回で元の符号語と x^0 に戻る", async () => {
      await expect(c.word()).toHaveText("1101001");
      await expect(c.currentState()).toHaveAttribute("data-power", "0");
    });
    await when("逆に 1 回回す", () => c.back().click());
    await then("x^6 の状態になる", async () => {
      await expect(c.word()).toHaveText("1110100");
      await expect(c.currentState()).toHaveAttribute("data-power", "6");
    });
  });

  test("生成多項式を替えると、その周期の長さの輪になり、回した数は 0 に戻る", async ({ page }) => {
    const c = await given("既定の生成多項式で 2 回回している", async () => {
      const c = await CyclicPage.open(page);
      await c.forward().click();
      await c.forward().click();
      return c;
    });
    await when("一覧で x⁴ + x³ + x² + x + 1 を選ぶ", () => c.generator(4, "0xF").click());
    await then("周期 5 の輪になり、URL に載る", async () => {
      expect(c.hash()).toBe("#cyclic/width=4/poly=0xF");
      await expect(c.generator(4, "0xF")).toHaveAttribute("aria-current", "true");
      await expect(c.wordBits()).toHaveCount(5);
      await expect(c.states()).toHaveCount(5);
      await expect(c.word()).toHaveText("11111");
      await expect(c.currentState()).toHaveAttribute("data-power", "0");
    });
    await when("再読み込みする", () => page.reload());
    await then("同じ生成多項式で開く", async () => {
      await expect(c.states()).toHaveCount(5);
    });
  });

  test("一覧に無い生成多項式を指すフラグメントは既定の生成多項式で開く", async ({ page }) => {
    const c = await given("#cyclic/width=4/poly=0x5 を開いている", () => CyclicPage.open(page, "#cyclic/width=4/poly=0x5"));
    await then("x³ + x + 1 の輪になる", async () => {
      await expect(c.states()).toHaveCount(7);
      await expect(c.generator(3, "0x3")).toHaveAttribute("aria-current", "true");
    });
  });
});
