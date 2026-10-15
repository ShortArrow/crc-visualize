import { expect } from "@playwright/test";
import { RedundancyPage } from "./support/redundancyPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Redundancy", () => {
  test("shows the appended CRC bits and that the codewords are a part of all sequences", async ({ page }) => {
    const v = await given("the visualizer page is open", () => Visualizer.open(page));
    await when("switching to the redundancy page in the activity bar", () => v.workbench.pageLink("redundancy").click());
    await then("the codeword of x³ + x + 1 is shown split into a 4-bit message and a 3-bit CRC", async () => {
      const r = await RedundancyPage.shown(page);
      expect(r.hash()).toBe("#redundancy");
      await expect(r.sentBits("message")).toHaveCount(4);
      await expect(r.sentBits("crc")).toHaveCount(3);
      await expect(v.workbench.statusbar()).toContainText("n = 7");
    });
    await then("16 of the 128 sequences are codewords, and the received sequence is on a codeword dot", async () => {
      const r = await RedundancyPage.shown(page);
      await expect(r.counts()).toContainText("128");
      await expect(r.counts()).toContainText("16");
      await expect(r.counts()).toContainText("1/8");
      await expect(r.gridDots()).toHaveCount(128);
      await expect(r.gridDots("codeword")).toHaveCount(16);
      await expect(r.gridDots("received")).toHaveClass(/codeword/);
    });
  });

  test("flipping bits of the received sequence finds the error, but an error shaped like g(x) is missed", async ({ page }) => {
    const r = await given("the redundancy page for x³ + x + 1 is open", () => RedundancyPage.open(page));
    await then("no error", async () => {
      await expect(r.verdict()).toHaveAttribute("data-verdict", "clean");
      await expect(r.remainder()).toHaveText("000");
      await expect(r.burstLength()).toHaveText("0");
    });
    await when("flipping the x⁵ and x¹ bits", async () => {
      await r.receivedBit(1).click();
      await r.receivedBit(5).click();
    });
    await then("an error of length 5 is found and the received sequence leaves the codeword dots", async () => {
      await expect(r.error()).toHaveText("0100010");
      await expect(r.burstLength()).toHaveText("5");
      await expect(r.verdict()).toHaveAttribute("data-verdict", "detected");
      await expect(r.remainder()).not.toHaveText("000");
      await expect(r.gridDots("received")).not.toHaveClass(/codeword/);
    });
    await when("resetting", () => r.resetError().click());
    await then("it is back to no error", async () => {
      await expect(r.verdict()).toHaveAttribute("data-verdict", "clean");
      await expect(r.error()).toHaveText("0000000");
    });
    await when("selecting the missed example", () => r.missedExample().click());
    await then(
      "a length-4 error shaped like g(x) leaves remainder 0 and is missed, and the received sequence is another codeword",
      async () => {
        await expect(r.error()).toHaveText("0001011");
        await expect(r.burstLength()).toHaveText("4");
        await expect(r.remainder()).toHaveText("000");
        await expect(r.verdict()).toHaveAttribute("data-verdict", "missed");
        await expect(r.gridDots("received")).toHaveClass(/codeword/);
      },
    );
  });

  test("for a generator polynomial with many sequences, only the counts are shown, without a grid", async ({ page }) => {
    const r = await given("the redundancy page for x⁵ + x² + 1 is open", () =>
      RedundancyPage.open(page, "#redundancy/width=5/poly=0x5"),
    );
    await then("the codeword has 31 bits and there is no grid", async () => {
      await expect(r.sentBits()).toHaveCount(31);
      await expect(r.gridDots()).toHaveCount(0);
      await expect(r.counts()).toContainText("1/32");
    });
  });

  test("even with a short message, the message and CRC headings do not overlap", async ({ page }) => {
    const r = await given("the redundancy page for x⁴ + x³ + x² + x + 1, with a 1-bit message, is open", () =>
      RedundancyPage.open(page, "#redundancy/width=4/poly=0xF"),
    );
    await then("neither heading's text overflows its box", async () => {
      for (const part of ["message", "crc"] as const) {
        const overflow = await r.partLabel(part).evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      }
    });
    await then("the right edge of the message heading is left of the left edge of the CRC heading", async () => {
      const message = await r.partLabel("message").boundingBox();
      const crc = await r.partLabel("crc").boundingBox();
      expect(message!.x + message!.width).toBeLessThanOrEqual(crc!.x);
    });
  });
  test("for any length, a strip of the CRCs that could follow the received message shows the single fitting one and the one received", async ({
    page,
  }) => {
    const r = await given("the redundancy page for x⁴ + x + 1 (n = 15, too long for the grid) is open", () =>
      RedundancyPage.open(page, "#redundancy/width=4/poly=0x3"),
    );
    await then("the strip holds 16 CRCs, one fits the message, and the received CRC is that one", async () => {
      await expect(r.gridDots()).toHaveCount(0);
      await expect(r.stripCells()).toHaveCount(16);
      await expect(r.stripCells("fitting")).toHaveCount(1);
      await expect(r.stripCells("received")).toHaveClass(/fitting/);
    });
    await when("flipping the lowest bit of the CRC", () => r.receivedBit(14).click());
    await then("the received CRC moves off the fitting one, and the error is detected", async () => {
      await expect(r.stripCells("received")).not.toHaveClass(/fitting/);
      await expect(r.verdict()).toHaveAttribute("data-verdict", "detected");
    });
    await when("setting the missed example", () => r.missedExample().click());
    await then("the received CRC is again the fitting one of the changed message, and the error is missed", async () => {
      await expect(r.stripCells("received")).toHaveClass(/fitting/);
      await expect(r.verdict()).toHaveAttribute("data-verdict", "missed");
    });
  });
});
