import { expect } from "@playwright/test";
import { given, patience, test, then, when } from "./support/scenario";
import { TUTORIAL_STEPS, Visualizer } from "./support/visualizer";

test.describe("Playback", () => {
  test("playing advances to the end and stops", async ({ page }) => {
    const v = await given("the page is open with speed rate ×8", async () => {
      const v = await Visualizer.open(page);
      await v.settings.rate().selectOption("8");
      return v;
    });
    await when("playing", () => v.settings.play().click());
    await then("it stops at the end and the button returns to play", async () => {
      await expect(v.counter).toHaveText(`${TUTORIAL_STEPS} / ${TUTORIAL_STEPS}`, patience(10_000));
      await expect(v.settings.play()).toHaveAttribute("aria-label", "再生");
    });
  });

  test("with loop playback, after the end it returns to the start and keeps playing", async ({ page }) => {
    const v = await given("loop playback is enabled with the L key and the position is one before the end", async () => {
      const v = await Visualizer.open(page);
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "false");
      await page.keyboard.press("l");
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "true");
      await v.goToEnd();
      await v.stepBack();
      return v;
    });
    await when("playing", () => v.settings.play().click());
    await then("after showing the end, it returns to the start and keeps playing", async () => {
      await expect(v.counter).toHaveText(`${TUTORIAL_STEPS} / ${TUTORIAL_STEPS}`);
      await expect(v.counter).toHaveText(`1 / ${TUTORIAL_STEPS}`, patience(5_000));
      await expect(v.settings.play()).toHaveAttribute("aria-label", "一時停止");
    });
  });

  test("the loop setting is kept when the CRC settings change", async ({ page }) => {
    const v = await given("loop playback is enabled", async () => {
      const v = await Visualizer.open(page);
      await v.settings.loop().click();
      return v;
    });
    await when("changing the preset", () => v.settings.preset().selectOption("CRC-8/SMBUS"));
    await then("loop playback stays enabled", async () => {
      await expect(v.settings.loop()).toHaveAttribute("aria-pressed", "true");
    });
  });

  test("changing the settings returns to the start", async ({ page }) => {
    const v = await given("at an xor step", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("xor");
      return v;
    });
    await when("changing the input to 1", () => v.settings.field("input").fill("1"));
    await then("the position is at the start of the new step sequence", async () => {
      await expect(v.counter).toHaveText("1 / 5");
    });
  });

  test("with CRC-32/ISO-HDLC the CRC of 123456789 matches the check value", async ({ page }) => {
    const v = await given("CRC-32/ISO-HDLC is selected", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-32/ISO-HDLC");
      return v;
    });
    await when("advancing to the end", () => v.goToEnd());
    await then("it shows that the check value matches", async () => {
      await expect(page.locator(".check")).toHaveText("検査値 0xCBF43926 と一致");
    });
  });

  test("at the end, the input and the CRC are split into bytes and also shown in hexadecimal", async ({ page }) => {
    const v = await given("CRC-16/ARC is selected", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/ARC");
      return v;
    });
    await when("advancing to the end", () => v.goToEnd());
    await then("the bits are in groups of 8, followed by the same bytes in hexadecimal with the CRC's in green", async () => {
      await expect(page.locator(".result-bits")).toHaveText(/^00110001 00110010 (\d{8} ){7}10111011 00111101$/);
      await expect(page.locator(".result-hex")).toHaveText("31 32 33 34 35 36 37 38 39 BB 3D");
      await expect(page.locator(".result-hex .crc-tail")).toHaveText(["BB", "3D"]);
    });
  });

  test("at the end, input and CRC that do not fill whole bytes have no hexadecimal", async ({ page }) => {
    const v = await given("a 4-bit CRC of 5 bits is open", () =>
      Visualizer.open(page, "?width=4&poly=0x3&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=bits&input=10101"),
    );
    await when("advancing to the end", () => v.goToEnd());
    await then("the 9 bits are split after the 8th, and no hexadecimal is shown", async () => {
      await expect(page.locator(".result-bits")).toHaveText(/^\d{8} \d$/);
      await expect(page.locator(".result-hex")).toHaveCount(0);
    });
  });
});
