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
  test("the log groups the steps of each input bit into a block, newest block first, with its rows in the order they happened", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the xor step", () => v.goTo("xor"));
    await then("the block of input bit 1 is current and above init, with before, shift, poly and xor in that order", async () => {
      await expect(v.log.blocks()).toHaveCount(2);
      await expect(v.log.blocks().nth(0)).toHaveClass(/\bcurrent\b/);
      await expect(v.log.blocks().nth(0)).toContainText("入力ビット 1");
      await expect(v.log.blocks().nth(0)).toContainText(/msb\s*0\s*⊕\s*bit\s*1\s*=\s*feedback\s*1/);
      expect(await v.log.rowLabels(0)).toEqual(["before", "shift", "poly", "xor"]);
      await expect(v.log.blocks().nth(1)).toContainText("初期化");
    });
    await then("the xor row is the current row, and its bits that the XOR changed are marked", async () => {
      await expect(v.log.current().locator('.log-row.now[data-row="xor"]')).toHaveCount(1);
      await expect(v.log.current().locator('.log-row[data-row="xor"] .flip')).toHaveCount(2);
      await expect(v.log.current().locator('.log-row[data-row="shift"] :is(.drop, .enter)')).toHaveCount(2);
    });
    await then("the binary values of the block line up on their right edges", async () => {
      const edges = await v.log.bitsRightEdges(0);
      expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(0.5);
    });
    await when("stepping back once", () => v.stepBack());
    await then("the current block holds only before and shift", async () => {
      expect(await v.log.rowLabels(0)).toEqual(["before", "shift"]);
    });
  });

  test("only the current block is large, and older blocks share one size and are not faded", async ({ page }) => {
    const v = await given("the visualizer has advanced to the second xor, with five blocks", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("xor", 2);
      return v;
    });
    await then("the current block is larger than the others, which are all the same size", async () => {
      await expect.poll(async () => (await v.log.bitsSize(1)) - (await v.log.bitsSize(3))).toBe(0);
      expect(await v.log.bitsSize(0)).toBeGreaterThan(await v.log.bitsSize(1));
    });
    await then("older blocks are not faded", async () => {
      const opacity = (i: number) =>
        v.log
          .blocks()
          .nth(i)
          .evaluate((el) => getComputedStyle(el).opacity);
      expect(await opacity(1)).toBe("1");
      expect(await opacity(3)).toBe("1");
      expect(await page.locator(".log").evaluate((el) => getComputedStyle(el).maskImage)).toBe("none");
    });
  });

  test("a step that adds a row to the current block fades the row in while the blocks below slide down", async ({ page }) => {
    const v = await given("the visualizer is at the first feedback step", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("feedback");
      return v;
    });
    const motion = await when("right after stepping forward once", () => v.log.motionAfter("ArrowRight"));
    await then("the shift row fades in and the init block slides down", async () => {
      expect(motion[0]!.fading).toEqual(["shift"]);
      expect(motion[1]!.moving).toBe(true);
    });
  });

  test("on a step that starts a new block the previously current block shrinks as it moves down, and stepping back reverses it", async ({
    page,
  }) => {
    const v = await given("the visualizer has advanced to the xor step", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("xor");
      return v;
    });
    const forward = await when("right after stepping forward once", () => v.log.motionAfter("ArrowRight"));
    await then("the 2nd block, previously current, shrinks, and the 2nd and later blocks slide down", async () => {
      expect(forward[1]).toMatchObject({ moving: true, resizing: true });
      expect(forward.slice(2).every((b) => b.moving)).toBe(true);
    });
    const back = await when("right after stepping back once", () => v.log.motionAfter("ArrowLeft"));
    await then("the first block, current again, grows, and the rest slide up", async () => {
      expect(back[0]).toMatchObject({ moving: true, resizing: true });
      expect(back.slice(1).every((b) => b.moving)).toBe(true);
    });
  });

  test("on a step that starts a new block, the block slides in from above together with the block below it, so the two never overlap", async ({
    page,
  }) => {
    const v = await given("the visualizer has advanced to the xor step", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("xor");
      return v;
    });
    const frames = await when("stepping forward once and watching every frame of the motion", () =>
      v.log.framesAfter("ArrowRight"),
    );
    await then(
      "in every frame the new block stays above the one below, is fully opaque, and nothing above the list is shown",
      async () => {
        expect(frames.length).toBeGreaterThan(3);
        for (const f of frames) {
          expect(f.space).toBeGreaterThanOrEqual(0);
          expect(f.opacity).toBe(1);
          expect(f.clipped).toBe(true);
        }
      },
    );
  });

  test("the oldest and newest buttons scroll the log to its ends without changing the step", async ({ page }) => {
    const v = await given("the visualizer has advanced to the end, with more lines than the log shows at once", async () => {
      const v = await Visualizer.open(page);
      await v.goToEnd();
      return v;
    });
    const at = await v.counter.textContent();
    await when("pressing the oldest button", () => v.log.jump("oldest").click());
    await then("the log is scrolled to its bottom and the step is unchanged", async () => {
      await expect.poll(() => v.log.scrolled()).toBe("bottom");
      await expect(v.counter).toHaveText(at!);
    });
    await when("pressing the newest button", () => v.log.jump("newest").click());
    await then("the log is scrolled to its top and the step is unchanged", async () => {
      await expect.poll(() => v.log.scrolled()).toBe("top");
      await expect(v.counter).toHaveText(at!);
    });
  });

  test("the log reaches the bottom of its pane, whatever the number of entries", async ({ page }) => {
    const v = await given("the page is open with the default settings on a tall PC screen", async () => {
      await page.setViewportSize({ width: 1366, height: 1200 });
      return Visualizer.open(page);
    });
    await then("the log reaches the bottom of its pane", async () => expect(Math.abs(await v.log.gapBelow())).toBeLessThan(1));
    await when("advancing to the end", () => v.goToEnd());
    await then("the log still reaches the bottom of its pane", async () =>
      expect(Math.abs(await v.log.gapBelow())).toBeLessThan(1),
    );
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
