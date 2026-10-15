import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { TUTORIAL_STEPS, Visualizer } from "./support/visualizer";

test.describe("Keeping and sharing settings", () => {
  test("settings survive a reload, and the playback position returns to the start", async ({ page }) => {
    const v = await given("CRC-16/ARC, steady speed, ×4 and loop, at the 2nd step", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/ARC");
      await v.settings.speedMode().selectOption("steady");
      await v.settings.rate().selectOption("4");
      await v.settings.loop().click();
      await v.stepForward();
      return v;
    });
    await when("reloading", () => page.reload());
    await then("the settings are unchanged and the position is at the first step", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-16/ARC");
      await expect(v.settings.speedMode()).toHaveValue("steady");
      await expect(v.settings.rate()).toHaveValue("4");
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "true");
      await expect(v.counter).toHaveText(/^1 \//);
    });
  });

  test("opens with the default settings even if the saved value is corrupt", async ({ page }) => {
    const v = await given("the saved value cannot be read as JSON", async () => {
      const v = await Visualizer.open(page);
      await page.evaluate(() => localStorage.setItem("crc-visualize:settings:v1", "{broken"));
      return v;
    });
    await when("reloading", () => page.reload());
    await then("it opens at the start of CRC-3/TUTORIAL", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-3/TUTORIAL");
      await expect(v.counter).toHaveText(`1 / ${TUTORIAL_STEPS}`);
    });
  });

  test("changing the settings also rewrites the URL query", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("selecting CRC-16/ARC and enabling loop playback", async () => {
      await v.settings.preset().selectOption("CRC-16/ARC");
      await v.settings.loop().click();
    });
    await then("the query carries poly, refin and loop", async () => {
      await expect.poll(() => v.settings.query().get("poly")).toBe("0x8005");
      expect(v.settings.query().get("refin")).toBe("1");
      expect(v.settings.query().get("loop")).toBe("1");
    });
  });

  test("opens with the settings in the URL query, taking precedence over the saved value", async ({ page }) => {
    const v = await given("speed rate ×4 is saved", async () => {
      const v = await Visualizer.open(page);
      await v.settings.rate().selectOption("4");
      return v;
    });
    await when("opening a URL carrying CRC-16/ARC and loop but no speed rate", () =>
      page.goto("/?width=16&poly=0x8005&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789&loop=1"),
    );
    await then("it opens with the URL's settings, and the speed rate absent from the URL keeps its saved value", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-16/ARC");
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "true");
      await expect(v.settings.rate()).toHaveValue("4");
    });
  });
});
