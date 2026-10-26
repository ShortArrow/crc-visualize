import { expect, type Locator, type Page } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { SCREENS, tierOf, type Screen } from "./support/screens";
import { Visualizer } from "./support/visualizer";
import { NOT_YET_MET } from "./support/notYetMet";
import { NamesPage } from "./support/namesPage";
import { NarrowPage } from "./support/narrowPage";
import { CyclicPage } from "./support/cyclicPage";
import { RedundancyPage } from "./support/redundancyPage";
import { CheckPage } from "./support/checkPage";
import { EquivalencePage } from "./support/equivalencePage";
import { TablePage } from "./support/tablePage";
import { EstimatePage } from "./support/estimatePage";

const QUERY = "?width=16&poly=0x1021&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";

/** The largest gap (px) allowed between the phone dock and the drawing above it: one finger-sized button. */
const DOCK_GAP = 48;

/**
 * Expects every element matched by each named locator to be wholly in view and not covered by anything else (see
 * workbench.uncovered), so the viewer sees it without scrolling.
 */
async function allInView(page: Page, parts: Record<string, Locator>): Promise<void> {
  const v = Visualizer.on(page);
  for (const [name, locator] of Object.entries(parts)) {
    await expect(locator.first(), name).toBeVisible();
    for (const el of await locator.all()) {
      await expect(el, name).toBeInViewport({ ratio: 1 });
      expect(await v.workbench.uncovered(el), `${name} is not covered`).toBe(1);
    }
  }
}

/** Checks the whitespace rules of docs/spec.md chapter 7 for the page open on screen. */
async function whitespace(page: Page, screen: Screen): Promise<void> {
  const v = Visualizer.on(page);
  if (tierOf(screen) === "phone") {
    await then(`nothing sticks out sideways, and the dock is at most ${DOCK_GAP} px below the drawing above it`, async () => {
      expect(await v.workbench.sticking()).toEqual([]);
      expect((await v.workbench.pageOverflow()).x).toBe(0);
      const gap = await v.workbench.dockGap();
      if (gap !== undefined) expect(gap).toBeLessThanOrEqual(DOCK_GAP);
    });
  } else {
    await then("the content spreads across the editor area and reaches at least 90 % of its height", async () => {
      expect(await v.workbench.contentFill()).toBeGreaterThanOrEqual(2 / 3);
      expect(await v.workbench.pageFill()).toBeGreaterThanOrEqual(0.9);
    });
  }
}

test.beforeEach(({}, info) => test.fail(NOT_YET_MET.has(info.title), "the app does not meet this rule yet"));

