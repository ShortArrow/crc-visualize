import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { NamesPage } from "./support/namesPage";
import { NarrowPage } from "./support/narrowPage";

const field = (page: Page, name: string) => page.locator(`.compare-card label[data-field="${name}"] input`);
const result = (page: Page) => page.locator(".compare-card .compare-result");
const hint = (page: Page, notation: string) => page.locator(`.compare-card .compare-hint[data-notation="${notation}"]`);

test.describe("Comparing your poly on the Naming page", () => {
  test("a poly in normal notation names the presets it is, and another notation is tried only when none matches", async ({
    page,
  }) => {
    await given("the Naming page", () => NamesPage.open(page));
    await when("pasting 0x1021 with width 16", async () => {
      await field(page, "width").fill("16");
      await field(page, "your poly").fill("0x1021");
    });
    await then("CRC-16/XMODEM and CRC-16/KERMIT are named after ✓", async () => {
      await expect(result(page)).toHaveAttribute("data-result", "ok");
      await expect(result(page)).toContainText("CRC-16/XMODEM");
      await expect(result(page)).toContainText("CRC-16/KERMIT");
    });
    await when("pasting 0x8408, the reversed notation of 0x1021", () => field(page, "your poly").fill("0x8408"));
    await then("✗, and CRC-16/KERMIT would match in reversed notation", async () => {
      await expect(result(page)).toHaveAttribute("data-result", "ng");
      await expect(hint(page, "reversed")).toContainText("CRC-16/KERMIT");
    });
    await when("pasting 0x11021, with the x^16 term included", () => field(page, "your poly").fill("0x11021"));
    await then("it fits in 17 bits and would match with x^width included", () =>
      expect(hint(page, "full")).toContainText("CRC-16/XMODEM"),
    );
  });

  test("with width empty, a value matches across widths, and giving the width tells the notations apart", async ({ page }) => {
    await given("the Naming page", () => NamesPage.open(page));
    await when("pasting 0x9 with width empty", () => field(page, "your poly").fill("0x9"));
    await then("the 5- and 7-bit presets whose poly it is are named", async () => {
      await expect(result(page)).toContainText("CRC-5/EPC-C1G2");
      await expect(result(page)).toContainText("CRC-7/MMC");
      await expect(hint(page, "koopman")).toHaveCount(0);
    });
    await when("giving width 4", () => field(page, "width").fill("4"));
    await then("✗, and CRC-4/G-704 would match in Koopman notation", async () => {
      await expect(result(page)).toHaveAttribute("data-result", "ng");
      await expect(hint(page, "koopman")).toContainText("CRC-4/G-704");
    });
    await when("giving width 65", () => field(page, "width").fill("65"));
    await then("the width is an error", () =>
      expect(page.locator('.compare-card label[data-field="width"] .error')).toBeVisible(),
    );
  });
});

test.describe("Comparing your check on the Narrow down page", () => {
  test("a check names the presets whose CRC of 123456789 it is, within the width given", async ({ page }) => {
    await given("the Narrow down page", () => NarrowPage.open(page));
    await when("pasting 0xBB3D", () => field(page, "your check").fill("0xBB3D"));
    await then("CRC-16/ARC is named after ✓", async () => {
      await expect(result(page)).toHaveAttribute("data-result", "ok");
      await expect(result(page)).toContainText("CRC-16/ARC");
    });
    await when("giving width 32", () => field(page, "width").fill("32"));
    await then("no preset of that width matches", () => expect(result(page)).toHaveAttribute("data-result", "ng"));
  });
});

test.describe("The Compare cards on a short screen", () => {
  test.use({ viewport: { width: 1280, height: 590 } });

  for (const [name, open] of [
    ["Naming", (page: Page) => NamesPage.open(page)],
    ["Narrow down", (page: Page) => NarrowPage.open(page)],
  ] as const) {
    test(`the ${name} page's Compare card comes first and stays open`, async ({ page }) => {
      await given(`the ${name} page on 1280×590`, () => open(page));
      await then("the card's fields are visible above the rest of the page", async () => {
        await expect(page.locator(".compare-card form")).toBeVisible();
        const card = (await page.locator(".compare-card").boundingBox())!;
        const after = page.locator(".editor details, .editor .pane, .editor .page-columns").first();
        expect(card.y).toBeLessThan((await after.boundingBox())!.y);
      });
    });
  }
});
