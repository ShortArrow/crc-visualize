import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Code language", () => {
  test("switching language writes the same procedure in that language and keeps the step-line highlight and notes", async ({
    page,
  }) => {
    const v = await given("the page is open with the default pseudocode", () => Visualizer.open(page));
    await when("selecting Haskell and advancing to the xor step", async () => {
      await v.code.langSelect().selectOption("haskell");
      await v.goTo("xor");
    });
    await then("the xor line is highlighted in Haskell code and the URL carries code=haskell", async () => {
      await expect(v.code.activeLine()).toContainText("then shifted `xor` poly");
      expect(v.settings.query().get("code")).toBe("haskell");
    });
    await then("the note on a disabled line is written as a Haskell line comment", async () => {
      await expect(v.code.disabledLineOf("refout")).toContainText("-- refout が false なので実行しない");
    });
    await when("reloading", () => page.reload());
    await then("it opens still in Haskell", async () => {
      await expect(v.code.langSelect()).toHaveValue("haskell");
      await expect(v.code.line("checksum inputBits")).toBeVisible();
    });
  });

  test("values are written as that language's literals", async ({ page }) => {
    const v = await given("CRC-16/KERMIT is open in Pascal", async () => {
      const v = await Visualizer.open(page, "?code=pascal");
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await then("poly is written $1021 and refin True", async () => {
      await expect(v.code.chip("poly").locator(".chip-value")).toHaveText("$1021");
      await expect(v.code.chip("refin").locator(".chip-value")).toHaveText("True");
    });
  });

  test("all lines start at the same position even when a line is wider than the pane", async ({ page }) => {
    const v = await given("CRC-16/KERMIT is open in Haskell", async () => {
      const v = await Visualizer.open(page, "?code=haskell");
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await then("the left edge of every line's code is at the same position", async () => {
      const lefts = await v.code.texts().evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
      expect(new Set(lefts).size).toBe(1);
    });
  });
});
