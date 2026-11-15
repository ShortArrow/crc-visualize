import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("The base and element badges", () => {
  test("the base badge of poly switches with Enter and Space, and at 10 poly is read in decimal", async ({ page }) => {
    const v = await given("CRC-16/ARC, whose poly is 0x8005", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/ARC");
      return v;
    });
    const generator = await v.settings.generator().textContent();
    await when("pressing Enter on the base badge of poly and entering 32773", async () => {
      await v.settings.badge("poly", "base").focus();
      await page.keyboard.press("Enter");
      await v.settings.param("poly").locator("input").fill("32773");
    });
    await then("the badge shows 10 and the generator is the same as for 0x8005", async () => {
      await expect(v.settings.badge("poly", "base")).toHaveText("10");
      await expect(v.settings.generator()).toHaveText(generator!);
      await expect(v.settings.error("poly")).toHaveCount(0);
    });
    await when("pressing Space on the badge", async () => {
      await v.settings.badge("poly", "base").focus();
      await page.keyboard.press("Space");
    });
    await then("the badge shows 16 and 32773 does not fit in 16 bits", async () => {
      await expect(v.settings.badge("poly", "base")).toHaveText("16");
      await expect(v.settings.error("poly")).toBeVisible();
    });
  });

  test("every badge can be pressed over at least 24×24 CSS px", async ({ page }) => {
    await given("the input mode is hex, so the input has its badges", async () => {
      const v = await Visualizer.open(page);
      await v.settings.field("inputMode").selectOption("hex");
    });
    await then("each badge's box is at least 24 px wide and high", async () => {
      const badges = page.locator(".config [data-badge]");
      await expect(badges).toHaveCount(5);
      for (const badge of await badges.all()) {
        const box = (await badge.boundingBox())!;
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24);
      }
    });
  });

  test("the element badge reads 16-bit numbers in the hex input, and it is kept across a reload and in the URL", async ({
    page,
  }) => {
    const v = await given("hex input holding {0x3231, 0x0033}", async () => {
      const v = await Visualizer.open(page);
      await v.settings.field("inputMode").selectOption("hex");
      await v.settings.field("input").fill("{0x3231, 0x0033}");
      return v;
    });
    await then("with the element at 8, 0x3231 is an error", () => expect(v.settings.error("input")).toBeVisible());
    await when("pressing the element badge twice, to 16 LE", async () => {
      await v.settings.badge("input", "element").click();
      await v.settings.badge("input", "element").click();
    });
    await then("the input reads and the URL carries element=16le and an empty base", async () => {
      await expect(v.settings.badge("input", "element")).toHaveText("16 LE");
      await expect(v.settings.error("input")).toHaveCount(0);
      await expect.poll(() => v.settings.query().get("element")).toBe("16le");
      expect(v.settings.query().get("base")).toBe("");
    });
    await when("reloading", () => page.reload());
    await then("the element is still 16 LE", () => expect(v.settings.badge("input", "element")).toHaveText("16 LE"));
  });

  test("choosing a preset sets the bases back to 16", async ({ page }) => {
    const v = await given("poly at base 10", async () => {
      const v = await Visualizer.open(page);
      await v.settings.badge("poly", "base").click();
      return v;
    });
    await when("choosing CRC-16/ARC", () => v.settings.preset().selectOption("CRC-16/ARC"));
    await then("the base of poly is 16 and its 0x8005 reads", async () => {
      await expect(v.settings.badge("poly", "base")).toHaveText("16");
      await expect(v.settings.error("poly")).toHaveCount(0);
    });
  });
});
