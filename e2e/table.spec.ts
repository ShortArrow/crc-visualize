import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { TablePage } from "./support/tablePage";
import { Visualizer } from "./support/visualizer";

test.describe("Table", () => {
  test("computes a byte at a time with table T, matching the bit-at-a-time CRC, and shows how each value is made", async ({
    page,
  }) => {
    const v = await given("CRC-16/KERMIT is selected", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await when("switching to the table page in the activity bar", () => v.workbench.pageLink("table").click());
    const t = await then("a right-shift table of 256 values computes 9 bytes to 0x2189, the same as bit at a time", async () => {
      const t = await TablePage.shown(page);
      await expect(t.direction()).toHaveAttribute("data-direction", "right");
      await expect(t.formula()).toContainText("crc >> 8");
      await expect(t.cell()).toHaveCount(256);
      await expect(t.step()).toHaveCount(9);
      await expect(t.result()).toHaveText("0x2189");
      await expect(t.bitwise()).toHaveText("0x2189");
      return t;
    });
    await then("the first step is selected, its index is highlighted and the value it reads is made by 8 clocks", async () => {
      await expect(t.step(0)).toHaveClass(/selected/);
      await expect(t.usedCell()).toHaveCount(1);
      await expect(t.clocks()).toHaveCount(8);
    });
    await when("selecting the second step", () => t.step(1).click());
    await then("the highlighted index follows it", async () => {
      await expect(t.step(1)).toHaveClass(/selected/);
      await expect(t.usedCell()).toHaveAttribute("data-index", (await t.step(1).getAttribute("data-index"))!);
    });
    await when("selecting the cell for index 1", () => t.cell(1).click());
    await then("how T[0x01] = 0x1189 is made is shown", async () => {
      await expect(t.entryTitle()).toContainText("T[0x01] = 0x1189");
      await expect(t.clocks().last()).toContainText("0001000110001001");
    });
  });

  test("the note names the sidebar's current settings, where the input is shown as it was entered", async ({ page }) => {
    const t = await given("the table page is open with the text input 123456789", () =>
      TablePage.open(page, "?width=16&poly=0x1021&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789"),
    );
    await then("the note points to the current settings in the sidebar, which show the input as text 123456789", async () => {
      await expect(t.note()).toContainText("サイドバーの「今の設定」");
      await expect(t.currentSetting("inputMode")).toHaveText("text");
      await expect(t.currentSetting("input")).toHaveText("123456789");
    });
  });

  test("each clock that makes a table value shows its feedback bit, the shifted register and what is XORed in", async ({
    page,
  }) => {
    const t = await given("width 7 and poly 0x9 are open on the table page", () =>
      TablePage.open(page, "?width=7&poly=0x9&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=text&input=123456789"),
    );
    await when("selecting the cell for index 0x41", () => t.cell(0x41).click());
    await then("the 2nd clock feeds 1, so poly is XORed in, and the 3rd feeds 0 with the top bit 0, so nothing is", async () => {
      await expect(t.entryTitle()).toContainText("T[0x41] = 0x6D");
      await expect(t.clockHeadings()).toHaveText(["クロック", "入るビット", "帰還", "シフト後", "XOR する値", "レジスタ"]);
      await expect(t.clocks().nth(1).locator("td")).toHaveText(["2", "1", "1", "0000000", "0001001", "0001001"]);
      await expect(t.clocks().nth(2).locator("td")).toHaveText(["3", "0", "0", "0010010", "なし", "0010010"]);
      await expect(t.clocks().last().locator("td").last()).toHaveText("1101101");
    });
  });

  test("an input that is not whole bytes shows the table but not the byte-at-a-time steps", async ({ page }) => {
    const t = await given("CRC-3/TUTORIAL with a 5-bit input is open", () => TablePage.open(page));
    await then("the reason is shown instead of the steps, and the table is still there", async () => {
      await expect(t.notBytes()).toBeVisible();
      await expect(t.step()).toHaveCount(0);
      await expect(t.cell()).toHaveCount(256);
    });
  });
});

test.describe("Table playback", () => {
  /** CRC-16/XMODEM fed 2 bytes, "12": 270 steps make the table, 6 use it, then xorOut and done. */
  const TWO_BYTES = "?width=16&poly=0x1021&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=text&input=12&speed=steady&rate=8";

  test("the page opens at the last step, and going to the first leaves only T[0] in the table", async ({ page }) => {
    const t = await given("2 bytes are open on the table page", () => TablePage.open(page, TWO_BYTES));
    await then("it is at the last of 278 steps, with every value and both bytes shown", async () => {
      await expect(t.counter).toHaveText("278 / 278");
      await expect(t.filledCells()).toHaveCount(256);
      await expect(t.step()).toHaveCount(2);
      await expect(t.result()).toHaveText("0x20B5");
    });
    await when("going to the first step", () => page.keyboard.press("Home"));
    await then("only T[0] holds a value, and no byte is computed yet", async () => {
      await expect(t.filledCells()).toHaveCount(1);
      await expect(t.cell(0)).toHaveText("0000");
      await expect(t.step()).toHaveCount(0);
    });
  });

  test("T[1] is made clock by clock, and enters its cell at the 8th clock", async ({ page }) => {
    const t = await given("2 bytes are open at the first step", async () => {
      const t = await TablePage.open(page, TWO_BYTES);
      await page.keyboard.press("Home");
      return t;
    });
    await when("stepping forward 3 times", async () => {
      for (let k = 0; k < 3; k++) await page.keyboard.press("ArrowRight");
    });
    await then("3 clocks of T[0x01] are shown, and its cell is still empty", async () => {
      await expect(t.entryTitle()).toContainText("T[0x01]");
      await expect(t.clocks()).toHaveCount(3);
      await expect(t.cell(1)).toHaveText("");
    });
    await when("stepping forward 5 more times", async () => {
      for (let k = 0; k < 5; k++) await page.keyboard.press("ArrowRight");
    });
    await then("all 8 clocks are shown, and T[0x01] = 0x1021 is in its cell", async () => {
      await expect(t.clocks()).toHaveCount(8);
      await expect(t.cell(1)).toHaveText("1021");
    });
  });

  test("each byte is its index, then the look-up, then the update", async ({ page }) => {
    const t = await given("2 bytes are open at the first step of using the table", async () => {
      const t = await TablePage.open(page, TWO_BYTES);
      await page.locator(".controls .seek").fill("270");
      return t;
    });
    await then(
      "byte 0's row shows its index, with its row and column headings emphasized, and nothing looked up yet",
      async () => {
        await expect(t.step()).toHaveCount(1);
        await expect(t.step(0).locator("td").nth(2)).toHaveText("0x31");
        await expect(t.step(0).locator("td").nth(3)).toHaveText("");
        await expect(t.emphasizedHeadings()).toHaveText(["1", "3"]);
      },
    );
    await when("stepping forward", () => page.keyboard.press("ArrowRight"));
    await then("the cell at the index is highlighted and its value fills the row", async () => {
      await expect(t.usedCell()).toHaveAttribute("data-index", "49");
      await expect(t.step(0).locator("td").nth(3)).toHaveText("0x2672");
      await expect(t.step(0).locator("td").nth(4)).toHaveText("");
    });
    await when("stepping forward", () => page.keyboard.press("ArrowRight"));
    await then("crc after is filled in", () => expect(t.step(0).locator("td").nth(4)).toHaveText("0x2672"));
  });

  test("while paused, choosing a row moves to the look-up of that byte, and playing from the end starts again", async ({
    page,
  }) => {
    const t = await given("2 bytes are open on the table page", () => TablePage.open(page, TWO_BYTES));
    await when("choosing the second row", () => t.step(1).click());
    await then("it is at the look-up of byte 1", async () => {
      await expect(t.counter).toHaveText("275 / 278");
      await expect(t.step(1)).toHaveClass(/selected/);
    });
    await when("going to the end and playing", async () => {
      await page.keyboard.press("End");
      await page.keyboard.press(" ");
    });
    await then("playback starts again from the making of the table", () => expect(t.counter).not.toHaveText(/^27\d \//));
  });
});

test.describe("Table playback on a phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("the dock holds only the step buttons, on one row with the result, and the other controls stay above the cards", async ({
    page,
  }) => {
    const t = await given("the table page is open on an iPhone SE", () =>
      TablePage.open(page, "?width=16&poly=0x1021&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=text&input=12"),
    );
    await then("the dock has step back, play and step forward beside the result", async () => {
      const dock = page.locator(".dock");
      await expect(dock.locator("button")).toHaveCount(3);
      const [buttons, result] = [dock.locator(".controls"), dock.locator("[data-dock-result]")];
      const [b, r] = [(await buttons.boundingBox())!, (await result.boundingBox())!];
      expect(Math.abs(b.y + b.height / 2 - (r.y + r.height / 2))).toBeLessThan(4);
    });
    await then("the seek bar and the counter are at the top of the page", async () => {
      await expect(t.root.locator(".controls .seek")).toBeVisible();
      await expect(t.counter).toHaveText("278 / 278");
    });
  });
});
