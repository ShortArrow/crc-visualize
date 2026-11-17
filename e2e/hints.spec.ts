import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";
import { CheckPage } from "./support/checkPage";
import { NarrowPage } from "./support/narrowPage";
import { TablePage } from "./support/tablePage";

const ARC = "?width=16&poly=0x8005&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";
const USB5 = "?width=5&poly=0x5&init=0x1f&refin=1&refout=1&xorout=0x1f&inputMode=text&input=123456789";
const SMBUS = "?width=8&poly=0x07&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=text&input=123456789";
const CRC32 = "?width=32&poly=0x04C11DB7&init=0xFFFFFFFF&refin=1&refout=1&xorout=0xFFFFFFFF&inputMode=text&input=123456789";
const XMODEM = "?width=16&poly=0x1021&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=text&input=123456789";

/** The check of CRC-16/ARC, of CRC-32 and of CRC-5/USB, from the catalogue of Greg Cook. */
const [ARC_CHECK, CRC32_CHECK, USB5_CHECK] = [0xbb3d, 0xcbf43926, 0x19];

const swap16 = (v: number) => ((v & 0xff) << 8) | (v >> 8);
const hex = (v: number) => `0x${v.toString(16).toUpperCase()}`;
const reflect = (v: number, width: number) => parseInt(v.toString(2).padStart(width, "0").split("").reverse().join(""), 2);

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

