import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { CheckPage } from "./support/checkPage";

const jump = (page: Page) => page.locator(".check-page h2 button");

const ARC = "?width=16&poly=0x8005&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";

test.describe("Comparing your own values on the Check page", () => {
  test("a pasted received frame replaces the received sequence and both checks give their verdicts", async ({ page }) => {
    const c = await given("the Check page with CRC-16/ARC over 123456789", () => CheckPage.open(page, ARC));
    const field = page.locator('.compare-card label[data-field="received"] input');
    await when("pasting 123456789 followed by its CRC 0xBB3D low byte first", () =>
      field.fill("31 32 33 34 35 36 37 38 39 3D BB"),
    );
    await then("both checks find no error", async () => {
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "true");
      await expect(c.verdict("whole")).toHaveAttribute("data-ok", "true");
    });
    await when("pasting the same frame with its 4th byte changed", () => field.fill("31 32 33 30 35 36 37 38 39 3D BB"));
    await then("both checks find an error", async () => {
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "false");
      await expect(c.verdict("whole")).toHaveAttribute("data-ok", "false");
    });
    await when("pasting one byte, shorter than the CRC", () => field.fill("31"));
    await then("it is an error", () => expect(page.locator('.compare-card label[data-field="received"] .error')).toBeVisible());
  });

  test("your check is compared with the CRC of 123456789 with the current settings", async ({ page }) => {
    await given("the Check page with CRC-16/ARC", () => CheckPage.open(page, ARC));
    const field = page.locator('.compare-card label[data-field="yourCheck"] input');
    const result = page.locator(".compare-card .compare-result");
    await when("pasting 0xBB3D", () => field.fill("0xBB3D"));
    await then("it is marked as matching", () => expect(result).toHaveAttribute("data-result", "ok"));
    await when("pasting 0xBB3C", () => field.fill("0xBB3C"));
    await then("both are shown in binary, with the differing bit marked", async () => {
      await expect(result).toHaveAttribute("data-result", "ng");
      await expect(result.locator(".compare-bits .diff")).toHaveCount(2);
    });
  });

  test("the button beside the page heading moves to the Compare card, which comes after both verdicts", async ({ page }) => {
    const c = await given("the Check page", () => CheckPage.open(page, ARC));
    await then("the button says what the card is for, and the card comes after the verdicts", async () => {
      await expect(jump(page)).toContainText("自分のコードの値と比べる");
      const verdict = (await c.verdict("whole").boundingBox())!;
      const card = (await page.locator(".compare-card").boundingBox())!;
      expect(card.y).toBeGreaterThan(verdict.y + verdict.height);
    });
    await when("pressing the button", () => jump(page).click());
    await then("the cursor is in the received field, which is in view", async () => {
      const field = page.locator('.compare-card label[data-field="received"] input');
      await expect(field).toBeFocused();
      await expect(field).toBeInViewport({ ratio: 1 });
    });
  });
});