for (const screen of SCREENS) {
  const on = `on ${screen.name} (${screen.width}×${screen.height})`;
  const phone = tierOf(screen) === "phone";

  test.describe(`Screens: ${on}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: screen.width, height: screen.height });
    });

    test(`${on}, the visualizer keeps what an action changes in view`, async ({ page }) => {
      const v = await given("the visualizer is open with a 16-bit CRC", () => Visualizer.open(page, QUERY));
      await whitespace(page, screen);
      await when("stepping forward to the first XOR", () => v.goTo("xor"));
      await then(
        "the controls, the most significant register, the head of the flow, the current line and the newest step are in view",
        async () => {
          const head = await v.diagram.flowHead();
          expect(head, "something flows at the XOR").toBeDefined();
          await allInView(page, {
            controls: page.locator(".controls"),
            "most significant register": await v.diagram.msb(),
            "head of the flow": head!,
            "current line": v.code.activeLine(),
            ...(tierOf(screen) === "pc"
              ? { "newest log entry": v.log.latest() }
              : { "step in the status bar": v.workbench.statusStep() }),
          });
        },
      );
      await when("pressing bit 3 and byte 1 of the input stream", async () => {
        await v.debug.bit(3).click();
        await v.debug.byte(1).click();
      });
      await then("they and their marks are in view", () =>
        allInView(page, {
          bit: v.debug.bit(3),
          "bit mark": v.debug.bitMark(3),
          byte: v.debug.byte(1),
          "byte mark": v.debug.byteMark(1),
        }),
      );
      if (!phone) {
        await when("hovering over the poly setting", () => v.settings.param("poly").hover());
        await then("the setting and the help pane are in view", () =>
          allInView(page, { setting: v.settings.param("poly"), help: v.settings.help() }),
        );
      }
    });

    test(`${on}, the naming page keeps what an action changes in view`, async ({ page }) => {
      const n = await given("the naming page is open", () => NamesPage.open(page, "#names", QUERY));
      await whitespace(page, screen);
      await when("hovering over poly in the diagram", () => n.callout("poly").hover());
      await then("the places where poly is used and the card are in view", () =>
        allInView(page, { highlighted: n.highlighted(), card: n.hoverCard() }),
      );
      await when("choosing the poly link", () => n.callout("poly").click());
      await then("the poly row of the table is in view", () => allInView(page, { row: n.paramRow("poly") }));
    });

    test(`${on}, the narrowing page keeps what an action changes in view`, async ({ page }) => {
      const n = await given("the narrowing page is open", () => NarrowPage.open(page, "#narrow"));
      await whitespace(page, screen);
      await when("splitting the root by width and choosing 16", async () => {
        await n.splitBy(0, "width").click();
        await n.branch(0, "16").locator(":scope > a").click();
      });
      await then("the next fork's choice of parameter is in view", () =>
        allInView(page, { "next fork": n.node(1).locator(":scope > .split-by") }),
      );
      await when("narrowing down to a single candidate", async () => {
        await n.splitBy(1, "poly").click();
        await n.branch(1, "0x1021").locator(":scope > a").click();
        await n.splitBy(2, "init").click();
        await n.branch(2, "0x1D0F").locator(":scope > a").click();
      });
      await then("its full name and the link to the visualizer are in view", () =>
        allInView(page, { name: n.result(), link: n.openInVisualizer() }),
      );
    });

    test(`${on}, the cyclic page keeps what an action changes in view`, async ({ page }) => {
      const c = await given("the cyclic page is open", () => CyclicPage.open(page, "#cyclic"));
      await whitespace(page, screen);
      await when("rotating forward", () => c.forward().click());
      await then("the button, both rings, the rotated bits and the remainder are in view", () =>
        allInView(page, {
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
      if (phone) {
        await then("the bit, the verdict in the dock and the yellow frames in both grids are in view", async () => {
          await allInView(page, {
            bit: r.receivedBit(0),
            "verdict in the dock": Visualizer.on(page).workbench.dockResult(),
            "CRC grid frame": r.stripCells("received"),
            "all-strings grid frame": r.gridDots("received"),
          });
          await expect(Visualizer.on(page).workbench.dockResult()).toHaveAttribute(
            "data-verdict",
            (await r.verdict().getAttribute("data-verdict"))!,
          );
        });
      } else {
        await then("the bit, the verdict, the remainder and the yellow frames in both grids are in view", () =>
          allInView(page, {
            bit: r.receivedBit(0),
            verdict: r.verdict(),
            remainder: r.remainder(),
            "CRC grid frame": r.stripCells("received"),
            "all-strings grid frame": r.gridDots("received"),
          }),
        );
      }
    });

    test(`${on}, the check page keeps what an action changes in view`, async ({ page }) => {
      const c = await given("the check page is open", () => CheckPage.open(page, QUERY));
      await whitespace(page, screen);
      await when("flipping the last received bit", () => c.bits().last().click());
      if (phone) {
        await then("the bit and the verdict in the dock are in view, and the verdict says an error was found", async () => {
          const result = Visualizer.on(page).workbench.dockResult();
          await allInView(page, { bit: c.bits().last(), "verdict in the dock": result });
          await expect(result).toHaveAttribute("data-ok", "false");
        });
      } else {
        await then("the bit and both verdicts are in view", () =>
          allInView(page, {
            bit: c.bits().last(),
            "recheck verdict": c.verdict("recheck"),
            "whole verdict": c.verdict("whole"),
          }),
        );
      }
    });

    test(`${on}, the equivalences page leaves no large empty space`, async ({ page }) => {
      await given("the equivalences page is open", () => EquivalencePage.open(page, QUERY));
      await whitespace(page, screen);
    });

    test(`${on}, the table page keeps what an action changes in view`, async ({ page }) => {
      const t = await given("the table page is open", () => TablePage.open(page, QUERY));
      await whitespace(page, screen);
      await when("choosing the second row of the byte-by-byte computation", () => t.step(1).click());
      if (phone) {
        await then("the row and its index and table value in the dock are in view", async () => {
          const result = Visualizer.on(page).workbench.dockResult();
          await allInView(page, { row: t.step(1), "index and value in the dock": result });
          const index = Number(await t.step(1).getAttribute("data-index"));
          const value = (await t.usedCell().textContent())!.trim();
          await expect(result).toHaveText(`T[0x${index.toString(16).toUpperCase().padStart(2, "0")}] = 0x${value}`);
        });
      } else {
        await then("the row, the highlighted value of table T and the start of how it is made are in view", () =>
          allInView(page, {
            row: t.step(1),
            "table value": t.usedCell(),
            "how it is made": t.entryTitle(),
            "first clock": t.clocks().first(),
          }),
        );
      }
      await when("choosing the value for index 0x41 in table T", () => t.cell(0x41).click());
      await then("the value and the start of how it is made are in view", () =>
        allInView(page, { value: t.cell(0x41), "how it is made": t.entryTitle(), "first clock": t.clocks().first() }),
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
      await then("the start of the results is in view", () => allInView(page, { results: e.candidates().first() }));
      await when("making the first CRC unreadable and searching again", async () => {
        await e.fill(0, "hello", "xyz");
        await e.search().click();
      });
      await then("the error in that field is in view", () => allInView(page, { error: e.errors(0) }));
    });
  });
}

const ZOOM_SCREENS = ["iPhone 12 to 14", "1920×1080 at 100%", "1920×1080 at 150%"].map((name) =>
  SCREENS.find((s) => s.name === name)!,
);

for (const screen of ZOOM_SCREENS) {
  const on = `on ${screen.name} (${screen.width}×${screen.height})`;
  const phone = tierOf(screen) === "phone";

  test.describe(`Screens: diagram zoom ${on}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: screen.width, height: screen.height });
    });

    test(`${on}, the zoom buttons change the size of the diagram, and Fit and a change of setting bring back the automatic size`, async ({
      page,
    }) => {
      const v = await given("the visualizer is open with a 16-bit CRC", () => Visualizer.open(page, QUERY));
      const auto = await v.diagram.drawnWidth();
      await then("the −, ＋ and Fit buttons are in view", () =>
        allInView(page, { out: v.diagram.zoom("out"), in: v.diagram.zoom("in"), fit: v.diagram.zoom("fit") }),
      );
      await when("pressing ＋", () => v.diagram.zoom("in").click());
      await then("the diagram is drawn larger", async () => expect(await v.diagram.drawnWidth()).toBeGreaterThan(auto + 1));
      await when("pressing − twice", async () => {
        await v.diagram.zoom("out").click();
        await v.diagram.zoom("out").click();
      });
      await then("the diagram is drawn smaller than at first", async () =>
        expect(await v.diagram.drawnWidth()).toBeLessThan(auto - 1),
      );
      await when("pressing Fit", () => v.diagram.zoom("fit").click());
      await then("the diagram is back to its automatic size", async () =>
        expect(Math.abs((await v.diagram.drawnWidth()) - auto)).toBeLessThanOrEqual(1),
      );
      await when("pressing ＋ and then changing the preset to CRC-32/ISO-HDLC", async () => {
        await v.diagram.zoom("in").click();
        if (phone) await v.workbench.sidebarToggle().click();
        await v.settings.preset().selectOption("CRC-32/ISO-HDLC");
        if (phone && (await v.workbench.drawerShade().isVisible()))
          await v.workbench.drawerShade().click({ position: { x: screen.width - 10, y: 200 } });
      });
      await then(
        "pressing Fit leaves the diagram as it is, since the change already brought back the automatic size",
        async () => {
          const changed = await v.diagram.drawnWidth();
          await v.diagram.zoom("fit").click();
          expect(Math.abs((await v.diagram.drawnWidth()) - changed)).toBeLessThanOrEqual(1);
        },
      );
    });

    if (phone) {
      test(`${on}, pinching the diagram with two fingers zooms in and out`, async ({ page }) => {
        const v = await given("the visualizer is open with a 16-bit CRC", () => Visualizer.open(page, QUERY));
        const auto = await v.diagram.drawnWidth();
        await when("spreading two fingers apart over the diagram", () => v.diagram.pinch(40, 120));
        await then("the diagram is drawn larger", async () => expect(await v.diagram.drawnWidth()).toBeGreaterThan(auto + 1));
        await when("bringing two fingers together over the diagram", () => v.diagram.pinch(150, 30));
        await then("the diagram is drawn smaller than at first", async () =>
          expect(await v.diagram.drawnWidth()).toBeLessThan(auto - 1),
        );
      });
    }

    if (!phone) {
      test(`${on}, Ctrl with the wheel over the diagram zooms in and out`, async ({ page }) => {
        const v = await given("the visualizer is open with a 16-bit CRC", () => Visualizer.open(page, QUERY));
        const auto = await v.diagram.drawnWidth();
        await when("turning the wheel up with Ctrl held over the diagram", async () => {
          await v.diagram.root().hover();
          await page.keyboard.down("Control");
          await page.mouse.wheel(0, -200);
          await page.keyboard.up("Control");
        });
        await then("the diagram is drawn larger", async () => expect(await v.diagram.drawnWidth()).toBeGreaterThan(auto + 1));
        await when("turning the wheel down with Ctrl held over the diagram", async () => {
          await page.keyboard.down("Control");
          await page.mouse.wheel(0, 400);
          await page.keyboard.up("Control");
        });
        await then("the diagram is drawn smaller than at first", async () =>
          expect(await v.diagram.drawnWidth()).toBeLessThan(auto - 1),
        );
      });
    }
  });
}

