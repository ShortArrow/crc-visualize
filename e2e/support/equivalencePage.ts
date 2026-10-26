import { expect, type Locator, type Page } from "@playwright/test";

/** Observes the substitution page in terms of the substitution items, the values on both sides, and what can be inferred. */
export class EquivalencePage {
  private constructor(readonly page: Page) {}

  /** Opens the page with a query (such as "?width=99"). */
  static async open(page: Page, query = ""): Promise<EquivalencePage> {
    await page.goto(`/${query}#equivalence`);
    return EquivalencePage.shown(page);
  }

  /** Captures the substitution page that is already open. */
  static async shown(page: Page): Promise<EquivalencePage> {
    const e = new EquivalencePage(page);
    await expect(e.root.first()).toBeVisible();
    return e;
  }

  get root(): Locator {
    return this.page.locator(".equivalence-page");
  }

  /** A substitution item (refin, refout, rightShift, initPrefix, affine). */
  item(id: string): Locator {
    return this.root.locator(`.equivalence-item[data-id="${id}"]`);
  }

  /** The CRC on the left-hand side (the original settings) of item id. */
  left(id: string): Locator {
    return this.item(id).locator(".left-value");
  }

  /** The CRC on the right-hand side (the substituted side) of item id. */
  right(id: string): Locator {
    return this.item(id).locator(".right-value");
  }

  /** Why item id does not apply to the current settings. */
  notApplicable(id: string): Locator {
    return this.item(id).locator(".not-applicable");
  }

  /** The prefix P of the init-and-prefix item. */
  prefix(): Locator {
    return this.item("initPrefix").locator(".prefix-value");
  }

  /** The shift direction under the current settings. Holds right, left or mixed in data-direction. */
  direction(): Locator {
    return this.root.locator(".current-direction");
  }

  /** The poly and init written in the implementation's code under the current settings. */
  codeConstants(): Locator {
    return this.root.locator(".code-constants");
  }

  /** The notice shown when the settings are invalid. */
  invalid(): Locator {
    return this.root.locator(".invalid-config");
  }
}
