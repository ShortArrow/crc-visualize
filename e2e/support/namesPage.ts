import { expect, type Locator, type Page } from "@playwright/test";

/** Drives and observes the naming page in terms of the name breakdown, families, aliases and parameters. */
export class NamesPage {
  private constructor(readonly page: Page) {}

  /** Opens the page with a query (such as "?poly=0x7") and a fragment (such as "#names/poly"). */
  static async open(page: Page, fragment = "#names", query = ""): Promise<NamesPage> {
    await page.goto(`/${query}${fragment}`);
    return NamesPage.shown(page);
  }

  /** Captures the naming page that is already open. */
  static async shown(page: Page): Promise<NamesPage> {
    const n = new NamesPage(page);
    await expect(n.root).toBeVisible();
    return n;
  }

  get root(): Locator {
    return this.page.locator(".names-page");
  }

  namePart(part: "head" | "width" | "origin"): Locator {
    return this.page.locator(`.name-parts [data-part="${part}"] b`);
  }

  /** The family table of poly (such as "0x1021"). */
  family(poly: string): Locator {
    return this.page.locator(`table.family[data-poly="${poly}"]`);
  }

  /** The col column (init, reflect, xorout) of the preset's row in a family table. */
  familyCell(poly: string, preset: string, col: "init" | "reflect" | "xorout"): Locator {
    return this.family(poly).locator(`tr[data-preset="${preset}"] td[data-col="${col}"]`);
  }

  /** The alias row in the alias table and in the table of ambiguous names. */
  aliasRow(alias: string): Locator {
    return this.page.locator(`.aliases tr[data-alias="${alias}"]`);
  }

  /** The parameter names written on the parameter-alias diagram. */
  callouts(): Locator {
    return this.page.locator(".param-map .callout-name");
  }

  callout(param: string): Locator {
    return this.page.locator(`.param-map [data-callout="${param}"] a`);
  }

  hoverCard(): Locator {
    return this.page.locator(".param-map .hover-card .card");
  }

  /** The parts of the parameter-alias diagram highlighted in the focused parameter's colour. */
  highlighted(): Locator {
    return this.page.locator(".param-map .param-hl");
  }

  paramRow(param: string): Locator {
    return this.page.locator(`#param-${param}`);
  }
}
