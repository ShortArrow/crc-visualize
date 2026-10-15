import { expect, type Locator, type Page } from "@playwright/test";

export type StepKind = "init" | "reflectIn" | "feedback" | "shift" | "xor" | "reflectOut" | "xorOut" | "done";

const YELLOW = "rgb(229, 192, 123)";
const RED = "rgb(255, 92, 92)";

/**
 * The step sequence of the default preset CRC-3/TUTORIAL (poly 0x3, input 10101).
 * The first clock has feedback 1, the second feedback 0.
 */
export const TUTORIAL_STEPS = 15;

/** Drives and observes the visualizer page in terms of steps, the diagram, the code and the log. */
export class Visualizer {
  private constructor(readonly page: Page) {}

  /** Drives the workbench (activity bar, sidebar, status bar) on whatever page is open, without waiting for the visualizer. */
  static on(page: Page): Visualizer {
    return new Visualizer(page);
  }

  /** Opens the page with a query (such as "?rate=0.25") and waits at the first step. */
  static async open(page: Page, query = ""): Promise<Visualizer> {
    await page.goto(`/${query}`);
    const v = new Visualizer(page);
    await expect(v.counter).toHaveText(/^1 \//);
    return v;
  }

  get counter(): Locator {
    return this.page.locator(".counter");
  }

  /** The kind of the step shown. */
  stepKind(): Promise<string | null> {
    return this.page.locator("svg.lfsr").getAttribute("data-step");
  }

  /** Advances one step and waits for the display to change. */
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

  /** Advances from the current position and stops at the nth (1-based, counting the current position) step of kind. */
  async goTo(kind: StepKind, nth = 1): Promise<void> {
    let seen = 0;
    for (;;) {
      if ((await this.stepKind()) === kind && ++seen === nth) return;
      const [at, total] = (await this.counter.textContent())!.split(" / ");
      if (at === total) throw new Error(`There is no step number ${nth} of kind ${kind}`);
      await this.stepForward();
    }
  }

  readonly diagram = {
    root: () => this.page.locator("svg.lfsr"),
    wire: (name: string) => this.page.locator(`.lfsr [data-wire="${name}"]`),
    /** The fraction (0 to 1) of wire name painted behind the particle. */
    painted: (name: string) =>
      this.page
        .locator(`.lfsr [data-wire="${name}"] .trail`)
        .evaluate((el) => 1 - parseFloat(getComputedStyle(el).strokeDashoffset)),
    /** Removes the particle and wire-painting animations (WAAPI), leaving the first render before they start. */
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
    /** Whether the gate is lit in the computing colour (yellow). */
    gateLit: (id: "input" | number) =>
      this.page.locator(`.gate[data-gate="${id}"] circle`).evaluate((el, y) => getComputedStyle(el).stroke === y, YELLOW),
    register: (bit: number) => this.page.locator(`.reg[data-bit="${bit}"]`),
    /** The look of r[bit] (border, fill and digit colour). */
    registerLook: (bit: number) =>
      this.page.locator(`.reg[data-bit="${bit}"]`).evaluate((el) => {
        const rect = getComputedStyle(el.querySelector("rect")!);
        const digit = getComputedStyle(el.querySelector(".reg-bit:not(.flip-old)")!);
        return [rect.stroke, rect.fill, digit.fill].join(" ");
      }),
    /** The value that overflows on shift and leaves to the left. */
    dropped: () => this.page.locator(".reg .drop"),
    upcoming: () => this.page.locator(".lfsr .upcoming"),
    /** The value that slides into r[bit] from the neighbouring box on shift. */
    sliding: (bit: number) => this.page.locator(`.reg[data-bit="${bit}"] .reg-bit.slide`),
    /** Pauses target's animations at progress (0 to 1) and returns its left and right edges (px) and opacity at that point. */
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
    /** The horizontal distance (px, negative to the left) target moves from the start to progress (0 to 1). */
    travelX: async (target: Locator, progress: number) =>
      (await this.diagram.frameAt(target, progress)).left - (await this.diagram.frameAt(target, 0)).left,
    /** The left and right edges (px) of the gate's circle. */
    gateEdges: (id: "input" | number) =>
      this.page.locator(`.gate[data-gate="${id}"] circle`).evaluate((el) => {
        const { left, right } = el.getBoundingClientRect();
        return { left, right };
      }),
    feedbackBox: () => this.page.locator(".lfsr .fb-box"),
    feedbackValue: () => this.page.locator(".lfsr .fb-box .reg-bit"),
    /** Whether the feedback box shows its value (not mid-flip). */
    feedbackShown: () =>
      this.page.locator(".lfsr .fb-box .reg-bit").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d > 0.5),
    /** Whether the feedback box is painted in the colour of value 1 (red). */
    feedbackRed: () => this.page.locator(".lfsr .fb-box rect").evaluate((el, r) => getComputedStyle(el).stroke === r, RED),
  };

