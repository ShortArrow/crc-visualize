import { expect, type Locator, type Page } from "@playwright/test";

export type StepKind = "init" | "reflectIn" | "feedback" | "shift" | "xor" | "reflectOut" | "xorOut" | "done";

const YELLOW = "rgb(229, 192, 123)";
const RED = "rgb(255, 92, 92)";

/**
 * 既定のプリセット CRC-3/TUTORIAL（poly 0x3、入力 10101）のステップ列。
 * 1 番目のクロックは feedback 1、2 番目は feedback 0。
 */
export const TUTORIAL_STEPS = 15;

/** 可視化の画面を、ステップ・図・コード・経過の言葉で操作し観察する。 */
export class Visualizer {
  private constructor(readonly page: Page) {}

  /** query（"?rate=0.25" など）を付けて開き、先頭のステップにいる状態にする。 */
  static async open(page: Page, query = ""): Promise<Visualizer> {
    await page.goto(`/${query}`);
    const v = new Visualizer(page);
    await expect(v.counter).toHaveText(/^1 \//);
    return v;
  }

  get counter(): Locator {
    return this.page.locator(".counter");
  }

  /** 表示中のステップの種類。 */
  stepKind(): Promise<string | null> {
    return this.page.locator("svg.lfsr").getAttribute("data-step");
  }

  /** 1 ステップ進め、表示が切り替わるまで待つ。 */
  async stepForward(times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      const before = await this.counter.textContent();
      await this.page.keyboard.press("ArrowRight");
      await expect(this.counter).not.toHaveText(before!);
    }
  }

  async stepBack(): Promise<void> {
    const before = await this.counter.textContent();
    await this.page.keyboard.press("ArrowLeft");
    await expect(this.counter).not.toHaveText(before!);
  }

  async goToEnd(): Promise<void> {
    await this.page.keyboard.press("End");
    await expect(this.counter).toHaveText(/^(\d+) \/ \1$/);
  }

  /** 今の位置から進め、種類 kind の nth 番目（1 始まり、今の位置を含む）のステップで止まる。 */
  async goTo(kind: StepKind, nth = 1): Promise<void> {
    let seen = 0;
    for (;;) {
      if ((await this.stepKind()) === kind && ++seen === nth) return;
      const [at, total] = (await this.counter.textContent())!.split(" / ");
      if (at === total) throw new Error(`${kind} の ${nth} 番目のステップがありません`);
      await this.stepForward();
    }
  }

