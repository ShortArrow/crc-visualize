import { expect } from "@playwright/test";
import { CyclicPage } from "./support/cyclicPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Cyclic", () => {
  test("rotating the codeword keeps the remainder 0, advances x^k on the state ring by as much, and returns after n rotations", async ({
    page,
  }) => {
    const v = await given("the visualizer page is open", () => Visualizer.open(page));
    await when("switching to the cyclic page in the activity bar", () => v.workbench.pageLink("cyclic").click());
    const c = await then("a 7-bit codeword of x³ + x + 1 and a ring of 7 states appear", async () => {
      const c = await CyclicPage.shown(page);
      expect(c.hash()).toBe("#cyclic");
      await expect(c.wordBits()).toHaveCount(7);
      await expect(c.states()).toHaveCount(7);
      await expect(c.word()).toHaveText("1101001");
      await expect(c.remainder()).toHaveText("000");
      await expect(c.currentState()).toHaveAttribute("data-power", "0");
      await expect(v.workbench.statusbar()).toContainText("x³ + x + 1");
      await expect(v.workbench.statusbar()).toContainText("n = 7");
      return c;
    });
    await when("rotating once", () => c.forward().click());
    await then(
      "each bit's degree rises by 1 and the top one wraps to x^0, but the remainder stays 0; the state is x^1 = 010",
      async () => {
        await expect(c.word()).toHaveText("1010011");
        await expect(c.remainder()).toHaveText("000");
        await expect(c.currentState()).toHaveAttribute("data-power", "1");
        await expect(c.currentState()).toContainText("010");
      },
    );
    await when("rotating 6 more times", async () => {
      for (let i = 0; i < 6; i++) await c.forward().click();
    });
    await then("after 7 rotations it is back to the original codeword and x^0", async () => {
      await expect(c.word()).toHaveText("1101001");
      await expect(c.currentState()).toHaveAttribute("data-power", "0");
    });
    await when("rotating back once", () => c.back().click());
    await then("the state is x^6", async () => {
      await expect(c.word()).toHaveText("1110100");
      await expect(c.currentState()).toHaveAttribute("data-power", "6");
    });
  });

  test("changing the generator polynomial gives a ring as long as its period and resets the rotation count to 0", async ({
    page,
  }) => {
    const c = await given("rotated twice with the default generator polynomial", async () => {
      const c = await CyclicPage.open(page);
      await c.forward().click();
      await c.forward().click();
      return c;
    });
    await when("selecting x⁴ + x³ + x² + x + 1 in the list", () => c.generator(4, "0xF").click());
    await then("the ring has period 5 and the URL carries it", async () => {
      expect(c.hash()).toBe("#cyclic/width=4/poly=0xF");
      await expect(c.generator(4, "0xF")).toHaveAttribute("aria-current", "true");
      await expect(c.wordBits()).toHaveCount(5);
      await expect(c.states()).toHaveCount(5);
      await expect(c.word()).toHaveText("11111");
      await expect(c.currentState()).toHaveAttribute("data-power", "0");
    });
    await when("reloading", () => page.reload());
    await then("it opens with the same generator polynomial", async () => {
      await expect(c.states()).toHaveCount(5);
    });
  });

  test("a fragment naming a generator polynomial not in the list opens with the default generator polynomial", async ({
    page,
  }) => {
    const c = await given("#cyclic/width=4/poly=0x5 is open", () => CyclicPage.open(page, "#cyclic/width=4/poly=0x5"));
    await then("the ring is that of x³ + x + 1", async () => {
      await expect(c.states()).toHaveCount(7);
      await expect(c.generator(3, "0x3")).toHaveAttribute("aria-current", "true");
    });
  });
});
