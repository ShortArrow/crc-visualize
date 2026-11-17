import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

/** The register of CRC-8/SMBUS after each byte of 123456789, by a bit-at-a-time loop written apart from the app. */
function smbusAfterEachByte(): number[] {
  let reg = 0;
  return [..."123456789"].map((c) => {
    for (let i = 7; i >= 0; i--) {
      const fb = ((reg >> 7) & 1) ^ ((c.charCodeAt(0) >> i) & 1);
      reg = (reg << 1) & 0xff;
      if (fb) reg ^= 0x07;
    }
    return reg;
  });
}

const hex = (values: readonly number[]) => values.map((v) => `0x${v.toString(16).padStart(2, "0")}`).join(", ");

const compare = (page: Page) => ({
  field: (name: "yourCrc" | "yourLog") => page.locator(`.compare label[data-field="${name}"] :is(input, textarea)`),
  badge: (kind: "base" | "element" | "order") => page.locator(`.compare label[data-field="yourCrc"] [data-badge="${kind}"]`),
  error: (name: "yourCrc" | "yourLog") => page.locator(`.compare label[data-field="${name}"] .error`),
  result: () => page.locator(".compare .compare-result"),
  firstDiff: () => page.locator(".compare-log tr.first-diff"),
});

test.describe("Comparing your own values on the Visualizer", () => {
  test("your crc that matches is marked ✓, also as its bytes low byte first; one that differs shows both in binary", async ({
    page,
  }) => {
    const v = await given("CRC-16/ARC over 123456789, whose CRC is 0xBB3D", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/ARC");
      return v;
    });
    const c = compare(page);
    await when("pasting 0xBB3D into your crc", () => c.field("yourCrc").fill("0xBB3D"));
    await then("it is marked as matching", () => expect(c.result()).toHaveAttribute("data-result", "ok"));
    await when("pasting the bytes 3D BB and pressing the order badge to LE", async () => {
      await c.field("yourCrc").fill("3D BB");
      await c.badge("order").click();
    });
    await then("they match as well", async () => {
      await expect(c.badge("order")).toHaveText("LE");
      await expect(c.result()).toHaveAttribute("data-result", "ok");
    });
    await when("pasting 0xBB3C", () => c.field("yourCrc").fill("0xBB3C"));
    await then("both are shown in binary, with the one differing bit marked in each", async () => {
      await expect(c.result()).toHaveAttribute("data-result", "ng");
      await expect(c.result().locator(".compare-bits .diff")).toHaveCount(2);
    });
    await when("choosing CRC-16/MODBUS", () => v.settings.preset().selectOption("CRC-16/MODBUS"));
    await then("what was pasted stays and is compared with the new settings", async () => {
      await expect(c.field("yourCrc")).toHaveValue("0xBB3C");
      await expect(c.result()).toHaveAttribute("data-result", "ng");
    });
  });

  test("your log that differs from byte 3 on marks byte 3 and moves playback to the end of that byte", async ({ page }) => {
    const v = await given("CRC-8/SMBUS over 123456789, at the first step", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-8/SMBUS");
      await expect(v.counter).toHaveText(/^1 \//);
      return v;
    });
    const c = compare(page);
    await when("pasting the register after each byte with the 4th one off by one bit", () =>
      c.field("yourLog").fill(hex(smbusAfterEachByte().map((r, i) => (i === 3 ? r ^ 1 : r)))),
    );
    await then("byte 3 is the first row that differs, and playback has moved off the first step", async () => {
      await expect(c.firstDiff().locator("th")).toHaveText("バイト 3");
      await expect(page.locator(".compare-log tbody tr")).toHaveCount(9);
      await expect(v.counter).not.toHaveText(/^1 \//);
    });
  });

  test("your log that differs switches Progress to Per byte, whose row of that byte stays marked through Steps and back", async ({
    page,
  }) => {
    await given("CRC-8/SMBUS over 123456789, Progress in Steps", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-8/SMBUS");
      await expect(page.locator('.log-views [data-view="steps"]')).toHaveAttribute("aria-pressed", "true");
    });
    const c = compare(page);
    const marked = page.locator(".byte-log tbody tr.first-diff");
    await when("pasting the register after each byte with the 4th one off by one bit", () =>
      c.field("yourLog").fill(hex(smbusAfterEachByte().map((r, i) => (i === 3 ? r ^ 1 : r)))),
    );
    await then("Progress is in Per byte, and only the row of byte 3 is marked", async () => {
      await expect(page.locator('.log-views [data-view="perByte"]')).toHaveAttribute("aria-pressed", "true");
      await expect(marked).toHaveCount(1);
      await expect(marked.locator("th")).toHaveText("3");
    });
    await when("switching to Steps and back to Per byte", async () => {
      await page.locator('.log-views [data-view="steps"]').click();
      await expect(page.locator(".log-list")).toBeVisible();
      await page.locator('.log-views [data-view="perByte"]').click();
    });
    await then("the row of byte 3 is still marked", () => expect(marked.locator("th")).toHaveText("3"));
  });

  test("your log whose init differs leaves Progress in Steps", async ({ page }) => {
    await given("CRC-8/SMBUS over 123456789, Progress in Steps", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-8/SMBUS");
    });
    const c = compare(page);
    await when("pasting init 0xFF and then the register after each byte", () =>
      c.field("yourLog").fill(hex([0xff, ...smbusAfterEachByte()])),
    );
    await then("init is the first row that differs, and Progress is still in Steps", async () => {
      await expect(c.firstDiff().locator("th")).toHaveText("init");
      await expect(page.locator('.log-views [data-view="steps"]')).toHaveAttribute("aria-pressed", "true");
    });
  });

  test("your log of a count that fits neither the bytes nor the bits is an error", async ({ page }) => {
    await given("CRC-8/SMBUS over 123456789", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-8/SMBUS");
    });
    const c = compare(page);
    await when("pasting two numbers", () => c.field("yourLog").fill("0x01 0x02"));
    await then("the error gives the counts per byte and per bit", () => expect(c.error("yourLog")).toContainText("9 個か 10 個"));
  });
});
