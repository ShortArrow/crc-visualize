import { expect, type Locator, type Page } from "@playwright/test";

/** Drives and observes the check page in terms of the received sequence, the two ways of checking, and the check value. */
export class CheckPage {
  private constructor(readonly page: Page) {}

  /** Opens the page with a query (such as "?width=99"). */
  static async open(page: Page, query = ""): Promise<CheckPage> {
    await page.goto(`/${query}#check`);
    return CheckPage.shown(page);
  }

  /** Captures the check page that is already open. */
  static async shown(page: Page): Promise<CheckPage> {
    const c = new CheckPage(page);
    await expect(c.root).toBeVisible();
    return c;
  }

  get root(): Locator {
    return this.page.locator(".check-page");
  }

  /** The bits of the received sequence. Given part, only those of the message or of the CRC. */
  bits(part?: "message" | "crc"): Locator {
    return this.root.locator(`.frame-row .bit-cell${part ? `.${part}` : ""}`);
  }

  /** The i-th (0-based) bit of the received sequence. Selecting it flips it. */
  bit(i: number): Locator {
    return this.root.locator(`.frame-row .bit-cell[data-index="${i}"]`);
  }

  /** A legend entry below the received sequence (message, crc, values, flipped). */
  legend(key: "message" | "crc" | "values" | "flipped"): Locator {
    return this.root.locator(`.frame-legend [data-key="${key}"]`);
  }

  /** The border colour of an element. */
  async borderColor(target: Locator): Promise<string> {
    return target.evaluate((el) => getComputedStyle(el).borderTopColor);
  }

  resetFlips(): Locator {
    return this.root.locator(".reset-flips");
  }

  /** A way of checking (recheck recomputes and compares, whole runs the whole codeword through). */
  method(id: "recheck" | "whole"): Locator {
    return this.root.locator(`.method[data-method="${id}"]`);
  }

  /** The verdict of check method id. Holds true or false in data-ok. */
  verdict(id: "recheck" | "whole"): Locator {
    return this.method(id).locator(".verdict");
  }

  /** The recomputed CRC of the message. */
  computed(): Locator {
    return this.method("recheck").locator(".computed");
  }

  /** The received CRC. */
  receivedCrc(): Locator {
    return this.method("recheck").locator(".received-crc");
  }

  /** The CRC of the whole received sequence. */
  wholeValue(): Locator {
    return this.method("whole").locator(".whole-value");
  }

  residue(): Locator {
    return this.method("whole").locator(".residue");
  }

  /** The catalogue's check value. */
  catalogueCheck(): Locator {
    return this.root.locator(".catalogue-check");
  }

  /** The CRC computed from the input 123456789. */
  computedCheck(): Locator {
    return this.root.locator(".computed-check");
  }

  invalid(): Locator {
    return this.root.locator(".invalid-config");
  }
}
