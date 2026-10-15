import { expect } from "@playwright/test";
import { EquivalencePage } from "./support/equivalencePage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

const ITEMS = ["refin", "refout", "rightShift", "initPrefix", "affine"];

test.describe("Substitution", () => {
  test("shows that both sides of each substitution give the same CRC for the current settings and input", async ({ page }) => {
    const v = await given("CRC-16/IBM-SDLC is selected", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/IBM-SDLC");
      return v;
    });
    await when("switching to the substitution page in the activity bar", () => v.workbench.pageLink("equivalence").click());
    const e = await then("all 5 substitutions apply and both sides match the check value 0x906E", async () => {
      const e = await EquivalencePage.shown(page);
      for (const id of ITEMS) {
        await expect(e.left(id)).toHaveText("0x906E");
        await expect(e.right(id)).toHaveText("0x906E");
      }
      await expect(v.workbench.statusbar()).toContainText("CRC-16/IBM-SDLC");
      return e;
    });
    await then("the prefix replacing init 0xFFFF is 0x84CF", async () => {
      await expect(e.prefix()).toHaveText("0x84CF");
    });
    await then("it is right-shift, and the code has poly 0x8408 and init 0xFFFF", async () => {
      await expect(e.direction()).toHaveAttribute("data-direction", "right");
      await expect(e.codeConstants()).toContainText("0x8408");
      await expect(e.codeConstants()).toContainText("0xFFFF");
    });
  });

  test("items that do not apply to the current settings give a reason instead of a worked example", async ({ page }) => {
    const e = await given("CRC-3/TUTORIAL is open with bit-wise input", () => EquivalencePage.open(page));
    await then("reflecting the input and the right-shift implementation do not apply", async () => {
      await expect(e.notApplicable("refin")).toContainText("8 ビットの倍数");
      await expect(e.notApplicable("rightShift")).toBeVisible();
      await expect(e.right("refout")).toHaveText(await e.left("refout").innerText());
    });
    await then("it is left-shift", async () => {
      await expect(e.direction()).toHaveAttribute("data-direction", "left");
    });
  });

  test("shows no worked example when the settings are invalid", async ({ page }) => {
    const e = await given("the page is open with width out of range", () => EquivalencePage.open(page, "?width=99"));
    await then(
      "it says the settings are invalid and shows neither worked examples nor notes on the current settings",
      async () => {
        await expect(e.invalid()).toBeVisible();
        await expect(e.left("refout")).toHaveCount(0);
        await expect(e.direction()).toHaveCount(0);
      },
    );
  });
});
