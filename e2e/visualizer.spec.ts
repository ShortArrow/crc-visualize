import { expect, test, type Page } from "@playwright/test";

const counter = (page: Page) => page.locator(".counter");
const reg = (page: Page, bit: number) => page.locator(`.reg[data-bit="${bit}"]`);
const activeLine = (page: Page) => page.locator(".code-line.active");
const latestLog = (page: Page) => page.locator(".log-entry.latest");

async function stepForward(page: Page, times: number) {
  for (let i = 0; i < times; i++) await page.keyboard.press("ArrowRight");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(counter(page)).toHaveText("1 / 15");
});

test("xor ステップでは poly の 1 のビットの箱の値だけが裏返り、箱の色は変わらない", async ({ page }) => {
  const look = (bit: number) =>
    reg(page, bit).evaluate((el) => {
      const rect = getComputedStyle(el.querySelector("rect")!);
      const digit = getComputedStyle(el.querySelector(".reg-bit:not(.flip-old)")!);
      return [rect.stroke, rect.fill, digit.fill].join(" ");
    });
  await stepForward(page, 3);
  await expect(counter(page)).toHaveText("4 / 15");
  await expect(latestLog(page).locator(".log-title")).toHaveText("多項式と XOR");
  await expect(reg(page, 0)).toHaveClass(/\bhit\b/);
  await expect(reg(page, 1)).toHaveClass(/\bhit\b/);
  await expect(reg(page, 2)).not.toHaveClass(/\bhit\b/);
  await expect.poll(() => look(0)).toBe(await look(2));
  await expect.poll(() => look(1)).toBe(await look(2));
  await expect(activeLine(page)).toContainText("crc ^= poly");
  await expect(latestLog(page)).toContainText("0b011");
});

test("ログは新しい順に流れ、最新の行だけ大きく表示され、コマ戻しで巻き戻る", async ({ page }) => {
  await stepForward(page, 3);
  const entries = page.locator(".log-entry");
  await expect(entries).toHaveCount(4);
  await expect(entries.nth(0)).toHaveClass(/\blatest\b/);
  await expect(entries.nth(0)).toContainText("多項式と XOR");
  await expect(entries.nth(1)).toContainText("シフト");
  await expect(entries.nth(3)).toContainText("初期化");
  const fontSize = (i: number) =>
    entries.nth(i).locator(".log-title").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(await fontSize(0)).toBeGreaterThan(await fontSize(1));
  expect(await fontSize(1)).toBe(await fontSize(3));
  const opacity = (i: number) => entries.nth(i).evaluate((el) => getComputedStyle(el).opacity);
  expect(await opacity(1)).toBe("1");
  expect(await opacity(3)).toBe("1");
  expect(await page.locator(".log").evaluate((el) => getComputedStyle(el).maskImage)).toBe("none");
  await page.keyboard.press("ArrowLeft");
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText("シフト");
});

test("ソフトウェア欄の高さはログの行数によらず一定", async ({ page }) => {
  const height = () => page.locator(".software").evaluate((el) => el.getBoundingClientRect().height);
  const first = await height();
  await stepForward(page, 3);
  await expect(counter(page)).toHaveText("4 / 15");
  expect(await height()).toBe(first);
  await page.keyboard.press("End");
  await expect(counter(page)).toHaveText("15 / 15");
  expect(await height()).toBe(first);
});