  readonly diagram = {
    root: () => this.page.locator("svg.lfsr"),
    wire: (name: string) => this.page.locator(`.lfsr [data-wire="${name}"]`),
    /** 配線 name のうち、粒の後ろから塗られた割合（0〜1）。 */
    painted: (name: string) =>
      this.page
        .locator(`.lfsr [data-wire="${name}"] .trail`)
        .evaluate((el) => 1 - parseFloat(getComputedStyle(el).strokeDashoffset)),
    /** 粒と配線の塗りのアニメーション（WAAPI）を取り除き、それらが始まる前の最初の描画の状態にする。 */
    withoutMotion: () =>
      this.page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition))
          .forEach((a) => a.cancel()),
      ),
    particles: () => this.page.locator(".lfsr .particle"),
    particle: (route: string) => this.page.locator(`.lfsr .particle[data-route="${route}"]`),
    gate: (id: "input" | number) => this.page.locator(`.gate[data-gate="${id}"]`),
    /** ゲートが計算中の色（黄）で点いているか。 */
    gateLit: (id: "input" | number) =>
      this.page.locator(`.gate[data-gate="${id}"] circle`).evaluate((el, y) => getComputedStyle(el).stroke === y, YELLOW),
    register: (bit: number) => this.page.locator(`.reg[data-bit="${bit}"]`),
    /** r[bit] の見た目（枠・塗り・数字の色）。 */
    registerLook: (bit: number) =>
      this.page.locator(`.reg[data-bit="${bit}"]`).evaluate((el) => {
        const rect = getComputedStyle(el.querySelector("rect")!);
        const digit = getComputedStyle(el.querySelector(".reg-bit:not(.flip-old)")!);
        return [rect.stroke, rect.fill, digit.fill].join(" ");
      }),
    /** shift で桁あふれして左へ抜ける値。 */
    dropped: () => this.page.locator(".reg .drop"),
    upcoming: () => this.page.locator(".lfsr .upcoming"),
    /** shift で隣の箱から r[bit] へ滑り込む値。 */
    sliding: (bit: number) => this.page.locator(`.reg[data-bit="${bit}"] .reg-bit.slide`),
    /** target のアニメーションを止めて progress（0〜1）の時点に合わせ、その時点の左右の端（px）と不透明度を返す。 */
    frameAt: (target: Locator, progress: number) =>
      target.evaluate((el, p) => {
        const anims = el.getAnimations();
        const duration = anims[0]!.effect!.getComputedTiming().duration as number;
        anims.forEach((a) => {
          a.pause();
          a.currentTime = duration * p;
        });
        const { left, right } = el.getBoundingClientRect();
        return { left, right, opacity: Number(getComputedStyle(el).opacity) };
      }, progress),
    /** target が始めから progress（0〜1）の時点までに横へ動いた距離（px、左が負）。 */
    travelX: async (target: Locator, progress: number) =>
      (await this.diagram.frameAt(target, progress)).left - (await this.diagram.frameAt(target, 0)).left,
    /** ゲートの円の左右の端（px）。 */
    gateEdges: (id: "input" | number) =>
      this.page.locator(`.gate[data-gate="${id}"] circle`).evaluate((el) => {
        const { left, right } = el.getBoundingClientRect();
        return { left, right };
      }),
    feedbackBox: () => this.page.locator(".lfsr .fb-box"),
    feedbackValue: () => this.page.locator(".lfsr .fb-box .reg-bit"),
    /** feedback の箱に値が見えているか（裏返しの途中でない）。 */
    feedbackShown: () =>
      this.page.locator(".lfsr .fb-box .reg-bit").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d > 0.5),
    /** feedback の箱が値 1 の色（赤）で塗られているか。 */
    feedbackRed: () =>
      this.page.locator(".lfsr .fb-box rect").evaluate((el, r) => getComputedStyle(el).stroke === r, RED),
  };

  readonly code = {
    activeLine: () => this.page.locator(".code-line.active"),
    line: (text: string) => this.page.locator(".code-line", { hasText: text }),
    skippedLine: () => this.page.locator(".code-line.skipped"),
    disabledLineOf: (param: string) =>
      this.page.locator(".code-line.disabled", { has: this.page.locator(`.chip[data-param="${param}"]`) }),
    chip: (param: string) => this.page.locator(`.chip[data-param="${param}"]`),
  };

  readonly log = {
    entries: () => this.page.locator(".log-entry"),
    latest: () => this.page.locator(".log-entry.latest"),
    titleSize: (i: number) =>
      this.page.locator(".log-entry").nth(i).locator(".log-title").evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  };

  readonly settings = {
    preset: () => this.page.getByLabel("プリセット"),
    field: (label: string) => this.page.getByLabel(label, { exact: true }),
    param: (name: string) => this.page.locator(`label[data-param="${name}"]`),
    help: () => this.page.locator(".param-help"),
    currentHelp: () => this.page.locator(".param-help .current"),
    speedMode: () => this.page.getByTitle("速度モード"),
    rate: () => this.page.getByTitle("速度倍率"),
    loop: () => this.page.getByTitle("ループ再生（L）"),
    play: () => this.page.getByTitle("再生 / 一時停止（Space）"),
    query: () => new URL(this.page.url()).searchParams,
    widthToggle: () => this.page.locator(".width-toggle"),
    /** 内容（main）の横幅と画面の横幅（px）。 */
    widths: () =>
      this.page.locator("main").evaluate((el) => ({ content: el.getBoundingClientRect().width, view: innerWidth })),
  };
}
