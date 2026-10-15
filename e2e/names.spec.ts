import { expect } from "@playwright/test";
import { NamesPage } from "./support/namesPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Page switching", () => {
  test("moving to the naming page and back leaves the visualizer settings unchanged", async ({ page }) => {
    const v = await given("the visualizer page is open with CRC-16/KERMIT selected", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await when("switching to the naming page in the activity bar", () => v.workbench.pageLink("names").click());
    await then("the URL fragment becomes #names and the naming page appears", async () => {
      expect(new URL(page.url()).hash).toBe("#names");
      await expect(page.locator(".names-page")).toBeVisible();
      await expect(page.locator(".lfsr:not(.param-map)")).toHaveCount(0);
    });
    await when("switching to the visualizer in the activity bar", () => v.workbench.pageLink("visualizer").click());
    await then("the visualizer page appears, still with CRC-16/KERMIT", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-16/KERMIT");
    });
  });
});

test.describe("Naming", () => {
  test("splits a full name into CRC, width and the latter name", async ({ page }) => {
    const n = await given("the naming page is open", () => NamesPage.open(page));
    await then("CRC-16/KERMIT splits into CRC, 16 and KERMIT", async () => {
      await expect(n.namePart("head")).toHaveText("CRC");
      await expect(n.namePart("width")).toHaveText("16");
      await expect(n.namePart("origin")).toHaveText("KERMIT");
    });
  });

  test("lists the family sharing a poly and highlights values differing from the first", async ({ page }) => {
    const n = await given("the naming page is open", () => NamesPage.open(page));
    await then("the poly 0x1021 family lists 6 presets", async () => {
      await expect(n.family("0x1021").locator("tbody tr")).toHaveCount(6);
    });
    await then("XMODEM highlights only init, IBM-SDLC highlights refin/refout and xorout", async () => {
      await expect(n.familyCell("0x1021", "CRC-16/XMODEM", "init")).toHaveClass(/differs/);
      await expect(n.familyCell("0x1021", "CRC-16/XMODEM", "xorout")).not.toHaveClass(/differs/);
      await expect(n.familyCell("0x1021", "CRC-16/IBM-SDLC", "reflect")).toHaveClass(/differs/);
      await expect(n.familyCell("0x1021", "CRC-16/IBM-SDLC", "xorout")).toHaveClass(/differs/);
    });
  });

  test("looks up the full name from an alias, and lists every candidate for names that differ by convention", async ({
    page,
  }) => {
    const n = await given("the naming page is open", () => NamesPage.open(page));
    await then("CRC-32C refers to CRC-32/ISCSI", async () => {
      await expect(n.aliasRow("CRC-32C").locator("td")).toHaveText("CRC-32/ISCSI");
    });
    await then("CRC-16-CCITT is one of KERMIT, IBM-3740 and XMODEM", async () => {
      await expect(n.aliasRow("CRC-16-CCITT").locator("td")).toHaveText("CRC-16/KERMIT、CRC-16/IBM-3740、CRC-16/XMODEM のどれか");
    });
  });
});

test.describe("Parameter-alias diagram", () => {
  test("only the parameter name is written at the end of each leader line", async ({ page }) => {
    const n = await given("the naming page is open", () => NamesPage.open(page));
    await then("only the 6 parameter names are listed", async () => {
      await expect(n.callouts()).toHaveText(["width", "poly", "init", "refin", "refout", "xorout"]);
    });
  });

  test("hovering a parameter name highlights where it acts and shows a card with its Japanese name and aliases", async ({
    page,
  }) => {
    const n = await given("the naming page is open", () => NamesPage.open(page));
    await then("before hovering there is no card and no highlight", async () => {
      await expect(n.hoverCard()).toHaveCount(0);
      await expect(n.highlighted()).toHaveCount(0);
    });
    await when("hovering poly", () => n.callout("poly").hover());
    await then(
      "a card with the generator polynomial and its aliases appears, and the tap gates and feedback wires are highlighted",
      async () => {
        await expect(n.hoverCard()).toContainText("生成多項式");
        await expect(n.hoverCard()).toContainText("polynomial");
        await expect(n.highlighted()).not.toHaveCount(0);
        await expect(page.locator(".param-map .gate.param-hl")).toHaveCount(2);
      },
    );
  });

  test("selecting a parameter name moves to its row in the table and highlights it", async ({ page }) => {
    const n = await given("the naming page is open", () => NamesPage.open(page));
    await when("selecting refin", () => n.callout("refin").click());
    await then("the URL fragment becomes #names/refin and the refin row is highlighted and visible", async () => {
      expect(new URL(page.url()).hash).toBe("#names/refin");
      await expect(n.paramRow("refin")).toHaveClass(/target/);
      await expect(n.paramRow("refin")).toBeInViewport();
      await expect(n.paramRow("poly")).not.toHaveClass(/target/);
    });
  });

  test("opening a URL pointing at a parameter row highlights that row", async ({ page }) => {
    const n = await given("#names/xorout is open", () => NamesPage.open(page, "#names/xorout"));
    await then("the xorout row is highlighted and visible", async () => {
      await expect(n.paramRow("xorout")).toHaveClass(/target/);
      await expect(n.paramRow("xorout")).toBeInViewport();
    });
  });
});
