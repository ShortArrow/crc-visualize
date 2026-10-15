import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Pseudocode", () => {
  test("on an xor step the crc ^= poly line is the current line", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the xor step", () => v.goTo("xor"));
    await then("the current line is crc ^= poly", async () => {
      await expect(v.code.activeLine()).toContainText("crc ^= poly");
    });
  });

  test("on a clock with feedback 0, the if is noted false and its body is struck through", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the shift step of the 2nd clock (feedback 0)", () => v.goTo("shift", 2));
    await then("if (feedback == 1) is marked false and crc ^= poly is struck through", async () => {
      await expect(v.code.line("if (feedback == 1)")).toContainText("// false");
      await expect(v.code.skippedLine()).toContainText("crc ^= poly");
    });
  });

  test("lines of disabled parameters are shown dimmed, with the value and the reason", async ({ page }) => {
    const v = await given("the page is open with the default settings, where refout is false", () => Visualizer.open(page));
    await then("the refout line is dimmed, with the reason and the value", async () => {
      const line = v.code.disabledLineOf("refout");
      await expect(line).toContainText("refout が false なので実行しない");
      await expect(line.locator('.chip[data-param="refout"]')).toContainText("false");
    });
  });
});

test.describe("Log", () => {
  test("the log lists newest first, only the latest entry is large, and stepping back rewinds it", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the xor step", () => v.goTo("xor"));
    await then("the 4 entries from the start up to xor are listed newest first", async () => {
      const entries = v.log.entries();
      await expect(entries).toHaveCount(4);
      await expect(entries.nth(0)).toHaveClass(/\blatest\b/);
      await expect(entries.nth(0)).toContainText("多項式と XOR");
      await expect(entries.nth(0)).toContainText("0b011");
      await expect(entries.nth(1)).toContainText("シフト");
      await expect(entries.nth(3)).toContainText("初期化");
    });
    await then("only the latest entry is large, and older entries are not faded", async () => {
      await expect.poll(async () => (await v.log.titleSize(1)) - (await v.log.titleSize(3))).toBe(0);
      expect(await v.log.titleSize(0)).toBeGreaterThan(await v.log.titleSize(1));
      const opacity = (i: number) =>
        v.log
          .entries()
          .nth(i)
          .evaluate((el) => getComputedStyle(el).opacity);
      expect(await opacity(1)).toBe("1");
      expect(await opacity(3)).toBe("1");
      expect(await page.locator(".log").evaluate((el) => getComputedStyle(el).maskImage)).toBe("none");
    });
    await when("stepping back once", () => v.stepBack());
    await then("the latest entry is shift", async () => {
      await expect(v.log.entries()).toHaveCount(3);
      await expect(v.log.entries().nth(0)).toContainText("シフト");
    });
  });

  test("on a step forward the previously latest entry shrinks as it moves down, and stepping back reverses it", async ({
    page,
  }) => {
    const v = await given("the visualizer has advanced to the xor step", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("xor");
      return v;
    });
    const forward = await when("right after stepping forward once", () => v.log.motionAfter("ArrowRight"));
    await then("the 2nd entry, previously the latest, shrinks, and the 2nd and later entries slide down", async () => {
      expect(forward[1]).toEqual({ moving: true, resizing: true });
      expect(forward.slice(2).every((e) => e.moving)).toBe(true);
    });
    const back = await when("right after stepping back once", () => v.log.motionAfter("ArrowLeft"));
    await then("the first entry, now the latest, grows, and the rest slide up", async () => {
      expect(back[0]).toEqual({ moving: true, resizing: true });
      expect(back.slice(1).every((e) => e.moving)).toBe(true);
    });
  });

  test("the software pane keeps a constant height regardless of the number of log entries", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    const height = () => page.locator(".software").evaluate((el) => el.getBoundingClientRect().height);
    const first = await height();
    await when("advancing to the xor step", () => v.goTo("xor"));
    await then("the height is unchanged", async () => expect(await height()).toBe(first));
    await when("advancing to the end", () => v.goToEnd());
    await then("the height is unchanged", async () => expect(await height()).toBe(first));
  });
});