for (const screen of SCREENS.filter((s) => tierOf(s) === "short")) {
  const on = `on ${screen.name} (${screen.width}×${screen.height})`;

  test.describe(`Screens: short screen ${on}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: screen.width, height: screen.height });
    });

    test(`${on}, the playback controls fit in one row, and the software and the log are tabs`, async ({ page }) => {
      const v = await given("the visualizer is open with a 16-bit CRC", () => Visualizer.open(page, QUERY));
      await then("every control of the playback controls shares one row", async () => {
        const tops = await page
          .locator(".controls :is(button, select, input)")
          .evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).map((el) => el.getBoundingClientRect().top));
        expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
      });
      await then("the software tab is chosen and shows the code, with the log hidden", async () => {
        await expect(v.workbench.panelTab("software")).toHaveAttribute("aria-selected", "true");
        await expect(page.locator(".panel > .software")).toBeVisible();
        await expect(page.locator(".panel > .log-pane")).toBeHidden();
      });
      await when("choosing the log tab", () => v.workbench.panelTab("log").click());
      await then("the log is shown and the code is hidden", async () => {
        await expect(page.locator(".panel > .log-pane")).toBeVisible();
        await expect(page.locator(".panel > .software")).toBeHidden();
      });
    });

    for (const hash of ["#cyclic", "#redundancy", "#check"]) {
      test(`${on}, the explanation paragraphs of ${hash} are closed at first and open from their heading`, async ({ page }) => {
        const v = await given(`${hash} is open`, async () => {
          await page.goto(`/${QUERY}${hash}`);
          const v = Visualizer.on(page);
          await expect(page.locator(".editor > *").first()).toBeVisible();
          return v;
        });
        await then("the page has explanation paragraphs, all closed", async () => {
          await expect(v.workbench.explanations().first()).toBeVisible();
          for (const d of await v.workbench.explanations().all()) await expect(d).not.toHaveAttribute("open");
        });
        await when("choosing the heading of the first one", () =>
          v.workbench.explanations().first().locator(":scope > summary").click(),
        );
        await then("it opens", () => expect(v.workbench.explanations().first()).toHaveAttribute("open"));
      });
    }
  });
}
