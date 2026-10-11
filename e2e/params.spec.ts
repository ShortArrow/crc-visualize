import { expect, test } from "@playwright/test";
import { given, then, Visualizer, when } from "./support/visualizer";

const PARAMS = ["width", "poly", "init", "refin", "refout", "xorout"];

test.describe("パラメータの説明と強調", () => {
  test("設定項目にマウスを乗せると、そのパラメータの使用箇所がコードと図で強調される", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("poly の設定項目にマウスを乗せる", () => v.settings.param("poly").hover());
    await then("poly の項目・コードのチップ・タップのゲートが強調され、他のチップは強調されない", async () => {
      await expect(v.settings.param("poly")).toHaveClass(/\bhl\b/);
      await expect(v.code.chip("poly")).toHaveClass(/\bhl\b/);
      await expect(v.code.chip("init")).not.toHaveClass(/\bhl\b/);
      await expect(v.diagram.gate(1)).toHaveClass(/\bparam-hl\b/);
    });
  });

  test("コードのチップにマウスを乗せると、対応する設定項目が強調される", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("init のチップにマウスを乗せる", () => v.code.chip("init").hover());
    await then("init の項目だけが強調される", async () => {
      await expect(v.settings.param("init")).toHaveClass(/\bhl\b/);
      await expect(v.settings.param("poly")).not.toHaveClass(/\bhl\b/);
    });
  });

  test("設定項目は日本語名で示し、注目中のパラメータの説明・別名・注記を出す", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await then("poly は日本語名で示され、説明欄は使い方を案内する", async () => {
      await expect(v.settings.param("poly")).toContainText("生成多項式");
      await expect(v.settings.currentHelp()).toContainText("マウスを乗せると、説明と別名を表示します");
    });
    await when("CRC-16/ARC を選び、poly にマウスを乗せる", async () => {
      await v.settings.preset().selectOption("CRC-16/ARC");
      await v.settings.param("poly").hover();
    });
    await then("説明・別名と、右送りの反転表記の値を出す", async () => {
      await expect(v.settings.currentHelp()).toContainText("生成多項式");
      await expect(v.settings.currentHelp()).toContainText("別名");
      await expect(v.settings.currentHelp()).toContainText("0xA001");
    });
    await when("refin にマウスを乗せる", () => v.settings.param("refin").hover());
    await then("右送りの実装にあたると注記する", async () => {
      await expect(v.settings.currentHelp()).toContainText("右送り");
    });
  });

  for (const width of [1024, 1600]) {
    test(`横幅 ${width}px でも、どのパラメータの説明も見切れず、説明欄の高さが変わらない`, async ({ page }) => {
      const v = await given(`横幅 ${width}px で開いている`, async () => {
        await page.setViewportSize({ width, height: 900 });
        return Visualizer.open(page);
      });
      const idleHeight = (await v.settings.help().boundingBox())!.height;
      for (const param of PARAMS) {
        await when(`${param} にマウスを乗せる`, () => v.settings.param(param).hover());
        await then(`${param} の説明が見切れず、高さが変わらない`, async () => {
          await expect(v.settings.currentHelp()).toHaveAttribute("data-param", param);
          const { scroll, client } = await v.settings.help().evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
          expect(scroll).toBeLessThanOrEqual(client);
          expect((await v.settings.help().boundingBox())!.height).toBe(idleHeight);
        });
      }
    });
  }
});

test.describe("設定の検証と表記", () => {
  test("不正な設定では項目にエラーを出し、図を消す", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("width に 0 を入れる", () => page.getByLabel("width").fill("0"));
    await then("width にエラーが出て、図が消える", async () => {
      await expect(page.locator(".error")).toHaveText("1〜32 の整数を入れてください");
      await expect(page.locator(".invalid-config")).toBeVisible();
      await expect(v.diagram.root()).toHaveCount(0);
    });
  });

  test("画面の文に独自の略語や、日本語の直後の半角括弧を使わない", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    const visibleText = () =>
      page.locator("main").evaluate((main) => {
        const clone = main.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("pre.code, select").forEach((el) => el.remove());
        const titles = [...main.querySelectorAll("[title]")].map((el) => el.getAttribute("title")).join(" ");
        return `${clone.textContent} ${titles}`;
      });
    for (const preset of ["CRC-3/TUTORIAL", "CRC-32/ISO-HDLC"]) {
      await when(`${preset} の先頭 6 ステップを順に表示する`, async () => {
        await v.settings.preset().selectOption(preset);
        for (let i = 0; i < 6; i++) {
          await then(`${i + 1} ステップ目の文に fb や「日本語(」が無い`, async () => {
            const text = await visibleText();
            expect(text).not.toMatch(/\bfb\b/);
            expect(text).not.toMatch(/[ぁ-んァ-ヶー一-龠] ?\(/);
          });
          await v.stepForward();
        }
      });
    }
  });
});