  readonly code = {
    /** The selector of the language the code is written in. */
    langSelect: () => this.page.locator(".software .code-lang"),
    /** The code part of each line (excluding the line number and the note). */
    texts: () => this.page.locator(".code-text"),
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
      this.page
        .locator(".log-entry")
        .nth(i)
        .locator(".log-title")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    /**
     * Once the log's previous motion has finished, moves the step with key (such as ArrowRight) and returns whether each entry is moving in the very next frame.
     * moving is the entry's change of position (WAAPI); resizing is the change of its title's font size (a CSS transition).
     */
    motionAfter: (key: string) =>
      this.page.evaluate(async (k) => {
        const log = document.querySelector(".log")!;
        await Promise.all(log.getAnimations({ subtree: true }).map((a) => a.finished));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return [...document.querySelectorAll(".log-entry")].map((el) => ({
          moving: el.getAnimations().some((a) => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition)),
          resizing: el
            .querySelector(".log-title")!
            .getAnimations()
            .some((a) => a instanceof CSSTransition && a.transitionProperty === "font-size"),
        }));
      }, key),
  };

  readonly workbench = {
    /** The page switcher in the activity bar. */
    pageLink: (
      name: "visualizer" | "names" | "narrow" | "cyclic" | "redundancy" | "check" | "equivalence" | "table" | "estimate",
    ) => this.page.locator(`.activity a[data-page="${name}"]`),
    /** The display-language selector in the status bar. */
    localeSelect: () => this.page.locator(".statusbar .locale-select"),
    sidebar: () => this.page.locator(".sidebar"),
    sidebarToggle: () => this.page.locator(".activity .sidebar-toggle"),
    statusbar: () => this.page.locator(".statusbar"),
    splitter: (name: "sidebar" | "panel" | "code") => this.page.locator(`[data-splitter="${name}"]`),
    /** The page's own horizontal and vertical overflow (px). 0 means the page does not scroll. */
    pageOverflow: () =>
      this.page.evaluate(() => {
        const root = document.scrollingElement!;
        return { x: root.scrollWidth - root.clientWidth, y: root.scrollHeight - root.clientHeight };
      }),
    /**
     * How the cards in the editor's .page-columns (or the names page) sit. minGap: the smallest space (px) between two cards that share a column span
     * (one above the other) or a row (side by side); Infinity if none. ragged: pairs of cards side by side whose top or height differ
     * by more than 1 px. overflowing: cards whose content is wider than the card. sparse: cards whose content ends above 60 % of
     * their height (left mostly empty by a taller neighbour). scrolling: parts of cards that have to be scrolled sideways to be seen
     * whole. brokenBadges: verdict and match badges split over two lines. count: the number of cards.
     */
    cardLayout: () =>
      this.page.evaluate(() => {
        const cards = [...document.querySelectorAll(".editor :is(.page-columns, .names-page) > :not(.page-columns)")].map(
          (el) => ({
            el,
            r: el.getBoundingClientRect(),
          }),
        );
        let minGap = Infinity;
        let ragged = 0;
        for (const [i, a] of cards.entries()) {
          for (const b of cards.slice(i + 1)) {
            const sideBySide = a.r.top < b.r.bottom && b.r.top < a.r.bottom;
            const stacked = a.r.left < b.r.right && b.r.left < a.r.right;
            if (sideBySide) {
              minGap = Math.min(minGap, Math.max(b.r.left - a.r.right, a.r.left - b.r.right));
              if (Math.abs(a.r.top - b.r.top) > 1 || Math.abs(a.r.height - b.r.height) > 1) ragged++;
            } else if (stacked) minGap = Math.min(minGap, Math.max(b.r.top - a.r.bottom, a.r.top - b.r.bottom));
          }
        }
        const overflowing = cards.filter(({ el }) => el.scrollWidth > el.clientWidth + 1).length;
        const sparse = cards.filter(({ el, r }) => {
          const bottom = Math.max(...[...el.children].map((c) => c.getBoundingClientRect().bottom));
          return bottom - r.top < 0.6 * r.height;
        }).length;
        const scrolling = cards.flatMap(({ el }) =>
          [...el.querySelectorAll("*")].filter(
            (d) => d.scrollWidth > d.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(d).overflowX),
          ),
        ).length;
        const brokenBadges = [...document.querySelectorAll(".editor :is(.match, .verdict)")].filter(
          (badge) => new Set([...badge.getClientRects()].map((r) => Math.round(r.top))).size > 1,
        ).length;
        return { minGap, ragged, overflowing, sparse, scrolling, brokenBadges, count: cards.length };
      }),
    /**
     * How far across the editor area the content reaches in the first screen: the editor is cut into horizontal strips 40 px high,
     * and for each strip that holds content the right edge of the furthest text or drawing is taken as a share of the editor width (0 to 1).
     * Headings are left out, as they are short by nature. Returns the share of those strips whose content reaches past the middle of the editor (0 to 1).
     */
    contentFill: () =>
      this.page.evaluate(() => {
        const editor = document.querySelector(".editor")!.getBoundingClientRect();
        const walker = document.createTreeWalker(document.querySelector(".editor")!, NodeFilter.SHOW_TEXT);
        const inked: DOMRect[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue;
          if (node.parentElement?.closest("h1, h2, h3, h4")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          inked.push(...range.getClientRects());
        }
        const drawn = [...document.querySelectorAll(".editor :is(svg, button, input, select, .bit-cell, .word-dot)")];
        const rects = [...inked, ...drawn.map((el) => el.getBoundingClientRect())].filter(
          (r) => r.width > 0 && r.height > 0 && r.bottom > editor.top && r.top < editor.bottom,
        );
        const shares: number[] = [];
        for (let y = editor.top; y < editor.bottom; y += 40) {
          const inStrip = rects.filter((r) => r.top < y + 40 && r.bottom > y && r.width < editor.width - 1);
          if (inStrip.length) shares.push((Math.max(...inStrip.map((r) => r.right)) - editor.left) / editor.width);
        }
        return shares.filter((share) => share > 0.55).length / shares.length;
      }),
    /** Drags the splitter name by (dx, dy) from where it is grabbed. */
    drag: async (name: "sidebar" | "panel" | "code", dx: number, dy: number) => {
      const box = (await this.page.locator(`[data-splitter="${name}"]`).boundingBox())!;
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      await this.page.mouse.move(x, y);
      await this.page.mouse.down();
      await this.page.mouse.move(x + dx, y + dy, { steps: 5 });
      await this.page.mouse.up();
    },
    /** The size of an element (px). */
    size: async (selector: string) => {
      const box = (await this.page.locator(selector).boundingBox())!;
      return { width: box.width, height: box.height };
    },
  };

  readonly settings = {
    preset: () => this.page.locator('label[data-field="preset"] select'),
    /** The field names of the settings panel. */
    labels: () => this.page.locator(".config label > span:first-child"),
    /** The inputs of the non-parameter fields (preset, inputMode, input). */
    field: (name: "preset" | "inputMode" | "input") => this.page.locator(`label[data-field="${name}"] :is(input, select)`),
    param: (name: string) => this.page.locator(`label[data-param="${name}"]`),
    help: () => this.page.locator(".param-help"),
    currentHelp: () => this.page.locator(".param-help .current"),
    speedMode: () => this.page.getByTitle("速度モード"),
    rate: () => this.page.getByTitle("速度倍率"),
    loop: () => this.page.getByTitle("ループ再生（L）"),
    play: () => this.page.getByTitle("再生 / 一時停止（Space）"),
    query: () => new URL(this.page.url()).searchParams,
  };
}
