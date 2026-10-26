import { expect, type Locator, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { SCREENS, type Screen } from "./support/screens";
import { Visualizer } from "./support/visualizer";
import { NamesPage } from "./support/namesPage";
import { NarrowPage } from "./support/narrowPage";
import { CyclicPage } from "./support/cyclicPage";
import { RedundancyPage } from "./support/redundancyPage";
import { CheckPage } from "./support/checkPage";
import { EquivalencePage } from "./support/equivalencePage";
import { TablePage } from "./support/tablePage";
import { EstimatePage } from "./support/estimatePage";

const QUERY = "?width=16&poly=0x1021&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";

/** Expects every element matched by each named locator to be wholly in view, with nothing of it scrolled or clipped away. */
async function allInView(parts: Record<string, Locator>): Promise<void> {
  for (const [name, locator] of Object.entries(parts)) {
    await expect(locator.first(), name).toBeVisible();
    for (const el of await locator.all()) await expect(el, name).toBeInViewport({ ratio: 1 });
  }
}

/** Checks the whitespace rules of docs/spec.md chapter 7 for the page open on screen. */
async function whitespace(page: Page, screen: Screen): Promise<void> {
  const v = Visualizer.on(page);
  if (screen.phone) {
    await then("nothing sticks out sideways", async () => {
      expect(await v.workbench.sticking()).toEqual([]);
      expect((await v.workbench.pageOverflow()).x).toBe(0);
    });
  } else {
    await then("the content spreads across the editor area and reaches at least 90 % of its height", async () => {
      expect(await v.workbench.contentFill()).toBeGreaterThanOrEqual(2 / 3);
      expect(await v.workbench.pageFill()).toBeGreaterThanOrEqual(0.9);
    });
  }
}

for (const screen of SCREENS) {
  const on = `on ${screen.name} (${screen.width}×${screen.height})`;

  test.describe(`Screens: ${on}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: screen.width, height: screen.height });
    });

    test(`${on}, the visualizer keeps what an action changes in view`, async ({ page }) => {
      const v = await given("the visualizer is open with a 16-bit CRC", () => Visualizer.open(page, QUERY));
      await whitespace(page, screen);
      await when("stepping forward to the first XOR", () => v.goTo("xor"));
      await then("the controls, the part of the diagram computed, the current line and the newest log entry are in view", () =>
        allInView({
          controls: page.locator(".controls"),
          "computed part": v.diagram.activeParts(),
          "current line": v.code.activeLine(),
          "newest log entry": v.log.latest(),
        }),
      );
      await when("pressing bit 3 and byte 1 of the input stream", async () => {
        await v.debug.bit(3).click();
        await v.debug.byte(1).click();
      });
      await then("they and their marks are in view", () =>
        allInView({
          bit: v.debug.bit(3),
          "bit mark": v.debug.bitMark(3),
          byte: v.debug.byte(1),
          "byte mark": v.debug.byteMark(1),
        }),
      );
      if (!screen.phone) {
        await when("hovering over the poly setting", () => v.settings.param("poly").hover());
        await then("the setting and the help pane are in view", () =>
          allInView({ setting: v.settings.param("poly"), help: v.settings.help() }),
        );
      }
    });

    test(`${on}, the naming page keeps what an action changes in view`, async ({ page }) => {
      const n = await given("the naming page is open", () => NamesPage.open(page, "#names", QUERY));
      await whitespace(page, screen);
      await when("hovering over poly in the diagram", () => n.callout("poly").hover());
      await then("the places where poly is used and the card are in view", () =>
        allInView({ highlighted: n.highlighted(), card: n.hoverCard() }),
      );
      await when("choosing the poly link", () => n.callout("poly").click());
      await then("the poly row of the table is in view", () => allInView({ row: n.paramRow("poly") }));
    });

    test(`${on}, the narrowing page keeps what an action changes in view`, async ({ page }) => {
      const n = await given("the narrowing page is open", () => NarrowPage.open(page, "#narrow"));
      await whitespace(page, screen);
      await when("splitting the root by width and choosing 16", async () => {
        await n.splitBy(0, "width").click();
        await n.branch(0, "16").locator(":scope > a").click();
      });
      await then("the next fork's choice of parameter is in view", () =>
        allInView({ "next fork": n.node(1).locator(":scope > .split-by") }),
      );
      await when("narrowing down to a single candidate", async () => {
        await n.splitBy(1, "poly").click();
        await n.branch(1, "0x1021").locator(":scope > a").click();
        await n.splitBy(2, "init").click();
        await n.branch(2, "0x1D0F").locator(":scope > a").click();
      });
      await then("its full name and the link to the visualizer are in view", () =>
        allInView({ name: n.result(), link: n.openInVisualizer() }),
      );
    });

    test(`${on}, the cyclic page keeps what an action changes in view`, async ({ page }) => {
      const c = await given("the cyclic page is open", () => CyclicPage.open(page, "#cyclic"));
      await whitespace(page, screen);
      await when("rotating forward", () => c.forward().click());
      await then("the button, both rings, the rotated bits and the remainder are in view", () =>
        allInView({
          button: c.forward(),
          rings: page.locator(".cyclic-page :is(.word-ring, .state-ring)"),
          "rotated bits": c.word(),
          remainder: c.remainder(),
        }),
      );
    });

    test(`${on}, the redundancy page keeps what an action changes in view`, async ({ page }) => {
      const r = await given("the redundancy page is open with the grid of all sequences", () =>
        RedundancyPage.open(page, "#redundancy"),
      );
      await whitespace(page, screen);
      await when("flipping the first received bit", () => r.receivedBit(0).click());
      await then("the bit, the verdict, the remainder and the yellow frames in both grids are in view", () =>
        allInView({
          bit: r.receivedBit(0),
          verdict: r.verdict(),
          remainder: r.remainder(),
          "CRC grid frame": r.stripCells("received"),
          "all-strings grid frame": r.gridDots("received"),
        }),
      );
    });

    test(`${on}, the check page keeps what an action changes in view`, async ({ page }) => {
      const c = await given("the check page is open", () => CheckPage.open(page, QUERY));
      await whitespace(page, screen);
      await when("flipping the last received bit", () => c.bits().last().click());
      await then("the bit and both verdicts are in view", () =>
        allInView({ bit: c.bits().last(), "recheck verdict": c.verdict("recheck"), "whole verdict": c.verdict("whole") }),
      );
    });

    test(`${on}, the equivalences page leaves no large empty space`, async ({ page }) => {
      await given("the equivalences page is open", () => EquivalencePage.open(page, QUERY));
      await whitespace(page, screen);
    });

    test(`${on}, the table page keeps what an action changes in view`, async ({ page }) => {
      const t = await given("the table page is open", () => TablePage.open(page, QUERY));
      await whitespace(page, screen);
      await when("choosing the second row of the byte-by-byte computation", () => t.step(1).click());
      await then("the row, the highlighted value of table T and the start of how it is made are in view", () =>
        allInView({
          row: t.step(1),
          "table value": t.usedCell(),
          "how it is made": t.entryTitle(),
          "first clock": t.clocks().first(),
        }),
      );
      await when("choosing the value for index 0x41 in table T", () => t.cell(0x41).click());
      await then("the value and the start of how it is made are in view", () =>
        allInView({ value: t.cell(0x41), "how it is made": t.entryTitle(), "first clock": t.clocks().first() }),
      );
    });

    test(`${on}, the estimation page keeps what an action changes in view`, async ({ page }) => {
      const e = await given("the estimation page is open with two pairs of the same length", async () => {
        const e = await EstimatePage.open(page);
        await e.fill(0, "hello", "34F6");
        await e.fill(1, "world", "EF41");
        return e;
      });
      await whitespace(page, screen);
      await when("searching", () => e.search().click());
      await then("the start of the results is in view", () => allInView({ results: e.candidates().first() }));
      await when("making the first CRC unreadable and searching again", async () => {
        await e.fill(0, "hello", "xyz");
        await e.search().click();
      });
      await then("the error in that field is in view", () => allInView({ error: e.errors(0) }));
    });
  });
}