/** Table T of poly 0x1021 for a left shift, by a bit-at-a-time loop written apart from the app. */
function xmodemTable(): number[] {
  return Array.from({ length: 256 }, (_, i) => {
    let crc = i << 8;
    for (let k = 0; k < 8; k++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
    return crc;
  });
}

const hints = (page: Page, scope: string) => page.locator(`${scope} .compare-hints li`);

test.describe("Hints under a pasted value that differs", () => {
  test("on the Visualizer, your crc with its bytes swapped or XORed with all ones gets the hint that would make it match", async ({
    page,
  }) => {
    await given("CRC-16/ARC over 123456789", () => Visualizer.open(page, ARC));
    const field = page.locator('.compare label[data-field="yourCrc"] input');
    await when("pasting its CRC with the two bytes swapped", () => field.fill(hex(swap16(ARC_CHECK))));
    await then("the first hint says it would match with the bytes in the other order", async () => {
      await expect(hints(page, ".compare").first()).toHaveAttribute("data-hint", "order");
      await expect(hints(page, ".compare").first()).toHaveText("バイトを逆の並びで読めば一致");
    });
    await when("pasting its CRC XORed with all ones", () => field.fill(hex(ARC_CHECK ^ 0xffff)));
    await then(
      "the first hint is the XOR with all ones, and CRC-16/MAXIM-DOW, which differs only in xorout, is named after it",
      async () => {
        await expect(hints(page, ".compare").first()).toHaveAttribute("data-hint", "ones");
        await expect(page.locator('.compare .compare-hints li[data-hint="preset"]')).toContainText("CRC-16/MAXIM-DOW");
      },
    );
  });

  test("on the Visualizer, a width below 8 gets no hint, only the differing bits", async ({ page }) => {
    await given("CRC-5/USB over 123456789", () => Visualizer.open(page, USB5));
    await when("pasting its CRC reflected in 5 bits", () =>
      page.locator('.compare label[data-field="yourCrc"] input').fill(hex(reflect(USB5_CHECK, 5))),
    );
    await then("it differs, and no hint is listed", async () => {
      await expect(page.locator(".compare .compare-result")).toHaveAttribute("data-result", "ng");
      await expect(hints(page, ".compare")).toHaveCount(0);
    });
  });

  test("on the Visualizer, the first row of your log that differs gets its hints under the note", async ({ page }) => {
    await given("CRC-8/SMBUS over 123456789", () => Visualizer.open(page, SMBUS));
    const log = smbusAfterEachByte().map((r, i) => (i === 3 ? r ^ 0xff : r));
    await when("pasting the register after each byte with the 4th one XORed with all ones", () =>
      page.locator('.compare label[data-field="yourLog"] textarea').fill(log.map(hex).join(", ")),
    );
    await then("the hints of that row include the XOR with all ones", () =>
      expect(page.locator('.compare .compare-hints li[data-hint="ones"]')).toHaveCount(1),
    );
  });

  test("on the Check page, your check that skipped the final XOR gets the xorout hint", async ({ page }) => {
    await given("the Check page with CRC-32", () => CheckPage.open(page, CRC32));
    await when("pasting the check XORed with xorout", () =>
      page.locator('.compare-card label[data-field="yourCheck"] input').fill(hex((CRC32_CHECK ^ 0xffffffff) >>> 0)),
    );
    await then("the hint is the XOR with xorout", () =>
      expect(hints(page, ".compare-card").first()).toHaveAttribute("data-hint", "xorout"),
    );
  });

  test("on the Table page, the first entry that differs gets the byte-order hint", async ({ page }) => {
    await given("the Table page with poly 0x1021 and no reflection", () => TablePage.open(page, XMODEM));
    const table = xmodemTable().map((v, i) => (i === 5 ? swap16(v) : v));
    await when("pasting table T with entry 5 in the other byte order", () =>
      page.locator('.compare-card label[data-field="yourTable"] textarea').fill(table.map(hex).join(", ")),
    );
    await then("the hint is the byte order", () =>
      expect(hints(page, ".compare-card .table-result")).toHaveAttribute("data-hint", "order"),
    );
  });

  test("on the Narrow down page, a check no preset has lists the presets each hint would match", async ({ page }) => {
    await given("the Narrow down page", () => NarrowPage.open(page));
    await when("pasting the check of CRC-16/ARC with its bytes swapped, with width 16", async () => {
      await page.locator('.compare-card label[data-field="width"] input').fill("16");
      await page.locator('.compare-card label[data-field="your check"] input').fill(hex(swap16(ARC_CHECK)));
    });
    await then("✗, followed by the byte-order hint with CRC-16/ARC", async () => {
      await expect(page.locator(".compare-card .compare-result")).toHaveAttribute("data-result", "ng");
      await expect(page.locator('.compare-card .compare-hint[data-hint="order"]')).toContainText("CRC-16/ARC");
    });
  });
});

/** The CRC of CRC-16/XMODEM over text, by a bit-at-a-time loop written apart from the app. */
function xmodem(text: string): number {
  let crc = 0;
  for (const c of text) {
    crc ^= c.charCodeAt(0) << 8;
    for (let k = 0; k < 8; k++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return crc;
}

/** The check of CRC-16/MODBUS, from the catalogue of Greg Cook. */
const MODBUS_CHECK = 0x4b37;

test.describe("The range, row and preset hints", () => {
  test("on the Visualizer, your crc of the text without its last 2 bytes would match with the range ending 2 bytes earlier", async ({
    page,
  }) => {
    await given("CRC-16/XMODEM over 123456789", () => Visualizer.open(page, XMODEM));
    await when("pasting the CRC of 1234567", () =>
      page.locator('.compare label[data-field="yourCrc"] input').fill(hex(xmodem("1234567"))),
    );
    await then("the hint says the range would end 2 bytes earlier", async () => {
      const range = page.locator('.compare .compare-hints li[data-hint="range"]');
      await expect(range).toHaveAttribute("data-by", "-2");
      await expect(range).toHaveText("CRC の範囲が 2 バイト前で終われば一致");
    });
  });

  test("on the Visualizer, your crc of a frame's range taking in one more byte would match with the range ending 1 byte later", async ({
    page,
  }) => {
    await given("CRC-16/XMODEM over a frame of 11 bytes whose range is bytes 0 to 6", () =>
      Visualizer.open(
        page,
        "?width=16&poly=0x1021&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=hex&input=313233343536373839AABB&to=6&crcField=none",
      ),
    );
    await when("pasting the CRC of 12345678", () =>
      page.locator('.compare label[data-field="yourCrc"] input').fill(hex(xmodem("12345678"))),
    );
    await then("the hint says the range would end 1 byte later", () =>
      expect(page.locator('.compare .compare-hints li[data-hint="range"]')).toHaveAttribute("data-by", "1"),
    );
  });

  test("on the Visualizer, a row of your log that is the register of the row before gets the row-before hint", async ({
    page,
  }) => {
    await given("CRC-8/SMBUS over 123456789", () => Visualizer.open(page, SMBUS));
    const registers = smbusAfterEachByte();
    await when("pasting the register after each byte with the 4th one repeating the 3rd", () =>
      page
        .locator('.compare label[data-field="yourLog"] textarea')
        .fill(registers.map((r, i) => hex(i === 3 ? registers[2]! : r)).join(", ")),
    );
    await then("the hints of that row include the row before", () =>
      expect(page.locator('.compare .compare-hints li[data-hint="row"][data-side="before"]')).toHaveCount(1),
    );
  });

  test("on the Visualizer and the Check page, the CRC another preset gives names that preset", async ({ page }) => {
    await given("CRC-16/ARC over 123456789", () => Visualizer.open(page, ARC));
    await when("pasting the check of CRC-16/MODBUS into your crc", () =>
      page.locator('.compare label[data-field="yourCrc"] input').fill(hex(MODBUS_CHECK)),
    );
    await then("the preset hint names CRC-16/MODBUS", () =>
      expect(page.locator('.compare .compare-hints li[data-hint="preset"]')).toContainText("CRC-16/MODBUS"),
    );
    await when("pasting it into your check on the Check page", async () => {
      await CheckPage.open(page, ARC);
      await page.locator('.compare-card label[data-field="yourCheck"] input').fill(hex(MODBUS_CHECK));
    });
    await then("the preset hint names CRC-16/MODBUS there too", () =>
      expect(page.locator('.compare-card .compare-hints li[data-hint="preset"]')).toContainText("CRC-16/MODBUS"),
    );
  });
});
