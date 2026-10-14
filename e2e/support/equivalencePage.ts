import { expect, type Locator, type Page } from "@playwright/test";

/** 置き換えのページを、置き換えの項目・両辺の値・分かることの言葉で観察する。 */
export class EquivalencePage {
  private constructor(readonly page: Page) {}

  /** query（"?width=99" など）を付けて開く。 */
  static async open(page: Page, query = ""): Promise<EquivalencePage> {
    await page.goto(`/${query}#equivalence`);
    return EquivalencePage.shown(page);
  }

  /** 開いている置き換えのページを捉える。 */
  static async shown(page: Page): Promise<EquivalencePage> {
    const e = new EquivalencePage(page);
    await expect(e.root).toBeVisible();
    return e;
  }

  get root(): Locator {
    return this.page.locator(".equivalence-page");
  }

  /** 置き換えの項目（refin・refout・rightShift・initPrefix・affine）。 */
  item(id: string): Locator {
    return this.root.locator(`.equivalence-item[data-id="${id}"]`);
  }

  /** 項目 id の左辺（元の設定）の CRC。 */
  left(id: string): Locator {
    return this.item(id).locator(".left-value");
  }

  /** 項目 id の右辺（置き換えた側）の CRC。 */
  right(id: string): Locator {
    return this.item(id).locator(".right-value");
  }

  /** 項目 id が今の設定に当てはまらない理由。 */
  notApplicable(id: string): Locator {
    return this.item(id).locator(".not-applicable");
  }

  /** 初期値と前置きの項目の前置き P。 */
  prefix(): Locator {
    return this.item("initPrefix").locator(".prefix-value");
  }

  /** 今の設定での送り方。data-direction に right・left・mixed を持つ。 */
  direction(): Locator {
    return this.root.locator(".current-direction");
  }

  /** 今の設定で、実装のコードに書かれる poly と init。 */
  codeConstants(): Locator {
    return this.root.locator(".code-constants");
  }

  /** 設定が不正なときの知らせ。 */
  invalid(): Locator {
    return this.root.locator(".invalid-config");
  }
}
