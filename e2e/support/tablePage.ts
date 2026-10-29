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
    await expect(t.root.first()).toBeVisible();
    return t;
  }

  get root(): Locator {
    return this.page.locator(".table-page");
  }

  /** The button of the playback switch that chooses mode: making a value, making the table, or using it. */
  mode(mode: "value" | "table" | "use"): Locator {
    return this.root.locator(`.play-mode button[data-mode="${mode}"]`);
  }

  /** The step counter of the playback controls, such as "8 / 8". */
  get counter(): Locator {
    return this.page.locator(".controls .counter");
  }

  /** The cells of table T that hold a value. */
  filledCells(): Locator {
    return this.cell().filter({ hasText: /\S/ });
  }

  /** The column and row headings of table T emphasized as the index being computed, column first. */
  emphasizedHeadings(): Locator {
    return this.root.locator(".crc-table th.index-heading");
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

  /** Whether the byte-by-byte card sits beside the table T, sharing its row. */
  async besideTable(): Promise<boolean> {
    const steps = (await this.root.locator(".page-columns > :first-child").boundingBox())!;
    const table = (await this.root.locator(".page-columns > :has(.crc-table)").boundingBox())!;
    return Math.abs(steps.y - table.y) < 1;
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

  /** The column headings of the clocks that make the selected value. */
  clockHeadings(): Locator {
    return this.root.locator(".entry-clocks thead th");
  }

  /** The rows of the 8 clocks that make the selected value. */
  clocks(): Locator {
    return this.root.locator(".entry-clocks tbody tr");
  }

  /**
   * The leading cell (the clock number) of the first clock: where the clocks start. The clock table keeps its width and scrolls
   * sideways on a narrow card, so its rows as a whole need not fit across the screen.
   */
  firstClockStart(): Locator {
    return this.clocks().first().locator(":scope > :first-child");
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
