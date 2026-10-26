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
    await expect(n.root.first()).toBeVisible();
    return n;
  }

  get root(): Locator {
    return this.page.locator(".names-page");
  }

  namePart(part: "head" | "width" | "origin"): Locator {
    return this.page.locator(`.name-parts [data-part="${part}"] b`);
  }

  /**
   * How the family tables sit in their card. widths: the distinct widths of the tables (px, rounded). rightGap: the space (px) between the
   * right edge of the furthest table and the right edge of the card's content box. wrapped: the cells whose text runs onto a second line.
   */
  familyLayout(): Promise<{ widths: number[]; rightGap: number; wrapped: number }> {
    return this.page.evaluate(() => {
      const card = document.querySelector(".families")!;
      const style = getComputedStyle(card);
      const inner = card.getBoundingClientRect().right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth);
      const tables = [...card.querySelectorAll("table.family")].map((t) => t.getBoundingClientRect());
      return {
        widths: [...new Set(tables.map((r) => Math.round(r.width)))],
        rightGap: inner - Math.max(...tables.map((r) => r.right)),
        wrapped: [...card.querySelectorAll("table.family :is(th, td)")].filter((cell) => {
          const range = document.createRange();
          range.selectNodeContents(cell);
          return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1;
        }).length,
      };
    });
  }

  /** The number of cells in the alias table whose text runs onto a second line. */
  aliasWrapped(): Promise<number> {
    return this.page.evaluate(
      () =>
        [...document.querySelectorAll(".alias-index tbody :is(th, td)")].filter((cell) => {
          const range = document.createRange();
          range.selectNodeContents(cell);
          return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1;
        }).length,
    );
  }

  /** Whether the note of the name breakdown sits beside the parts (its top is above the bottom of the parts) rather than below them. */
  noteBesideParts(): Promise<boolean> {
    return this.page.evaluate(() => {
      const parts = document.querySelector(".name-parts .parts")!.getBoundingClientRect();
      const note = document.querySelector(".name-parts .note")!.getBoundingClientRect();
      return note.top < parts.bottom && note.left >= parts.right;
    });
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
