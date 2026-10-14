import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("コードの言語", () => {
  test("言語を替えると同じ手順をその言語で書き、ステップの行のハイライトと注記を保つ", async ({ page }) => {
    const v = await given("既定の擬似コードで開いている", () => Visualizer.open(page));
    await when("Haskell を選んで xor ステップへ進む", async () => {
      await v.code.langSelect().selectOption("haskell");
      await v.goTo("xor");
    });
    await then("Haskell のコードで xor の行がハイライトされ、URL に code=haskell が載る", async () => {
      await expect(v.code.activeLine()).toContainText("then shifted `xor` poly");
      expect(v.settings.query().get("code")).toBe("haskell");
    });
    await then("無効な行の注記は Haskell の行コメントで書く", async () => {
      await expect(v.code.disabledLineOf("refout")).toContainText("-- refout が false なので実行しない");
    });
    await when("再読み込みする", () => page.reload());
    await then("Haskell のまま開く", async () => {
      await expect(v.code.langSelect()).toHaveValue("haskell");
      await expect(v.code.line("checksum inputBits")).toBeVisible();
    });
  });

  test("値はその言語のリテラルで書く", async ({ page }) => {
    const v = await given("CRC-16/KERMIT を Pascal で開いている", async () => {
      const v = await Visualizer.open(page, "?code=pascal");
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await then("poly は $1021、refin は True と書く", async () => {
      await expect(v.code.chip("poly").locator(".chip-value")).toHaveText("$1021");
      await expect(v.code.chip("refin").locator(".chip-value")).toHaveText("True");
    });
  });

  test("欄より長い行があっても、全ての行の書き出しの位置が揃う", async ({ page }) => {
    const v = await given("CRC-16/KERMIT を Haskell で開いている", async () => {
      const v = await Visualizer.open(page, "?code=haskell");
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await then("各行のコードの左端は同じ位置にある", async () => {
      const lefts = await v.code.texts().evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
      expect(new Set(lefts).size).toBe(1);
    });
  });
});
