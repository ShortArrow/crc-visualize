import { expect, type Locator, type Page } from "@playwright/test";

/** Drives and observes the cyclic page in terms of the codeword ring, the state ring, rotation, and the list of generator polynomials. */
export class CyclicPage {
  private constructor(readonly page: Page) {}

  /** Opens the page with a fragment (such as "#cyclic/width=4/poly=0x3"). */
  static async open(page: Page, fragment = "#cyclic"): Promise<CyclicPage> {
    await page.goto(`/${fragment}`);
    return CyclicPage.shown(page);
  }

  /** Captures the cyclic page that is already open. */
  static async shown(page: Page): Promise<CyclicPage> {
    const c = new CyclicPage(page);
    await expect(c.root).toBeVisible();
    return c;
  }

  get root(): Locator {
    return this.page.locator(".cyclic-page");
  }

  /** The bits of the codeword ring. */
  wordBits(): Locator {
    return this.root.locator(".word-ring .ring-bit");
  }

  /** The rotated bit sequence (highest degree first). */
  word(): Locator {
    return this.root.locator(".cyclic-word");
  }

  /** The remainder of the rotated bit sequence divided by g(x). */
  remainder(): Locator {
    return this.root.locator(".cyclic-remainder");
  }

  /** The states of the state ring. */
  states(): Locator {
    return this.root.locator(".state-ring .ring-state");
  }

  /** The state highlighted in the state ring. */
  currentState(): Locator {
    return this.root.locator(".state-ring .ring-state.current");
  }

  /** Multiplies by x once (▶). */
  forward(): Locator {
    return this.root.locator(".rotate-forward");
  }

  /** Divides by x once (◀). */
  back(): Locator {
    return this.root.locator(".rotate-back");
  }

  /** The entry for width and poly (such as "0xF") in the sidebar's list of generator polynomials. */
  generator(width: number, poly: string): Locator {
    return this.page.locator(`.sidebar .generator-list a[data-generator="${width}/${poly}"]`);
  }

  hash(): string {
    return new URL(this.page.url()).hash;
  }
}
