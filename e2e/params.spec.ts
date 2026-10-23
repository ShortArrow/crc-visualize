import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

const PARAMS = ["width", "poly", "init", "refin", "refout", "xorout"];

test.describe("Parameter help and highlighting", () => {
  test("hovering a settings field highlights where that parameter is used in the code and the diagram", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("hovering the poly field", () => v.settings.param("poly").hover());
    await then("the poly field, its code chip and the tap gate are highlighted, and other chips are not", async () => {
      await expect(v.settings.param("poly")).toHaveClass(/\bhl\b/);
      await expect(v.code.chip("poly")).toHaveClass(/\bhl\b/);
      await expect(v.code.chip("init")).not.toHaveClass(/\bhl\b/);
      await expect(v.diagram.gate(1)).toHaveClass(/\bparam-hl\b/);
    });
  });

  test("hovering the input field highlights the input stream in the diagram", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("hovering the input field", () => v.settings.field("input").hover());
    await then("the input stream is highlighted", () => expect(v.diagram.stream()).toHaveClass(/\bparam-hl\b/));
    await when("moving the mouse away to the width field", () => v.settings.param("width").hover());
    await then("the input stream is no longer highlighted", () => expect(v.diagram.stream()).not.toHaveClass(/\bparam-hl\b/));
  });

  test("hovering a code chip highlights the matching settings field", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("hovering the init chip", () => v.code.chip("init").hover());
    await then("only the init field is highlighted", async () => {
      await expect(v.settings.param("init")).toHaveClass(/\bhl\b/);
      await expect(v.settings.param("poly")).not.toHaveClass(/\bhl\b/);
    });
  });

  test("settings fields are labelled only in English, and hovering shows the Japanese name and help in the help area", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await then("every field name is in English and the help area explains how to use it", async () => {
      await expect(v.settings.labels()).toHaveText([
        "preset",
        "width",
        "poly",
        "init",
        "refin",
        "refout",
        "xorout",
        "input mode",
        "input",
      ]);
      await expect(v.settings.currentHelp()).toContainText("マウスを乗せると、日本語名と説明を表示する");
    });
    await when("hovering preset", () =>
      v.settings
        .labels()
        .filter({ hasText: /^preset$/ })
        .hover(),
    );
    await then("the help area shows the Japanese name for preset and its help", async () => {
      await expect(v.settings.currentHelp()).toContainText("プリセット");
    });
    await when("hovering input mode", () =>
      v.settings
        .labels()
        .filter({ hasText: /^input mode$/ })
        .hover(),
    );
    await then("the help area shows the Japanese name for input mode", async () => {
      await expect(v.settings.currentHelp()).toContainText("入力形式");
    });
  });

  test("hovering a parameter shows its Japanese name, help, aliases and notes in the help area", async ({ page }) => {
    const v = await given("CRC-16/ARC is selected", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/ARC");
      return v;
    });
    await when("hovering poly", () => v.settings.param("poly").hover());
    await then(
      "it shows the generator polynomial's help and aliases, and the value in reflected right-shift notation",
      async () => {
        await expect(v.settings.currentHelp()).toContainText("生成多項式");
        await expect(v.settings.currentHelp()).toContainText("別名");
        await expect(v.settings.currentHelp()).toContainText("0xA001");
      },
    );
    await when("hovering refin", () => v.settings.param("refin").hover());
    await then("it notes that this amounts to a right-shift implementation", async () => {
      await expect(v.settings.currentHelp()).toContainText("右送り");
    });
  });

  for (const width of [1024, 1600]) {
    test(`at a width of ${width}px no parameter's help is clipped and the help area keeps its height`, async ({ page }) => {
      const v = await given(`the page is open at a width of ${width}px`, async () => {
        await page.setViewportSize({ width, height: 900 });
        return Visualizer.open(page);
      });
      const idleHeight = (await v.settings.help().boundingBox())!.height;
      for (const param of PARAMS) {
        await when(`hovering ${param}`, () => v.settings.param(param).hover());
        await then(`the help for ${param} is not clipped and the height is unchanged`, async () => {
          await expect(v.settings.currentHelp()).toHaveAttribute("data-param", param);
          const { scroll, client } = await v.settings
            .help()
            .evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
          expect(scroll).toBeLessThanOrEqual(client);
          expect((await v.settings.help().boundingBox())!.height).toBe(idleHeight);
        });
      }
    });
  }
});

test.describe("Settings validation and notation", () => {
  test("preset options show the full name with its aliases, so a setting looked up by alias can be selected", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("selecting the option carrying the alias CCITT-TRUE", async () => {
      const option = v.settings.preset().locator("option", { hasText: "CCITT-TRUE" });
      await expect(option).toHaveText("CRC-16/KERMIT（CCITT、CCITT-TRUE、CRC-CCITT）");
      await v.settings.preset().selectOption({ label: (await option.textContent())! });
    });
    await then("the parameters become those of CRC-16/KERMIT", async () => {
      await expect(v.settings.param("poly").locator("input")).toHaveValue("0x1021");
      await expect(v.settings.param("refin").locator("input")).toBeChecked();
    });
  });

  test("invalid settings show an error on the field and remove the diagram", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("entering 0 for width", () => page.getByLabel("width").fill("0"));
    await then("width shows an error and the diagram disappears", async () => {
      await expect(page.locator(".error")).toHaveText("1〜32 の整数を入れてください");
      await expect(page.locator(".invalid-config")).toBeVisible();
      await expect(v.diagram.root()).toHaveCount(0);
    });
  });

  test("page text uses no ad-hoc abbreviations and no half-width parenthesis right after Japanese", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    const visibleText = () =>
      page.locator(".workbench").evaluate((main) => {
        const clone = main.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("pre.code, select").forEach((el) => el.remove());
        const titles = [...main.querySelectorAll("[title]")].map((el) => el.getAttribute("title")).join(" ");
        return `${clone.textContent} ${titles}`;
      });
    for (const preset of ["CRC-3/TUTORIAL", "CRC-32/ISO-HDLC"]) {
      const texts = await when(`selecting ${preset} and showing the first 6 steps in turn`, async () => {
        await v.settings.preset().selectOption(preset);
        const seen: string[] = [];
        for (let i = 0; i < 6; i++) {
          seen.push(await visibleText());
          await v.stepForward();
        }
        return seen;
      });
      await then("no step's text contains fb or a Japanese character followed by (", async () => {
        for (const text of texts) {
          expect(text).not.toMatch(/\bfb\b/);
          expect(text).not.toMatch(/[ぁ-んァ-ヶー一-龠] ?\(/);
        }
      });
    }
  });
});
