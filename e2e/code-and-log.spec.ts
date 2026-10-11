import { expect, test } from "@playwright/test";
import { given, then, Visualizer, when } from "./support/visualizer";

test.describe("擬似コード", () => {
  test("xor ステップでは crc ^= poly の行が現在行になる", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("xor ステップへ進む", () => v.goTo("xor"));
    await then("現在行は crc ^= poly", async () => {
      await expect(v.code.activeLine()).toContainText("crc ^= poly");
    });
  });

  test("feedback が 0 のクロックでは、if が false と注記され、本体が打ち消される", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("2 番目のクロック（feedback 0）の shift ステップへ進む", () => v.goTo("shift", 2));
    await then("if (feedback == 1) に false が付き、crc ^= poly が打ち消される", async () => {
      await expect(v.code.line("if (feedback == 1)")).toContainText("// false");
      await expect(v.code.skippedLine()).toContainText("crc ^= poly");
    });
  });

  test("無効なパラメータの行も、値と理由を添えて薄く示す", async ({ page }) => {
    const v = await given("refout が false の既定の設定で開いている", () => Visualizer.open(page));
    await then("refout の行は理由と値を添えて薄く出る", async () => {
      const line = v.code.disabledLineOf("refout");
      await expect(line).toContainText("refout が false なので実行しない");
      await expect(line.locator('.chip[data-param="refout"]')).toContainText("false");
    });
  });
});

test.describe("経過", () => {
  test("経過は新しい順に並び、最新の行だけ大きく、コマ戻しで巻き戻る", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("xor ステップへ進む", () => v.goTo("xor"));
    await then("先頭から xor までの 4 行が新しい順に並ぶ", async () => {
      const entries = v.log.entries();
      await expect(entries).toHaveCount(4);
      await expect(entries.nth(0)).toHaveClass(/\blatest\b/);
      await expect(entries.nth(0)).toContainText("多項式と XOR");
      await expect(entries.nth(0)).toContainText("0b011");
      await expect(entries.nth(1)).toContainText("シフト");
      await expect(entries.nth(3)).toContainText("初期化");
    });
    await then("最新の行だけ大きく、古い行も薄めずに出す", async () => {
      expect(await v.log.titleSize(0)).toBeGreaterThan(await v.log.titleSize(1));
      expect(await v.log.titleSize(1)).toBe(await v.log.titleSize(3));
      const opacity = (i: number) => v.log.entries().nth(i).evaluate((el) => getComputedStyle(el).opacity);
      expect(await opacity(1)).toBe("1");
      expect(await opacity(3)).toBe("1");
      expect(await page.locator(".log").evaluate((el) => getComputedStyle(el).maskImage)).toBe("none");
    });
    await when("1 ステップ戻す", () => v.stepBack());
    await then("最新の行は shift になる", async () => {
      await expect(v.log.entries()).toHaveCount(3);
      await expect(v.log.entries().nth(0)).toContainText("シフト");
    });
  });

  test("ソフトウェア欄の高さは経過の行数によらず一定", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    const height = () => page.locator(".software").evaluate((el) => el.getBoundingClientRect().height);
    const first = await height();
    await when("xor ステップへ進む", () => v.goTo("xor"));
    await then("高さは変わらない", async () => expect(await height()).toBe(first));
    await when("末尾へ進む", () => v.goToEnd());
    await then("高さは変わらない", async () => expect(await height()).toBe(first));
  });
});
