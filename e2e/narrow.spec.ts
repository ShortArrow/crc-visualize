import { expect } from "@playwright/test";
import { NarrowPage } from "./support/narrowPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Narrowing", () => {
  test("beside the tree, a table lists the remaining candidates with their check values and emphasizes the parameters that split them", async ({
    page,
  }) => {
    const n = await given("the path width = 16, poly = 0x1021 is open", () =>
      NarrowPage.open(page, "#narrow/width=16/poly=0x1021"),
    );
    await then("the table has a row per remaining candidate, and the sidebar names none of them", async () => {
      await expect(n.tableRow()).toHaveCount(11);
      await expect(page.locator(".sidebar")).not.toContainText("CRC-16/KERMIT");
    });
    await then("CRC-16/KERMIT's row shows its parameters and its check value", () =>
      expect(n.tableRow("CRC-16/KERMIT")).toContainText(/0x1021.*0x0.*true.*true.*0x0.*0x2189/),
    );
    await then("init, whose values differ, is emphasized, and poly, which all share, is not", async () => {
      await expect(n.tableHead("init")).toHaveClass(/\bsplits\b/);
      await expect(n.tableHead("poly")).not.toHaveClass(/\bsplits\b/);
    });
  });

  test("fixes values one at a time down to a single algorithm and opens it in the visualizer", async ({ page }) => {
    const v = await given("the visualizer page is open", () => Visualizer.open(page));
    await when("switching to the narrowing page in the activity bar", () => v.workbench.pageLink("narrow").click());
    const n = await then("it starts from all 104 candidates", async () => {
      const n = await NarrowPage.shown(page);
      expect(n.hash()).toBe("#narrow");
      await expect(n.candidates()).toHaveCount(104);
      await expect(v.workbench.statusbar()).toContainText("候補 104");
      return n;
    });
    await when("selecting width at the root", () => n.splitBy(0, "width").click());
    await then("a branch per width value appears, with its candidate count", async () => {
      expect(n.hash()).toBe("#narrow/width");
      await expect(n.branch(0, "16")).toContainText("31");
      await expect(n.branch(0, "17")).toContainText("CRC-17/CAN-FD");
    });
    await when("selecting 16, poly, 0x1021 and init in turn", async () => {
      await n.branch(0, "16").locator(":scope > a").click();
      await n.splitBy(1, "poly").click();
      await n.branch(1, "0x1021").locator(":scope > a").click();
      await n.splitBy(2, "init").click();
    });
    await then("the path is in the URL and the candidates drop to 11", async () => {
      expect(n.hash()).toBe("#narrow/width=16/poly=0x1021/init");
      await expect(n.candidates()).toHaveCount(11);
      await expect(n.branch(2, "0x1D0F")).toContainText("CRC-16/SPI-FUJITSU");
    });
    await when("selecting the init 0x1D0F branch", () => n.branch(2, "0x1D0F").locator(":scope > a").click());
    await then("a single candidate remains and it can be opened in the visualizer", async () => {
      await expect(n.candidates()).toHaveText(["CRC-16/SPI-FUJITSU"]);
      await expect(n.openInVisualizer()).toBeVisible();
    });
    await when("opening it in the visualizer", () => n.openInVisualizer().click());
    await then("the visualizer page appears with the CRC-16/SPI-FUJITSU settings", async () => {
      expect(n.hash()).toBe("");
      await expect(v.settings.preset()).toHaveValue("CRC-16/SPI-FUJITSU");
    });
  });

  test("selecting an unchosen branch or a different parameter replaces the path from that node on", async ({ page }) => {
    const n = await given("#narrow/width=16/poly=0x1021/init is open", () =>
      NarrowPage.open(page, "#narrow/width=16/poly=0x1021/init"),
    );
    await when("selecting the collapsed 0x8005 branch at the poly node", () =>
      n.branch(1, "0x8005").locator(":scope > a").click(),
    );
    await then("the path from poly on becomes 0x8005", async () => {
      expect(n.hash()).toBe("#narrow/width=16/poly=0x8005");
      await expect(n.candidates()).toHaveCount(7);
    });
    await when("changing the splitting parameter at the root to refin", () => n.splitBy(0, "refin").click());
    await then("the path from the root is discarded and re-split by refin", async () => {
      expect(n.hash()).toBe("#narrow/refin");
      await expect(n.candidates()).toHaveCount(104);
      await expect(n.branch(0, "false")).toBeVisible();
    });
  });

  test("a parameter that is the same in every candidate is not offered for splitting", async ({ page }) => {
    const n = await given("#narrow/width=16/poly=0x8005 is open", () => NarrowPage.open(page, "#narrow/width=16/poly=0x8005"));
    await then("the node after poly offers neither width nor poly, but does offer init", async () => {
      await expect(n.splitBy(2, "width")).toHaveCount(0);
      await expect(n.splitBy(2, "poly")).toHaveCount(0);
      await expect(n.splitBy(2, "init")).toBeVisible();
    });
  });

  test("the branches of refin name the shift direction, so a right- or left-shift implementation can be looked up", async ({
    page,
  }) => {
    const n = await given("#narrow/refin, split by refin at the root, is open", () => NarrowPage.open(page, "#narrow/refin"));
    await then("refin = true says right shift and refin = false says left shift", async () => {
      await expect(n.branch(0, "true")).toContainText("右送り");
      await expect(n.branch(0, "false")).toContainText("左送り");
    });
  });

  test("a path that cannot be interpreted opens up to the point before it", async ({ page }) => {
    const n = await given("#narrow/width=16/poly=0x7, which contains a value with no candidates, is open", () =>
      NarrowPage.open(page, "#narrow/width=16/poly=0x7"),
    );
    await then("the path goes up to width=16", async () => {
      await expect(n.candidates()).toHaveCount(31);
      await expect(n.branch(0, "16")).toHaveClass(/on-path/);
    });
  });
});
