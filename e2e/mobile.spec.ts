import { expect, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

const PHONE = { width: 390, height: 844 };
const QUERY = "?width=16&poly=0x1021&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";
/** The bounding box of the first element matching selector. */
const boxOf = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;

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

  test("the visualizer keeps a readable diagram at the top and the controls at the bottom, and scrolls the code and the log between them", async ({
    page,
  }) => {
    const v = await given("the visualizer is open on a 390×844 screen", () => Visualizer.open(page, QUERY));
    await then("the controls lie under the editor area, above the page links", async () => {
      const [editor, controls, activity] = [
        await boxOf(page, ".editor"),
        await boxOf(page, ".controls"),
        await boxOf(page, ".activity"),
      ];
      expect(controls.y).toBeGreaterThanOrEqual(editor.y + editor.height - 1);
      expect(activity.y).toBeGreaterThanOrEqual(controls.y + controls.height - 1);
    });
    await then("the registers are drawn large enough to read their values", async () => {
      expect((await page.locator(".reg rect").first().boundingBox())!.width).toBeGreaterThanOrEqual(32);
    });
    await when("scrolling down to the end of the log", () => page.locator(".log-entry").last().scrollIntoViewIfNeeded());
    await then("the diagram and the step button are still in view, and the log comes below the diagram", async () => {
      await expect(page.locator("svg.lfsr")).toBeInViewport();
      await expect(page.locator(`.controls button[title="${"1 ステップ進む（→）"}"]`)).toBeInViewport({ ratio: 1 });
      const diagram = await boxOf(page, "svg.lfsr");
      const last = (await page.locator(".log-entry").last().boundingBox())!;
      expect(last.y).toBeGreaterThanOrEqual(diagram.y + diagram.height - 1);
    });
    await then("there are no splitters", () => expect(page.locator(".splitter")).toHaveCount(0));
    await when("scrolling the diagram to its right end and stepping to the first feedback", async () => {
      await page.locator('.reg[data-bit="0"]').scrollIntoViewIfNeeded();
      await v.goTo("feedback");
    });
    await then("the diagram is scrolled back to the most significant register being read", () =>
      expect(page.locator(".reg.msb")).toBeInViewport({ ratio: 1 }),
    );
  });

  test("on the cyclic page, the rotate buttons and the rotated codeword stay at the bottom while the rings are read", async ({
    page,
  }) => {
    await given("the cyclic page is open, scrolled to the codeword ring", async () => {
      await page.goto(`/${QUERY}#cyclic`);
      await page.locator(".cyclic-rings figure").first().scrollIntoViewIfNeeded();
    });
    await then("the rotate buttons and the rotated codeword are in view beside the ring", async () => {
      await expect(page.locator(".rotate-forward")).toBeInViewport({ ratio: 1 });
      await expect(page.locator(".cyclic-word")).toBeInViewport({ ratio: 1 });
      await expect(page.locator(".cyclic-rings figure").first()).toBeInViewport();
    });
    await when("rotating", () => page.locator(".rotate-forward").click());
    await then("the codeword ring is still in view", () => expect(page.locator(".cyclic-rings figure").first()).toBeInViewport());
  });

  test("on the redundancy page, the received sequence stays at the bottom while the grid of all sequences is read", async ({
    page,
  }) => {
    await given("the redundancy page is open, scrolled to the grid of all sequences", async () => {
      await page.goto(`/${QUERY}#redundancy`);
      await page.locator(".word-grid").scrollIntoViewIfNeeded();
    });
    await then("the received sequence and its buttons are in view with the grid", async () => {
      await expect(page.locator(".received-row")).toBeInViewport({ ratio: 1 });
      await expect(page.locator(".missed-example")).toBeInViewport({ ratio: 1 });
      await expect(page.locator(".word-grid")).toBeInViewport();
    });
  });

  test("on the check page, the sent sequence stays at the bottom while the verdicts are read", async ({ page }) => {
    await given("the check page is open, scrolled to the last verdict", async () => {
      await page.goto(`/${QUERY}#check`);
      await page.locator(".method .verdict").last().scrollIntoViewIfNeeded();
    });
    await then("the sent sequence is in view with the verdict", async () => {
      await expect(page.locator(".frame-row")).toBeInViewport({ ratio: 1 });
      await expect(page.locator(".method .verdict").last()).toBeInViewport({ ratio: 1 });
    });
  });

  test("on the table page, the entry card follows the byte-by-byte card, and the row headings of the table T stay while it scrolls sideways", async ({
    page,
  }) => {
    await given("the table page is open", () => page.goto(`/${QUERY}#table`));
    await then("the entry card comes before the table T", async () => {
      expect((await boxOf(page, ".entry-card")).y).toBeLessThan((await boxOf(page, ".crc-table-scroll")).y);
    });
    await when("scrolling the table T to its right end", async () => {
      await page.locator(".crc-table tbody td").last().scrollIntoViewIfNeeded();
    });
    await then("the row headings are in view", () =>
      expect(page.locator(".crc-table tbody th").last()).toBeInViewport({ ratio: 1 }),
    );
  });
});
