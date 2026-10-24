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

  test("an input that is not whole bytes shows the table but not the byte-at-a-time steps", async ({ page }) => {
    const t = await given("CRC-3/TUTORIAL with a 5-bit input is open", () => TablePage.open(page));
    await then("the reason is shown instead of the steps, and the table is still there", async () => {
      await expect(t.notBytes()).toBeVisible();
      await expect(t.step()).toHaveCount(0);
      await expect(t.cell()).toHaveCount(256);
    });
  });
});
