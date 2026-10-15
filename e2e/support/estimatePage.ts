import { expect, type Locator, type Page } from "@playwright/test";

/** Drives and observes the estimation page in terms of the pairs, the search and its candidates. */
export class EstimatePage {
  private constructor(readonly page: Page) {}

  /** Opens the estimation page. */
  static async open(page: Page): Promise<EstimatePage> {
    await page.goto("/#estimate");
    return EstimatePage.shown(page);
  }

  /** Captures the estimation page that is already open. */
  static async shown(page: Page): Promise<EstimatePage> {
    const e = new EstimatePage(page);
    await expect(e.root).toBeVisible();
    return e;
  }

  get root(): Locator {
    return this.page.locator(".estimate-page");
  }

  /** The rows of pairs, or row n (0-based). */
  row(n?: number): Locator {
    return this.root.locator(n === undefined ? ".sample-row" : `.sample-row[data-row="${n}"]`);
  }

  /** Fills row n with data and its CRC, adding rows as needed. */
  async fill(n: number, data: string, crc: string): Promise<void> {
    while ((await this.row().count()) <= n) await this.root.locator(".add-row").click();
    await this.row(n).locator(".sample-data").fill(data);
    await this.row(n).locator(".sample-crc").fill(crc);
  }

  format(): Locator {
    return this.root.locator("select.data-format");
  }

  width(): Locator {
    return this.root.locator("input.estimate-width");
  }

  search(): Locator {
    return this.root.locator(".run-search");
  }

  /** Presets from the catalogue that match every pair. */
  catalogueMatches(): Locator {
    return this.root.locator(".catalogue-matches li");
  }

  /** The state of the brute force, with ok, tooWide or needPair in data-status. */
  bruteStatus(): Locator {
    return this.root.locator(".brute-status");
  }

  /** The brute-force candidate rows. */
  candidates(): Locator {
    return this.root.locator(".candidates tbody tr");
  }

  /** Errors shown in the fields of row n. */
  errors(n: number): Locator {
    return this.row(n).locator(".field-error");
  }
}
