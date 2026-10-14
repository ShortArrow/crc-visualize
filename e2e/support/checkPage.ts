import { expect, type Locator, type Page } from "@playwright/test";

/** 検査のページを、受け取った並び・2 つの確かめ方・検査値の言葉で操作し観察する。 */
export class CheckPage {
  private constructor(readonly page: Page) {}

  /** query（"?width=99" など）を付けて開く。 */
  static async open(page: Page, query = ""): Promise<CheckPage> {
    await page.goto(`/${query}#check`);
    return CheckPage.shown(page);
  }

  /** 開いている検査のページを捉える。 */
  static async shown(page: Page): Promise<CheckPage> {
    const c = new CheckPage(page);
    await expect(c.root).toBeVisible();
    return c;
  }

  get root(): Locator {
    return this.page.locator(".check-page");
  }

  /** 受け取った並びのビット。part を渡すと本文（message）か CRC（crc）のものだけ。 */
  bits(part?: "message" | "crc"): Locator {
    return this.root.locator(`.frame-row .bit-cell${part ? `.${part}` : ""}`);
  }

  /** 受け取った並びの i 番目（0 始まり）のビット。選ぶと反転する。 */
  bit(i: number): Locator {
    return this.root.locator(`.frame-row .bit-cell[data-index="${i}"]`);
  }

  resetFlips(): Locator {
    return this.root.locator(".reset-flips");
  }

  /** 確かめ方（recheck は計算し直して比べる、whole は符号語ごと通す）。 */
  method(id: "recheck" | "whole"): Locator {
    return this.root.locator(`.method[data-method="${id}"]`);
  }

  /** 確かめ方 id の判定。data-ok に true か false を持つ。 */
  verdict(id: "recheck" | "whole"): Locator {
    return this.method(id).locator(".verdict");
  }

  /** 計算し直した本文の CRC。 */
  computed(): Locator {
    return this.method("recheck").locator(".computed");
  }

  /** 受け取った CRC。 */
  receivedCrc(): Locator {
    return this.method("recheck").locator(".received-crc");
  }

  /** 受け取った並び全体の CRC。 */
  wholeValue(): Locator {
    return this.method("whole").locator(".whole-value");
  }

  residue(): Locator {
    return this.method("whole").locator(".residue");
  }

  /** カタログの検査値。 */
  catalogueCheck(): Locator {
    return this.root.locator(".catalogue-check");
  }

  /** 入力 123456789 で計算した CRC。 */
  computedCheck(): Locator {
    return this.root.locator(".computed-check");
  }

  invalid(): Locator {
    return this.root.locator(".invalid-config");
  }
}
