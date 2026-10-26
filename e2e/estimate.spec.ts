import { expect } from "@playwright/test";
import { EstimatePage } from "./support/estimatePage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Estimation", () => {
  test("a catalogue table lists the presets of the width first with their check values, and a search turns the matching ones green", async ({
    page,
  }) => {
    const e = await given("two CRC-16/MODBUS pairs are entered", async () => {
      const e = await EstimatePage.open(page);
      await e.fill(0, "hello", "34F6");
      await e.fill(1, "world", "EF41");
      return e;
    });
    await then("the table starts with the 16-bit presets, and shows CRC-16/MODBUS's check value", async () => {
      await expect(e.catalogueRow().first()).toHaveAttribute("data-width", "16");
      await expect(e.catalogueRow("CRC-16/MODBUS")).toContainText("0x4B37");
      await expect(e.catalogueRow("CRC-16/MODBUS")).not.toHaveClass(/\bmatch\b/);
    });
    await when("searching", () => e.search().click());
    await then("only CRC-16/MODBUS's row is green", async () => {
      await expect(e.catalogueRow("CRC-16/MODBUS")).toHaveClass(/\bmatch\b/);
      await expect(e.root.locator(".preset-table tbody tr.match")).toHaveCount(1);
    });
  });

  test("finds the parameters from pairs of data and CRC, and opens a candidate in the visualizer", async ({ page }) => {
    const v = await given("the visualizer page is open", () => Visualizer.open(page));
    await when("switching to the estimation page and entering three CRC-16/MODBUS pairs", async () => {
      await v.workbench.pageLink("estimate").click();
      const e = await EstimatePage.shown(page);
      await e.fill(0, "hello", "34F6");
      await e.fill(1, "world", "EF41");
      await e.fill(2, "123456789", "0x4B37");
      await e.search().click();
    });
    const e = await then("the catalogue finds CRC-16/MODBUS and the brute force finds it too, with init determined", async () => {
      const e = await EstimatePage.shown(page);
      await expect(e.catalogueMatches()).toHaveText([/CRC-16\/MODBUS/]);
      await expect(e.bruteStatus()).toHaveAttribute("data-status", "ok");
      const modbus = e.candidates().filter({ hasText: "CRC-16/MODBUS" });
      await expect(modbus).toHaveCount(1);
      await expect(modbus).toContainText("0x8005");
      await expect(modbus).toContainText("0xFFFF");
      await expect(v.workbench.statusbar()).toContainText("候補");
      return e;
    });
    await when("opening CRC-16/MODBUS from the catalogue matches", () => e.catalogueMatches().first().locator("button").click());
    await then("the visualizer opens with its settings and the first pair's data", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-16/MODBUS");
      expect(new URL(page.url()).hash).toBe("");
    });
  });

  test("without two pairs of the same length, the brute force is not run and says why", async ({ page }) => {
    const e = await given("the estimation page is open", () => EstimatePage.open(page));
    await when("entering pairs of different lengths and searching", async () => {
      await e.fill(0, "hello", "34F6");
      await e.fill(1, "123456789", "4B37");
      await e.search().click();
    });
    await then("the brute force needs a same-length pair", async () => {
      await expect(e.bruteStatus()).toHaveAttribute("data-status", "needPair");
      await expect(e.candidates()).toHaveCount(0);
    });
  });

  test("an unreadable CRC is flagged in its field and nothing is searched", async ({ page }) => {
    const e = await given("the estimation page is open", () => EstimatePage.open(page));
    await when("entering a CRC that is not hexadecimal and searching", async () => {
      await e.fill(0, "hello", "xyz");
      await e.fill(1, "world", "EF41");
      await e.search().click();
    });
    await then("the field shows an error and there are no results", async () => {
      await expect(e.errors(0)).toBeVisible();
      await expect(e.bruteStatus()).toHaveCount(0);
    });
  });
});
