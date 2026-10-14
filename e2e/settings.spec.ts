import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { TUTORIAL_STEPS, Visualizer } from "./support/visualizer";

test.describe("設定の保持と共有", () => {
  test("設定は再読み込みしても保たれ、再生位置は先頭に戻る", async ({ page }) => {
    const v = await given("CRC-16/ARC・一定速度・×4・ループで、2 ステップ目にいる", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/ARC");
      await v.settings.speedMode().selectOption("steady");
      await v.settings.rate().selectOption("4");
      await v.settings.loop().click();
      await v.stepForward();
      return v;
    });
    await when("再読み込みする", () => page.reload());
    await then("設定はそのままで、先頭のステップにいる", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-16/ARC");
      await expect(v.settings.speedMode()).toHaveValue("steady");
      await expect(v.settings.rate()).toHaveValue("4");
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "true");
      await expect(v.counter).toHaveText(/^1 \//);
    });
  });

  test("保存値が壊れていても既定の設定で開く", async ({ page }) => {
    const v = await given("保存値が JSON として読めない", async () => {
      const v = await Visualizer.open(page);
      await page.evaluate(() => localStorage.setItem("crc-visualize:settings:v1", "{broken"));
      return v;
    });
    await when("再読み込みする", () => page.reload());
    await then("CRC-3/TUTORIAL の先頭で開く", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-3/TUTORIAL");
      await expect(v.counter).toHaveText(`1 / ${TUTORIAL_STEPS}`);
    });
  });

  test("設定を変えると URL のクエリも書き換わる", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("CRC-16/ARC を選び、ループ再生を有効にする", async () => {
      await v.settings.preset().selectOption("CRC-16/ARC");
      await v.settings.loop().click();
    });
    await then("クエリに poly・refin・loop が載る", async () => {
      await expect.poll(() => v.settings.query().get("poly")).toBe("0x8005");
      expect(v.settings.query().get("refin")).toBe("1");
      expect(v.settings.query().get("loop")).toBe("1");
    });
  });

  test("URL のクエリにある設定で開き、保存値より優先する", async ({ page }) => {
    const v = await given("速度倍率 ×4 を保存している", async () => {
      const v = await Visualizer.open(page);
      await v.settings.rate().selectOption("4");
      return v;
    });
    await when("CRC-16/ARC とループを載せ、速度倍率を載せない URL を開く", () =>
      page.goto("/?width=16&poly=0x8005&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789&loop=1"),
    );
    await then("URL の設定で開き、URL に無い速度倍率は保存値のまま", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-16/ARC");
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "true");
      await expect(v.settings.rate()).toHaveValue("4");
    });
  });
});
