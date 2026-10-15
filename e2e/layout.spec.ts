import { expect } from "@playwright/test";
import { given, test, then } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

const PAGES = ["#names", "#cyclic", "#redundancy", "#check", "#equivalence", "#table"];

test.describe("Page layout", () => {
  for (const hash of PAGES) {
    test(`on a wide screen, ${hash} spreads its content across the editor area instead of leaving the right side empty`, async ({
      page,
    }) => {
      const v = await given(`${hash} is open on a 1366 px wide screen`, async () => {
        await page.goto(`/?width=16&poly=0x1021&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789${hash}`);
        const v = Visualizer.on(page);
        await expect(page.locator(".editor > *").first()).toBeVisible();
        return v;
      });
      await then("at least two thirds of the rows with content reach past the middle of the editor", async () => {
        expect(await v.workbench.contentFill()).toBeGreaterThanOrEqual(2 / 3);
      });
    });
  }
});
