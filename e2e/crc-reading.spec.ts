import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

const crc = (page: Page) => ({
  field: () => page.locator('.compare label[data-field="yourCrc"] input'),
  badge: (kind: "element" | "order") => page.locator(`.compare label[data-field="yourCrc"] [data-badge="${kind}"]`),
  reading: () => page.locator('.compare label[data-field="yourCrc"] .crc-reading'),
  error: () => page.locator('.compare label[data-field="yourCrc"] .error'),
});

/** Opens the Visualizer with preset and presses the element badge times times (8 → 16 BE → 16 LE → 32 BE → 32 LE). */
async function open(page: Page, preset: string, times = 0) {
  const v = await Visualizer.open(page);
  await v.settings.preset().selectOption(preset);
  for (let i = 0; i < times; i++) await crc(page).badge("element").click();
  return crc(page);
}

test.describe("The line under your crc that says how it was read", () => {
  test("one number is the CRC itself, and neither badge is used", async ({ page }) => {
    const c = await given("CRC-16/ARC, with the order badge at LE", async () => {
      const c = await open(page, "CRC-16/ARC");
      await c.badge("order").click();
      return c;
    });
    await when("pasting 0xBB3D", () => c.field().fill("0xBB3D"));
    await then("the line says it was read as one number, without the badges", () =>
      expect(c.reading()).toHaveText("数 1 つをそのまま CRC として読んだ（要素とバイト順は使っていない）"),
    );
  });

  test("several 8-bit numbers are read as bytes in the order badge's order", async ({ page }) => {
    const c = await given("CRC-16/ARC, with the order badge at LE", async () => {
      const c = await open(page, "CRC-16/ARC");
      await c.badge("order").click();
      return c;
    });
    await when("pasting 3D BB", () => c.field().fill("3D BB"));
    await then("the line gives the bytes and the order they were read in", () =>
      expect(c.reading()).toHaveText("8 ビットの数 2 つを並べて 3D BB → 下位バイトから CRC として読んで 0xBB3D"),
    );
  });

  for (const [times, element, order, bytes, value] of [
    [1, "上位", "上位", "12 34 56 78", "0x12345678"],
    [2, "下位", "上位", "34 12 78 56", "0x34127856"],
    [1, "上位", "下位", "12 34 56 78", "0x78563412"],
    [2, "下位", "下位", "34 12 78 56", "0x56781234"],
  ] as const) {
    const first = (side: string) => (side === "下位" ? "low" : "high");
    test(`16-bit numbers each ${first(element)} byte first, read ${first(order)} byte first, give ${value}`, async ({ page }) => {
      const c = await given("CRC-32/ISO-HDLC with 16-bit elements", async () => {
        const c = await open(page, "CRC-32/ISO-HDLC", times);
        if (order === "下位") await c.badge("order").click();
        return c;
      });
      await when("pasting 0x1234 0x5678", () => c.field().fill("0x1234 0x5678"));
      await then("the line gives each element's byte order, the bytes, the CRC's byte order and the value", () =>
        expect(c.reading()).toHaveText(
          `16 ビットの数 2 つを、それぞれ${element}バイトから並べて ${bytes} → ${order}バイトから CRC として読んで ${value}`,
        ),
      );
    });
  }

  test("what does not read gives its error and no line", async ({ page }) => {
    const c = await given("CRC-16/ARC with 16-bit elements", () => open(page, "CRC-16/ARC", 1));
    await when("pasting two 16-bit numbers, 4 bytes for a 2-byte CRC", () => c.field().fill("0x1234 0x5678"));
    await then("it is an error, and there is no line", async () => {
      await expect(c.error()).toBeVisible();
      await expect(c.reading()).toHaveCount(0);
    });
  });
});
