import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { CheckPage } from "./support/checkPage";

const heading = (page: Page) => page.locator(".compare-card h3 button");

const ARC = "?width=16&poly=0x8005&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";

test.describe("Comparing your own values on the Check page", () => {
  test("a pasted received frame replaces the received sequence and both checks give their verdicts", async ({ page }) => {
    const c = await given("the Check page with CRC-16/ARC over 123456789, its Compare card opened", async () => {
      const c = await CheckPage.open(page, ARC);
      await heading(page).click();
      return c;
    });
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
    await given("the Check page with CRC-16/ARC, its Compare card opened", async () => {
      await CheckPage.open(page, ARC);
      await heading(page).click();
    });
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

  test("the Compare card is folded to its heading at first, and opens and closes on it", async ({ page }) => {
    await given("the Check page", () => CheckPage.open(page, ARC));
    await then("only the heading is shown, as a button saying what it is for", async () => {
      await expect(heading(page)).toHaveAttribute("aria-expanded", "false");
      await expect(heading(page)).toContainText("自分のコードの値と比べる");
      await expect(page.locator(".compare-card form")).toHaveCount(0);
    });
    await when("pressing the heading", () => heading(page).click());
    await then("the fields are shown", async () => {
      await expect(heading(page)).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator(".compare-card form")).toBeVisible();
    });
    await when("pressing it again", () => heading(page).click());
    await then("it is folded", () => expect(heading(page)).toHaveAttribute("aria-expanded", "false"));
  });

  test("the card folds once a pasted value reads, but not while typing or pressing a bit", async ({ page }) => {
    const c = await given("the Check page with its Compare card opened", async () => {
      const c = await CheckPage.open(page, ARC);
      await heading(page).click();
      return c;
    });
    const field = page.locator('.compare-card label[data-field="yourCheck"] input');
    await when("typing 0xBB3D", () => field.fill("0xBB3D"));
    await then("it stays open", () => expect(heading(page)).toHaveAttribute("aria-expanded", "true"));
    await when("pressing a bit of the received string", () => c.bits().last().click());
    await then("it stays open", () => expect(heading(page)).toHaveAttribute("aria-expanded", "true"));
    await when("pasting 0xBB3D", async () => {
      await field.fill("");
      await field.dispatchEvent("paste");
      await field.fill("0xBB3D");
    });
    await then("it folds, and its heading marks the match", async () => {
      await expect(heading(page)).toHaveAttribute("aria-expanded", "false");
      await expect(heading(page)).toContainText("✓");
    });
  });
});
