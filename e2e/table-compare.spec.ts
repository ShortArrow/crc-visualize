import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { TablePage } from "./support/tablePage";

const XMODEM = "?width=16&poly=0x1021&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=text&input=123456789";

/** Table T of poly 0x1021 for a left shift, by a bit-at-a-time loop written apart from the app. */
function xmodemTable(): number[] {
  return Array.from({ length: 256 }, (_, i) => {
    let crc = i << 8;
    for (let k = 0; k < 8; k++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
    return crc;
  });
}

const asC = (values: readonly number[]) => `{ ${values.map((v) => `0x${v.toString(16).padStart(4, "0")}`).join(", ")} }`;

const field = (page: Page) => page.locator('.compare-card label[data-field="yourTable"] textarea');
const result = (page: Page) => page.locator(".compare-card .table-result");

test.describe("Comparing your table on the Table page", () => {
  test("a table made for a left shift matches, and a changed entry is chosen in table T", async ({ page }) => {
    const t = await given("the Table page with poly 0x1021 and no reflection, which uses a left shift", () =>
      TablePage.open(page, XMODEM),
    );
    const table = xmodemTable();
    await when("pasting its table T as a C array", () => field(page).fill(asC(table)));
    await then("it matches table T for a left shift", async () => {
      await expect(result(page)).toHaveAttribute("data-result", "ok");
      await expect(result(page)).toHaveAttribute("data-shift", "left");
    });
    await when("pasting it with entry 5 changed", () => field(page).fill(asC(table.map((v, i) => (i === 5 ? v ^ 1 : v)))));
    await then("it differs first at index 5, which is chosen in table T and how its value is made is shown", async () => {
      await expect(result(page)).toHaveAttribute("data-result", "ng");
      await expect(result(page)).toHaveAttribute("data-index", "5");
      await expect(t.entryTitle()).toContainText("T[0x05]");
    });
    await when("pasting 255 numbers", () => field(page).fill(asC(table.slice(1))));
    await then("it is an error that gives the count", () =>
      expect(page.locator('.compare-card label[data-field="yourTable"] .error')).toContainText("255"),
    );
  });
});
