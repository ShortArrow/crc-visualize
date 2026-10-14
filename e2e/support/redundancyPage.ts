import { expect, type Locator, type Page } from "@playwright/test";

/** 冗長のページを、送った符号語・受け取った並び・誤り・判定・並びの格子の言葉で操作し観察する。 */
export class RedundancyPage {
  private constructor(readonly page: Page) {}

  /** fragment（"#redundancy/width=4/poly=0x3" など）を付けて開く。 */
  static async open(page: Page, fragment = "#redundancy"): Promise<RedundancyPage> {
    await page.goto(`/${fragment}`);
    return RedundancyPage.shown(page);
  }

  /** 開いている冗長のページを捉える。 */
  static async shown(page: Page): Promise<RedundancyPage> {
    const r = new RedundancyPage(page);
    await expect(r.root).toBeVisible();
    return r;
  }

  get root(): Locator {
    return this.page.locator(".redundancy-page");
  }

  /** 送った符号語のビット。part を渡すと本文（message）か CRC（crc）のものだけ。 */
  sentBits(part?: "message" | "crc"): Locator {
    return this.root.locator(`.sent-row .bit-cell${part ? `.${part}` : ""}`);
  }

  /** 送った符号語の、本文（message）か CRC（crc）の見出し。 */
  partLabel(part: "message" | "crc"): Locator {
    return this.root.locator(`.sent-row .part-label.${part}`);
  }

  /** 並びの数と符号語の数。 */
  counts(): Locator {
    return this.root.locator(".space-counts");
  }

  /** 全ての並びの格子の点。kind を渡すと符号語（codeword）か、今の受け取った並び（received）だけ。 */
  gridDots(kind?: "codeword" | "received"): Locator {
    return this.root.locator(`.word-grid .word-dot${kind ? `.${kind}` : ""}`);
  }

  /** 受け取った並びの i 番目（0 始まり、最高次から）のビット。選ぶと反転する。 */
  receivedBit(i: number): Locator {
    return this.root.locator(`.received-row .bit-cell[data-index="${i}"]`);
  }

  /** 誤り e。 */
  error(): Locator {
    return this.root.locator(".error-bits");
  }

  burstLength(): Locator {
    return this.root.locator(".burst-length");
  }

  /** 受け取った並びを g(x) で割った余り。 */
  remainder(): Locator {
    return this.root.locator(".received-remainder");
  }

  /** 判定。data-verdict に clean・detected・missed を持つ。 */
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
