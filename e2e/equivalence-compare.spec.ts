import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { EquivalencePage } from "./support/equivalencePage";

const XMODEM_REFLECTED = "?width=16&poly=0x1021&init=0xFFFF&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";

const field = (page: Page, name: string) => page.locator(`.compare-card label[data-field="${name}"] input`);
const result = (page: Page, name: string) => page.locator(`.compare-card .constant-result[data-field="${name}"]`);

test.describe("Comparing your poly and your init on the Equivalences page", () => {
  test("each constant is marked as the setting as it is, reversed, or neither with both forms written out", async ({ page }) => {
    await given("the Equivalences page with poly 0x1021 and init 0xFFFF in 16 bits", () =>
      EquivalencePage.open(page, XMODEM_REFLECTED),
    );
    await when("pasting 0x1021 into your poly", () => field(page, "your poly").fill("0x1021"));
    await then("it is the setting as it is", () => expect(result(page, "your poly")).toHaveAttribute("data-form", "asIs"));
    await when("pasting 0x8408, its reversed form", () => field(page, "your poly").fill("0x8408"));
    await then("it is the setting reversed, as a right-shift implementation writes it", () =>
      expect(result(page, "your poly")).toHaveAttribute("data-form", "reversed"),
    );
    await when("pasting 0x1234", () => field(page, "your poly").fill("0x1234"));
    await then("it is neither, and both forms are written out", async () => {
      await expect(result(page, "your poly")).toHaveAttribute("data-form", "neither");
      await expect(result(page, "your poly")).toContainText("0x1021");
      await expect(result(page, "your poly")).toContainText("0x8408");
    });
    await when("pasting 0xFFFF into your init, which reads the same reversed", () => field(page, "your init").fill("0xFFFF"));
    await then("it is the setting as it is", () => expect(result(page, "your init")).toHaveAttribute("data-form", "asIs"));
  });

  test("the Compare card comes first, with an example in each empty field", async ({ page }) => {
    await given("the Equivalences page", () => EquivalencePage.open(page, XMODEM_REFLECTED));
    await then("the card is first and its fields show examples", async () => {
      const card = (await page.locator(".compare-card").boundingBox())!;
      const section = (await page.locator(".equivalence-page h3").first().boundingBox())!;
      expect(card.y).toBeLessThan(section.y);
      await expect(field(page, "your poly")).toHaveAttribute("placeholder", "例：0x1021");
      await expect(field(page, "your init")).toHaveAttribute("placeholder", "例：0x0000");
    });
  });
});
