import { expect, type Locator, type Page } from "@playwright/test";

/** Drives and observes the table page in terms of the table T, how a value is made, and the byte-at-a-time steps. */
export class TablePage {
  private constructor(readonly page: Page) {}

  /** Opens the page with a query (such as "?width=99"). */
  static async open(page: Page, query = ""): Promise<TablePage> {
    await page.goto(`/${query}#table`);
    return TablePage.shown(page);
  }

  /** Captures the table page that is already open. */
  static async shown(page: Page): Promise<TablePage> {
    const t = new TablePage(page);
    await expect(t.root).toBeVisible();
    return t;
  }

  get root(): Locator {
    return this.page.locator(".table-page");
  }

  /** The direction of the table, with right or left in data-direction. */
  direction(): Locator {
    return this.root.locator(".table-direction");
  }

  /** The update formula. */
  formula(): Locator {
    return this.root.locator(".update-formula");
  }

  /** Every cell of table T, or the cell for index i. */
  cell(i?: number): Locator {
    return this.root.locator(i === undefined ? ".crc-table .table-cell" : `.crc-table .table-cell[data-index="${i}"]`);
  }

  /** The cell highlighted as the index used by the selected step. */
  usedCell(): Locator {
    return this.root.locator(".crc-table .table-cell.used");
  }

  /** The note under the page heading. */
  note(): Locator {
    return this.root.locator(":scope > .note").first();
  }

  /** The value of name (a parameter, inputMode or input) in the sidebar's current settings. */
  currentSetting(name: string): Locator {
    return this.page.locator(`.current-settings [data-setting="${name}"] dd`);
  }

  /** The heading of how the selected value is made, such as "T[1] = 0x1189". */
  entryTitle(): Locator {
    return this.root.locator(".entry-title");
  }

  /** The rows of the 8 clocks that make the selected value. */
  clocks(): Locator {
    return this.root.locator(".entry-clocks tbody tr");
  }

  /** The rows of the byte-at-a-time computation, or row n (0-based). */
  step(n?: number): Locator {
    return this.root.locator(n === undefined ? ".table-steps .step-row" : `.table-steps .step-row[data-step="${n}"]`);
  }

  /** The CRC computed a byte at a time. */
  result(): Locator {
    return this.root.locator(".table-result");
  }

  /** The CRC computed a bit at a time. */
  bitwise(): Locator {
    return this.root.locator(".bitwise-result");
  }

  /** The reason the byte-at-a-time computation is not shown. */
  notBytes(): Locator {
    return this.root.locator(".not-bytes");
  }
}
