import { expect, type Locator, type Page } from "@playwright/test";

/** Drives and observes the narrowing page in terms of tree nodes, the splitting parameter, branches and candidates. */
export class NarrowPage {
  private constructor(readonly page: Page) {}

  /** Opens the page with a fragment (such as "#narrow/width=16"). */
  static async open(page: Page, fragment = "#narrow"): Promise<NarrowPage> {
    await page.goto(`/${fragment}`);
    return NarrowPage.shown(page);
  }

  /** Captures the narrowing page that is already open. */
  static async shown(page: Page): Promise<NarrowPage> {
    const n = new NarrowPage(page);
    await expect(n.root.first()).toBeVisible();
    return n;
  }

  get root(): Locator {
    return this.page.locator(".narrow-page");
  }

  /** The node at depth (0-based) from the root. */
  node(depth: number): Locator {
    return this.page.locator(`.narrow-node[data-depth="${depth}"]`);
  }

  /** The control that picks param as the splitting parameter at the node at depth. */
  splitBy(depth: number, param: string): Locator {
    return this.node(depth).locator(`:scope > .split-by a[data-param="${param}"]`);
  }

  /** The branch of the node at depth whose value is written as value. */
  branch(depth: number, value: string): Locator {
    return this.node(depth).locator(`:scope > .branches > .branch[data-value="${value}"]`);
  }

  /** The full names of the remaining candidates in the sidebar. */
  candidates(): Locator {
    return this.page.locator(".sidebar .narrow-candidates li");
  }

  /** The full name shown in the editor area once a single candidate remains. */
  result(): Locator {
    return this.root.locator(".narrow-result .preset-name");
  }

  /** The "open in visualizer" link (in the editor area) shown once a single candidate remains. */
  openInVisualizer(): Locator {
    return this.root.locator(".narrow-open");
  }

  hash(): string {
    return new URL(this.page.url()).hash;
  }
}
