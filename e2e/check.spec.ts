import { expect } from "@playwright/test";
import { CheckPage } from "./support/checkPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Check", () => {
  test("checks the received sequence two ways, and both find the error when a bit is corrupted", async ({ page }) => {
    const v = await given("CRC-16/KERMIT is selected", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await when("switching to the check page in the activity bar", () => v.workbench.pageLink("check").click());
    const c = await then("the sequence is a 72-bit message followed by a 16-bit CRC, and both ways find no error", async () => {
      const c = await CheckPage.shown(page);
      await expect(c.bits("message")).toHaveCount(72);
      await expect(c.bits("crc")).toHaveCount(16);
      await expect(c.computed()).toHaveText("0x2189");
      await expect(c.receivedCrc()).toHaveText("0x2189");
      await expect(c.wholeValue()).toHaveText(await c.residue().innerText());
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "true");
      await expect(c.verdict("whole")).toHaveAttribute("data-ok", "true");
      await expect(v.workbench.statusbar()).toContainText("CRC-16/KERMIT");
      return c;
    });
    await then("the catalogue's check value and the value computed from 123456789 appear side by side", async () => {
      await expect(c.catalogueCheck()).toHaveText("0x2189");
      await expect(c.computedCheck()).toHaveText("0x2189");
    });
    await when("flipping the 4th bit of the message", () => c.bit(3).click());
    await then("both ways find an error", async () => {
      await expect(c.computed()).not.toHaveText("0x2189");
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "false");
      await expect(c.verdict("whole")).toHaveAttribute("data-ok", "false");
    });
    await when("resetting and flipping a bit of the CRC", async () => {
      await c.resetFlips().click();
      await c.bit(80).click();
    });
    await then("the received CRC changes and both ways find an error", async () => {
      await expect(c.computed()).toHaveText("0x2189");
      await expect(c.receivedCrc()).not.toHaveText("0x2189");
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "false");
      await expect(c.verdict("whole")).toHaveAttribute("data-ok", "false");
    });
  });

  test("when refin and refout differ, running the whole codeword through does not apply", async ({ page }) => {
    const c = await given("the page is open with settings where only refin is true", () =>
      CheckPage.open(page, "?width=16&poly=0x1021&init=0x0&refin=1&refout=0&xorout=0x0&inputMode=text&input=12"),
    );
    await then("recomputing finds no error, and the whole-codeword way gives a reason", async () => {
      await expect(c.verdict("recheck")).toHaveAttribute("data-ok", "true");
      await expect(c.method("whole").locator(".not-applicable")).toBeVisible();
      await expect(c.catalogueCheck()).toHaveCount(0);
    });
  });

  test("shows no way of checking when the settings are invalid", async ({ page }) => {
    const c = await given("the page is open with width out of range", () => CheckPage.open(page, "?width=99"));
    await then("it says the settings are invalid and shows neither the received sequence nor the ways of checking", async () => {
      await expect(c.invalid()).toBeVisible();
      await expect(c.bits()).toHaveCount(0);
      await expect(c.method("recheck")).toHaveCount(0);
    });
  });
});
