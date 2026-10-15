import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

const PHONE = { width: 390, height: 844 };
const QUERY = "?width=16&poly=0x1021&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";
const PAGES = [
  "",
  "#names",
  "#narrow",
  "#cyclic",
  "#redundancy",
  "#redundancy/width=5/poly=0x5",
  "#check",
  "#equivalence",
  "#table",
  "#estimate",
];

test.describe("On a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE);
  });

  test("the page links run along the bottom above the status bar, and the editor area takes the whole width", async ({
    page,
  }) => {
    const v = await given("the page is open on a 390×844 screen", () => Visualizer.open(page, QUERY));
    await then(
      "the activity bar lies across the bottom, under the editor area, with every page link inside the screen",
      async () => {
        const f = await v.workbench.frameBoxes();
        expect(f.activity.width).toBeCloseTo(PHONE.width, 0);
        expect(f.activity.top).toBeGreaterThanOrEqual(f.editor.bottom - 1);
        expect(f.statusbar.top).toBeGreaterThanOrEqual(f.activity.bottom - 1);
        expect(f.editor.width).toBeCloseTo(PHONE.width, 0);
        for (const link of await page.locator(".activity a").all()) await expect(link).toBeInViewport({ ratio: 1 });
      },
    );
    await then("the sidebar is closed and the page does not scroll", async () => {
      await expect(v.workbench.sidebar()).toBeHidden();
      expect(await v.workbench.pageOverflow()).toEqual({ x: 0, y: 0 });
    });
  });

  test("the sidebar opens over the editor area, and closes on choosing an item or tapping beside it", async ({ page }) => {
    const v = await given("the redundancy page is open on a 390×844 screen", async () => {
      await page.goto(`/${QUERY}#redundancy`);
      return Visualizer.on(page);
    });
    await when("tapping the sidebar button", () => v.workbench.sidebarToggle().click());
    await then("the sidebar is shown over the editor area, which keeps the whole width", async () => {
      await expect(v.workbench.sidebar()).toBeVisible();
      expect((await v.workbench.frameBoxes()).editor.width).toBeCloseTo(PHONE.width, 0);
    });
    await when("choosing the third generator", () => page.locator(".generator-list a").nth(2).click());
    await then("the page shows it and the sidebar is closed", async () => {
      await expect(page).toHaveURL(/#redundancy\/width=4\/poly=0x3/);
      await expect(v.workbench.sidebar()).toBeHidden();
    });
    await when("opening the sidebar again and tapping beside it", async () => {
      await v.workbench.sidebarToggle().click();
      await v.workbench.drawerShade().click({ position: { x: PHONE.width - 10, y: 200 } });
    });
    await then("the sidebar is closed", () => expect(v.workbench.sidebar()).toBeHidden());
  });

  for (const hash of PAGES) {
    test(`${hash || "the visualizer"} fits the width: nothing sticks out sideways and no text is squeezed`, async ({ page }) => {
      const v = await given(`${hash || "the visualizer"} is open on a 390×844 screen`, async () => {
        await page.goto(`/${QUERY}${hash}`);
        const v = Visualizer.on(page);
        await expect(page.locator(".editor > *").first()).toBeVisible();
        return v;
      });
      await then(
        "nothing in the editor area sticks out past its right edge, except inside parts that scroll sideways",
        async () => {
          expect(await v.workbench.sticking()).toEqual([]);
          expect(await v.workbench.pageOverflow()).toEqual({ x: 0, y: 0 });
        },
      );
      await then("no text runs down the screen a character or two to a line", async () => {
        expect((await v.workbench.cardLayout()).squeezed).toBe(0);
      });
    });
  }

  test("the visualizer stacks the controls, the whole diagram, the code and the log, and scrolls down through them", async ({
    page,
  }) => {
    await given("the visualizer is open on a 390×844 screen", () => Visualizer.open(page, QUERY));
    await then("the diagram fits the width, and the code and the log follow below it", async () => {
      const box = (selector: string) =>
        page
          .locator(selector)
          .boundingBox()
          .then((b) => b!);
      const [editor, diagram, code, log] = await Promise.all([
        box(".editor"),
        box("svg.lfsr"),
        box(".software"),
        box(".log-pane"),
      ]);
      expect(diagram.width).toBeLessThanOrEqual(editor.width);
      expect(code.y).toBeGreaterThanOrEqual(diagram.y + diagram.height - 1);
      expect(log.y).toBeGreaterThanOrEqual(code.y + code.height - 1);
    });
    await then("there are no splitters", () => expect(page.locator(".splitter")).toHaveCount(0));
  });
});
