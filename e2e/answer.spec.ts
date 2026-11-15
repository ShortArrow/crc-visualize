import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("The answer without playback", () => {
  test("the settings panel shows the CRC of the range at the first step", async ({ page }) => {
    await given("CRC-16/ARC over 123456789, at the first step", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/ARC");
      await expect(v.counter).toHaveText(/^1 \//);
    });
    await then("crc = 0xBB3D is shown", () => expect(page.locator(".config-crc")).toHaveText("crc = 0xBB3D"));
  });

  test("Progress per byte lists the register after each byte and the CRC, and a row moves playback to its end", async ({
    page,
  }) => {
    const v = await given("CRC-8/SMBUS over 123456789, at the first step", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-8/SMBUS");
      return v;
    });
    await when("choosing Per byte", () => page.locator('.log-views [data-view="perByte"]').click());
    await then("there are 9 rows, the last register 0xF4, followed by crc = 0xF4, in place of the steps", async () => {
      await expect(page.locator(".log-list")).toHaveCount(0);
      await expect(page.locator(".byte-log tbody tr")).toHaveCount(9);
      await expect(page.locator(".byte-log tbody tr").last().locator("td").last()).toHaveText("0xF4");
      await expect(page.locator(".byte-log-crc")).toHaveText("crc = 0xF4");
    });
    await when("pressing byte 3", () => page.locator(".byte-log tbody tr").nth(3).getByRole("button").click());
    await then("playback is at the end of byte 3, and its row is marked", async () => {
      await expect(v.counter).not.toHaveText(/^1 \//);
      await expect(page.locator(".byte-log tbody tr.current th")).toHaveText("3");
    });
  });

  test("Per byte is not offered when the input is not whole bytes", async ({ page }) => {
    await given("CRC-3/TUTORIAL over the 5 bits 10101", () => Visualizer.open(page));
    await then("there is no switch of views", () => expect(page.locator(".log-views")).toHaveCount(0));
  });
});
