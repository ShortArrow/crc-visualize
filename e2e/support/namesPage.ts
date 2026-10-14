import { expect, type Locator, type Page } from "@playwright/test";

/** 名前の規則のページを、名前の分解・一族・別名・パラメータの言葉で操作し観察する。 */
export class NamesPage {
  private constructor(readonly page: Page) {}

  /** query（"?poly=0x7" など）と fragment（"#names/poly" など）を付けて開く。 */
  static async open(page: Page, fragment = "#names", query = ""): Promise<NamesPage> {
    await page.goto(`/${query}${fragment}`);
    return NamesPage.shown(page);
  }

  /** 開いている名前の規則のページを捉える。 */
  static async shown(page: Page): Promise<NamesPage> {
    const n = new NamesPage(page);
    await expect(n.root).toBeVisible();
    return n;
  }

  get root(): Locator {
    return this.page.locator(".names-page");
  }

  namePart(part: "head" | "width" | "origin"): Locator {
    return this.page.locator(`.name-parts [data-part="${part}"] b`);
  }

  /** poly（"0x1021" など）の一族の表。 */
  family(poly: string): Locator {
    return this.page.locator(`table.family[data-poly="${poly}"]`);
  }

  /** 一族の表の、preset の行の col 列（init・reflect・xorout）。 */
  familyCell(poly: string, preset: string, col: "init" | "reflect" | "xorout"): Locator {
    return this.family(poly).locator(`tr[data-preset="${preset}"] td[data-col="${col}"]`);
  }

  /** 別名の対応表と、割れる呼び名の表の、alias の行。 */
  aliasRow(alias: string): Locator {
    return this.page.locator(`.aliases tr[data-alias="${alias}"]`);
  }

  /** パラメータ名の別名の図に書いたパラメータ名。 */
  callouts(): Locator {
    return this.page.locator(".param-map .callout-name");
  }

  callout(param: string): Locator {
    return this.page.locator(`.param-map [data-callout="${param}"] a`);
  }

  hoverCard(): Locator {
    return this.page.locator(".param-map .hover-card .card");
  }

  /** パラメータ名の別名の図で、注目中のパラメータの色で強調されている部品。 */
  highlighted(): Locator {
    return this.page.locator(".param-map .param-hl");
  }

  paramRow(param: string): Locator {
    return this.page.locator(`#param-${param}`);
  }
}