test("図は配線の色と動く粒で値の流れを示し、計算式の文字列は出さない", async ({ page }) => {
  const wire = (name: string) => page.locator(`.lfsr [data-wire="${name}"]`);
  const particle = (route: string) => page.locator(`.lfsr .particle[data-route="${route}"]`);
  await expect(page.locator(".legend")).toContainText("⊕ = XOR（2 入力が異なれば 1）");
  await expect(page.locator(".lfsr .particle")).toHaveCount(0);
  await expect(wire("feedback").first()).toHaveAttribute("data-level", "none");
  await stepForward(page, 1); // msb 0 ⊕ bit 1 = feedback 1
  await expect(counter(page)).toHaveText("2 / 15");
  await expect(particle("input")).toHaveText("1");
  await expect(particle("msb")).toHaveText("0");
  await expect(wire("input")).toHaveAttribute("data-level", "1");
  const filterUnits = await page.locator(".lfsr filter#glow").getAttribute("filterUnits");
  expect(filterUnits, "直線の配線は外接矩形の幅か高さが 0 なので、光彩の範囲を図全体の座標で取る").toBe("userSpaceOnUse");
  await expect.poll(() => page.locator(".lfsr .particle").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  await expect(wire("msb")).toHaveAttribute("data-level", "0");
  await expect(wire("feedback").first()).toHaveAttribute("data-level", "1");
  await stepForward(page, 2); // xor
  await expect(counter(page)).toHaveText("4 / 15");
  await expect(page.locator(".lfsr .particle")).toHaveCount(4);
  await expect(particle("tap-0")).toHaveText("1");
  await expect(particle("tap-1")).toHaveText("1");
  await expect(particle("out-0")).toHaveText("1");
  await expect(particle("out-1")).toHaveText("1");
  await expect(wire("tap-in-1")).toHaveAttribute("data-level", "0");
  await expect(wire("tap-out-1")).toHaveAttribute("data-level", "1");
  await expect(wire("tap-out-0")).toHaveAttribute("data-level", "1");
  await expect(wire("input")).toHaveAttribute("data-level", "none");
  await expect(page.locator(".lfsr")).not.toContainText("⊕");
  await expect(page.locator(".lfsr")).not.toContainText("=");
});

test("次のステップで新しく箱に入る値だけを、箱の右隣に控えとして先に出す", async ({ page }) => {
  const upcoming = page.locator(".lfsr .upcoming");
  const valueAt = (bit: number) => page.locator(`.lfsr .upcoming[data-bit="${bit}"]`);
  await expect(upcoming).toHaveCount(0);
  await stepForward(page, 1); // 次は shift: r0 に 0 が入る
  await expect(counter(page)).toHaveText("2 / 15");
  await expect(upcoming).toHaveCount(1);
  await expect(valueAt(0)).toHaveText("0");
  await stepForward(page, 1); // 次は xor: 011
  await expect(upcoming).toHaveCount(2);
  await expect(valueAt(0)).toHaveText("1");
  await expect(valueAt(1)).toHaveText("1");
  const box = await reg(page, 1).locator("rect").boundingBox();
  const hint = await valueAt(1).boundingBox();
  expect(hint!.x, "値が入ってくる右側に出す").toBeGreaterThan(box!.x + box!.width);
  await stepForward(page, 1); // 次は feedback
  await expect(upcoming).toHaveCount(0);
});

test("ゲートの色は計算中なら黄、それ以外はフィードバックビットによらず灰", async ({ page }) => {
  const YELLOW = "rgb(229, 192, 123)";
  const GRAY = "rgb(75, 80, 96)";
  const stroke = (gate: string) =>
    page.locator(`.gate[data-gate="${gate}"] circle`).evaluate((el) => getComputedStyle(el).stroke);
  await expect(page.locator(".legend")).toContainText("赤 = 値 1");
  await stepForward(page, 1); // フィードバックビット 1 の計算
  await expect(counter(page)).toHaveText("2 / 15");
  await expect.poll(() => stroke("input")).toBe(YELLOW);
  await expect.poll(() => stroke("1")).toBe(GRAY);
  await stepForward(page, 2); // xor
  await expect(counter(page)).toHaveText("4 / 15");
  await expect.poll(() => stroke("input")).toBe(GRAY);
  await expect.poll(() => stroke("1")).toBe(YELLOW);
  await stepForward(page, 1); // フィードバックビット 0 の計算
  await expect(counter(page)).toHaveText("5 / 15");
  await expect.poll(() => stroke("input")).toBe(YELLOW);
});

test("設定項目にマウスを乗せると、そのパラメータの使用箇所がコードと図で強調される", async ({ page }) => {
  await page.locator('label[data-param="poly"]').hover();
  await expect(page.locator('label[data-param="poly"]')).toHaveClass(/\bhl\b/);
  await expect(page.locator('.chip[data-param="poly"]')).toHaveClass(/\bhl\b/);
  await expect(page.locator('.chip[data-param="init"]')).not.toHaveClass(/\bhl\b/);
  await expect(page.locator('.gate[data-gate="1"]')).toHaveClass(/\bparam-hl\b/);
});

for (const width of [1024, 1600]) {
  test(`説明欄は横幅 ${width}px でもどのパラメータの説明も見切れず、高さが変わらない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const help = page.locator(".param-help");
    const idleHeight = (await help.boundingBox())!.height;
    for (const param of ["width", "poly", "init", "refin", "refout", "xorout"]) {
      await page.locator(`label[data-param="${param}"]`).hover();
      await expect(help.locator(".current")).toHaveAttribute("data-param", param);
      const { scroll, client } = await help.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
      expect(scroll, param).toBeLessThanOrEqual(client);
      expect((await help.boundingBox())!.height, param).toBe(idleHeight);
    }
  });
}

test("設定項目は日本語名で示し、注目中のパラメータの説明と別名を出す", async ({ page }) => {
  const help = page.locator(".param-help .current");
  await expect(page.locator('label[data-param="poly"]')).toContainText("生成多項式");
  await expect(help).toContainText("マウスを乗せると、説明と別名を表示します");
  await page.getByLabel("プリセット").selectOption("CRC-16/ARC");
  await page.locator('label[data-param="poly"]').hover();
  await expect(help).toContainText("生成多項式");
  await expect(help).toContainText("別名");
  await expect(help).toContainText("0xA001");
  await page.locator('label[data-param="refin"]').hover();
  await expect(help).toContainText("右送り");
});

test("コードのチップにマウスを乗せると、対応する設定項目が強調される", async ({ page }) => {
  await page.locator('.chip[data-param="init"]').hover();
  await expect(page.locator('label[data-param="init"]')).toHaveClass(/\bhl\b/);
  await expect(page.locator('label[data-param="poly"]')).not.toHaveClass(/\bhl\b/);
});

test("無効なパラメータの行も、値と理由つきで薄く表示される", async ({ page }) => {
  const line = page.locator(".code-line.disabled", { has: page.locator('.chip[data-param="refout"]') });
  await expect(line).toContainText("refout が false なので実行しない");
  await expect(line.locator('.chip[data-param="refout"]')).toContainText("false");
});

test("フィードバックビットが 0 のシフトでは if が false と注記され、本体が打ち消される", async ({ page }) => {
  await stepForward(page, 5);
  await expect(counter(page)).toHaveText("6 / 15");
  await expect(page.locator(".code-line", { hasText: "if (feedback == 1)" })).toContainText("// false");
  await expect(page.locator(".code-line.skipped")).toContainText("crc ^= poly");
  await expect(page.locator('.lfsr [data-wire="feedback"]').first()).toHaveAttribute("data-level", "0");
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
  await page.getByTitle("再生 / 一時停止（Space）").click();
  await expect(counter(page)).toHaveText("15 / 15", { timeout: 10_000 });
  await expect(page.getByTitle("再生 / 一時停止（Space）")).toHaveAttribute("aria-label", "再生");
});

test("ループ再生では末尾の次に先頭へ戻って再生を続ける", async ({ page }) => {
  const loop = page.getByTitle("ループ再生（L）");
  await expect(loop).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("l");
  await expect(loop).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await expect(counter(page)).toHaveText("14 / 15");
  await page.getByTitle("再生 / 一時停止（Space）").click();
  await expect(counter(page)).toHaveText("15 / 15");
  await expect(counter(page)).toHaveText("1 / 15", { timeout: 5_000 });
  await expect(page.getByTitle("再生 / 一時停止（Space）")).toHaveAttribute("aria-label", "一時停止");
});

test("ループ設定は CRC 設定を変えても保持される", async ({ page }) => {
  await page.getByTitle("ループ再生（L）").click();
  await page.getByLabel("プリセット").selectOption("CRC-8/SMBUS");
  await expect(page.getByTitle("ループ再生（L）")).toHaveAttribute("aria-pressed", "true");
});

test("CRC-32/ISO-HDLC で 123456789 の CRC が検査値と一致する", async ({ page }) => {
  await page.getByLabel("プリセット").selectOption("CRC-32/ISO-HDLC");
  await page.locator("body").press("End");
  await expect(page.locator(".check")).toHaveText("検査値 0xCBF43926 と一致");
});

test("設定を変えると先頭に戻る", async ({ page }) => {
  await stepForward(page, 3);
  await page.getByLabel("入力", { exact: true }).fill("1");
  await expect(counter(page)).toHaveText("1 / 5");
});

test("画面の文に独自の略語や日本語直後の半角括弧を使わない", async ({ page }) => {
  for (const preset of ["CRC-3/TUTORIAL", "CRC-32/ISO-HDLC"]) {
    await page.getByLabel("プリセット").selectOption(preset);
    for (let i = 0; i < 6; i++) {
      const text = await page.locator("main").evaluate((main) => {
        const clone = main.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("pre.code, select").forEach((el) => el.remove());
        const titles = [...main.querySelectorAll("[title]")].map((el) => el.getAttribute("title")).join(" ");
        return `${clone.textContent} ${titles}`;
      });
      expect(text).not.toMatch(/\bfb\b/);
      expect(text).not.toMatch(/[ぁ-んァ-ヶー一-龠] ?\(/);
      await stepForward(page, 1);
    }
  }
});

test("不正な設定では項目にエラーを出し、図を消す", async ({ page }) => {
  await page.getByLabel("width").fill("0");
  await expect(page.locator(".error")).toHaveText("1〜32 の整数を入れてください");
  await expect(page.locator(".invalid-config")).toBeVisible();
  await expect(page.locator("svg.lfsr")).toHaveCount(0);
});
