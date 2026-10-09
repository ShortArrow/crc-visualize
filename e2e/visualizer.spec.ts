import { expect, test, type Page } from "@playwright/test";

const counter = (page: Page) => page.locator(".counter");
const reg = (page: Page, bit: number) => page.locator(`.reg[data-bit="${bit}"]`);
const activeLine = (page: Page) => page.locator(".code-line.active");

async function stepForward(page: Page, times: number) {
  for (let i = 0; i < times; i++) await page.keyboard.press("ArrowRight");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(counter(page)).toHaveText("1 / 15");
});

test("xor ステップでは poly の 1 のビットの箱が光り、XOR の行がハイライトされる", async ({ page }) => {
  await stepForward(page, 3);
  await expect(counter(page)).toHaveText("4 / 15");
  await expect(page.locator(".state-kind")).toHaveText("多項式と XOR");
  await expect(reg(page, 0)).toHaveClass(/\bhit\b/);
  await expect(reg(page, 1)).toHaveClass(/\bhit\b/);
  await expect(reg(page, 2)).not.toHaveClass(/\bhit\b/);
  await expect(activeLine(page)).toContainText("crc ^= 0x3;");
  await expect(page.locator(".state")).toContainText("0b011");
});

test("fb = 0 の shift では if が false と注記され、本体が打ち消される", async ({ page }) => {
  await stepForward(page, 5);
  await expect(counter(page)).toHaveText("6 / 15");
  await expect(page.locator(".code-line", { hasText: "if (fb == 1)" })).toContainText("// false");
  await expect(page.locator(".code-line.skipped")).toContainText("crc ^= 0x3;");
  await expect(page.locator(".wire.fb-off").first()).toBeVisible();
});

test("完了するとレジスタが緑になり、入力の後ろに CRC を連結して表示する", async ({ page }) => {
  await page.keyboard.press("End");
  await expect(counter(page)).toHaveText("15 / 15");
  for (const bit of [0, 1, 2]) await expect(reg(page, bit)).toHaveClass(/\bdone\b/);
  await expect(page.locator(".framed")).toHaveText("10101101");
  await expect(page.locator(".crc-tail")).toHaveText("101");
});

test("再生すると末尾まで進んで停止する", async ({ page }) => {
  await page.getByTitle("速度倍率").selectOption("8");
  await page.getByTitle("再生 / 一時停止 (Space)").click();
  await expect(counter(page)).toHaveText("15 / 15", { timeout: 10_000 });
  await expect(page.getByTitle("再生 / 一時停止 (Space)")).toHaveAttribute("aria-label", "再生");
});

test("ループ再生では末尾の次に先頭へ戻って再生を続ける", async ({ page }) => {
  const loop = page.getByTitle("ループ再生 (L)");
  await expect(loop).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("l");
  await expect(loop).toHaveAttribute("aria-pressed", "true");
  await page.getByTitle("速度倍率").selectOption("8");
  await page.getByTitle("再生 / 一時停止 (Space)").click();
  await expect(counter(page)).toHaveText("15 / 15", { timeout: 10_000 });
  await expect(counter(page)).toHaveText(/^[1-9] \/ 15$/, { timeout: 10_000 });
  await expect(page.getByTitle("再生 / 一時停止 (Space)")).toHaveAttribute("aria-label", "一時停止");
});

test("ループ設定は CRC 設定を変えても保持される", async ({ page }) => {
  await page.getByTitle("ループ再生 (L)").click();
  await page.getByLabel("プリセット").selectOption("CRC-8/SMBUS");
  await expect(page.getByTitle("ループ再生 (L)")).toHaveAttribute("aria-pressed", "true");
});

test("CRC-32/ISO-HDLC で 123456789 の CRC が check 値と一致する", async ({ page }) => {
  await page.getByLabel("プリセット").selectOption("CRC-32/ISO-HDLC");
  await page.locator("body").press("End");
  await expect(page.locator(".check")).toHaveText("check 値 0xCBF43926 と一致");
});

test("設定を変えると先頭に戻る", async ({ page }) => {
  await stepForward(page, 3);
  await page.getByLabel("入力", { exact: true }).fill("1");
  await expect(counter(page)).toHaveText("1 / 5");
});

test("不正な設定では項目にエラーを出し、図を消す", async ({ page }) => {
  await page.getByLabel("width").fill("0");
  await expect(page.locator(".error")).toHaveText("1〜32 の整数を入れてください");
  await expect(page.locator(".invalid-config")).toBeVisible();
  await expect(page.locator("svg.lfsr")).toHaveCount(0);
});
