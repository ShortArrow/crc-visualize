import { expect, type Locator, type Page } from "@playwright/test";

/** 絞り込みのページを、木の節・分けるパラメータ・枝・候補の言葉で操作し観察する。 */
export class NarrowPage {
  private constructor(readonly page: Page) {}

  /** fragment（"#narrow/width=16" など）を付けて開く。 */
  static async open(page: Page, fragment = "#narrow"): Promise<NarrowPage> {
    await page.goto(`/${fragment}`);
    return NarrowPage.shown(page);
  }

  /** 開いている絞り込みのページを捉える。 */
  static async shown(page: Page): Promise<NarrowPage> {
    const n = new NarrowPage(page);
    await expect(n.root).toBeVisible();
    return n;
  }

  get root(): Locator {
    return this.page.locator(".narrow-page");
  }

  /** 根からの深さ depth（0 始まり）の節。 */
  node(depth: number): Locator {
    return this.page.locator(`.narrow-node[data-depth="${depth}"]`);
  }

  /** depth の節で、分けるパラメータに param を選ぶ操作。 */
  splitBy(depth: number, param: string): Locator {
    return this.node(depth).locator(`:scope > .split-by a[data-param="${param}"]`);
  }

  /** depth の節の、値の表記が value の枝。 */
  branch(depth: number, value: string): Locator {
    return this.node(depth).locator(`:scope > .branches > .branch[data-value="${value}"]`);
  }

  /** サイドバーの残りの候補の正式名。 */
  candidates(): Locator {
    return this.page.locator(".sidebar .narrow-candidates li");
  }

  /** 候補が 1 つに決まったときの「可視化で開く」（エディタ領域の）。 */
  openInVisualizer(): Locator {
    return this.root.locator(".narrow-open");
  }

  hash(): string {
    return new URL(this.page.url()).hash;
  }
}
