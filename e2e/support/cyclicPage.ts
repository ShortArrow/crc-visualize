import { expect, type Locator, type Page } from "@playwright/test";

/** 巡回のページを、符号語の輪・状態の輪・回す操作・生成多項式の一覧の言葉で操作し観察する。 */
export class CyclicPage {
  private constructor(readonly page: Page) {}

  /** fragment（"#cyclic/width=4/poly=0x3" など）を付けて開く。 */
  static async open(page: Page, fragment = "#cyclic"): Promise<CyclicPage> {
    await page.goto(`/${fragment}`);
    return CyclicPage.shown(page);
  }

  /** 開いている巡回のページを捉える。 */
  static async shown(page: Page): Promise<CyclicPage> {
    const c = new CyclicPage(page);
    await expect(c.root).toBeVisible();
    return c;
  }

  get root(): Locator {
    return this.page.locator(".cyclic-page");
  }

  /** 符号語の輪のビット。 */
  wordBits(): Locator {
    return this.root.locator(".word-ring .ring-bit");
  }

  /** 回したビット列（次数の大きい方から）。 */
  word(): Locator {
    return this.root.locator(".cyclic-word");
  }

  /** 回したビット列を g(x) で割った余り。 */
  remainder(): Locator {
    return this.root.locator(".cyclic-remainder");
  }

  /** 状態の輪の状態。 */
  states(): Locator {
    return this.root.locator(".state-ring .ring-state");
  }

  /** 状態の輪で強調している状態。 */
  currentState(): Locator {
    return this.root.locator(".state-ring .ring-state.current");
  }

  /** x を 1 回掛ける（▶）。 */
  forward(): Locator {
    return this.root.locator(".rotate-forward");
  }

  /** x で 1 回割る（◀）。 */
  back(): Locator {
    return this.root.locator(".rotate-back");
  }

  /** サイドバーの生成多項式の一覧で、width と poly（"0xF" など）のもの。 */
  generator(width: number, poly: string): Locator {
    return this.page.locator(`.sidebar .generator-list a[data-generator="${width}/${poly}"]`);
  }

  hash(): string {
    return new URL(this.page.url()).hash;
  }
}
