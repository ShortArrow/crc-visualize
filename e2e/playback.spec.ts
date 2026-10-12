import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { TUTORIAL_STEPS, Visualizer } from "./support/visualizer";

test.describe("再生", () => {
  test("再生すると末尾まで進んで停止する", async ({ page }) => {
    const v = await given("速度倍率 ×8 で開いている", async () => {
      const v = await Visualizer.open(page);
      await v.settings.rate().selectOption("8");
      return v;
    });
    await when("再生する", () => v.settings.play().click());
    await then("末尾で止まり、ボタンは再生に戻る", async () => {
      await expect(v.counter).toHaveText(`${TUTORIAL_STEPS} / ${TUTORIAL_STEPS}`, { timeout: 10_000 });
      await expect(v.settings.play()).toHaveAttribute("aria-label", "再生");
    });
  });

  test("ループ再生では末尾の次に先頭へ戻って再生を続ける", async ({ page }) => {
    const v = await given("ループ再生を L キーで有効にし、末尾の 1 つ手前にいる", async () => {
      const v = await Visualizer.open(page);
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "false");
      await page.keyboard.press("l");
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "true");
      await v.goToEnd();
      await v.stepBack();
      return v;
    });
    await when("再生する", () => v.settings.play().click());
    await then("末尾を表示した後、先頭へ戻って再生を続ける", async () => {
      await expect(v.counter).toHaveText(`${TUTORIAL_STEPS} / ${TUTORIAL_STEPS}`);
      await expect(v.counter).toHaveText(`1 / ${TUTORIAL_STEPS}`, { timeout: 5_000 });
      await expect(v.settings.play()).toHaveAttribute("aria-label", "一時停止");
    });
  });

  test("ループ設定は CRC 設定を変えても保たれる", async ({ page }) => {
    const v = await given("ループ再生を有効にしている", async () => {
      const v = await Visualizer.open(page);
      await v.settings.loop().click();
      return v;
    });
    await when("プリセットを変える", () => v.settings.preset().selectOption("CRC-8/SMBUS"));
    await then("ループ再生は有効のまま", async () => {
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "true");
    });
  });

  test("設定を変えると先頭に戻る", async ({ page }) => {
    const v = await given("xor ステップにいる", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("xor");
      return v;
    });
    await when("入力を 1 に変える", () => v.settings.field("input").fill("1"));
    await then("新しいステップ列の先頭にいる", async () => {
      await expect(v.counter).toHaveText("1 / 5");
    });
  });

  test("CRC-32/ISO-HDLC で 123456789 の CRC が検査値と一致する", async ({ page }) => {
    const v = await given("CRC-32/ISO-HDLC を選んでいる", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-32/ISO-HDLC");
      return v;
    });
    await when("末尾へ進む", () => v.goToEnd());
    await then("検査値と一致と示す", async () => {
      await expect(page.locator(".check")).toHaveText("検査値 0xCBF43926 と一致");
    });
  });
});
