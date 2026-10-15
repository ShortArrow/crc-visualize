import { expect, type Locator, type Page } from "@playwright/test";

/** Drives and observes the redundancy page in terms of the sent codeword, the received sequence, the error, the verdict and the grid of sequences. */
export class RedundancyPage {
  private constructor(readonly page: Page) {}

  /** Opens the page with a fragment (such as "#redundancy/width=4/poly=0x3"). */
  static async open(page: Page, fragment = "#redundancy"): Promise<RedundancyPage> {
    await page.goto(`/${fragment}`);
    return RedundancyPage.shown(page);
  }

  /** Captures the redundancy page that is already open. */
  static async shown(page: Page): Promise<RedundancyPage> {
    const r = new RedundancyPage(page);
    await expect(r.root).toBeVisible();
    return r;
  }

  get root(): Locator {
    return this.page.locator(".redundancy-page");
  }

  /** The bits of the sent codeword. Given part, only those of the message or of the CRC. */
  sentBits(part?: "message" | "crc"): Locator {
    return this.root.locator(`.sent-row .bit-cell${part ? `.${part}` : ""}`);
  }

  /** The heading of the message or the CRC part of the sent codeword. */
  partLabel(part: "message" | "crc"): Locator {
    return this.root.locator(`.sent-row .part-label.${part}`);
  }

  /** The number of sequences and the number of codewords. */
  counts(): Locator {
    return this.root.locator(".space-counts");
  }

  /** The dots of the grid of all sequences. Given kind, only the codewords or the current received sequence. */
  gridDots(kind?: "codeword" | "received"): Locator {
    return this.root.locator(`.word-grid .word-dot${kind ? `.${kind}` : ""}`);
  }

  /** The i-th (0-based, highest degree first) bit of the received sequence. Selecting it flips it. */
  receivedBit(i: number): Locator {
    return this.root.locator(`.received-row .bit-cell[data-index="${i}"]`);
  }

  /** The error e. */
  error(): Locator {
    return this.root.locator(".error-bits");
  }

  burstLength(): Locator {
    return this.root.locator(".burst-length");
  }

  /** The remainder of the received sequence divided by g(x). */
  remainder(): Locator {
    return this.root.locator(".received-remainder");
  }

  /** The verdict. Holds clean, detected or missed in data-verdict. */
  verdict(): Locator {
    return this.root.locator(".verdict");
  }

  resetError(): Locator {
    return this.root.locator(".reset-error");
  }

  missedExample(): Locator {
    return this.root.locator(".missed-example");
  }

  hash(): string {
    return new URL(this.page.url()).hash;
  }
}
