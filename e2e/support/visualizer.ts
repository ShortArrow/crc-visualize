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
/** The accessibility roles of the controls a viewer operates, as workbench.cutControls collects them. */
const CONTROL_ROLES = [
  "button",
  "link",
  "checkbox",
  "radio",
  "combobox",
  "listbox",
  "slider",
  "spinbutton",
  "textbox",
  "searchbox",
  "switch",
  "tab",
] as const;

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

  /**
   * Advances one step and, as soon as the step is shown and before the next frame, pauses every animation at its start, so the start
   * of the step can be read however slowly the browser runs. resume() lets the animations run on.
   */
  async stepForwardFrozen(): Promise<void> {
    await this.page.evaluate(async () => {
      const counter = document.querySelector(".counter")!;
      const before = counter.textContent;
      await new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          if (counter.textContent === before) return;
          observer.disconnect();
          resolve();
        });
        observer.observe(counter, { childList: true, characterData: true, subtree: true });
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      });
      document.getAnimations().forEach((a) => a.pause());
    });
  }

  /** Advances to the nth step of kind as goTo does, with every animation paused at the start of that step (see stepForwardFrozen). */
  async goToFrozen(kind: StepKind, nth = 1): Promise<void> {
    await this.goTo(kind, nth);
    await this.stepBack();
    await this.stepForwardFrozen();
  }

  /** Lets the animations paused by stepForwardFrozen run on. */
  resume(): Promise<void> {
    return this.page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
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
    stream: () => this.page.locator(".lfsr g.stream"),
    /** The parts of the diagram being computed at this step: the register read, the registers hit, the lit gates and the arriving feedback box. */
    activeParts: () => this.page.locator(".lfsr :is(.reg.msb, .reg.hit, .gate.active, .fb-box.arriving)"),
    /** The most significant register r[width-1] (the highest data-bit), which the diagram follows when it scrolls. */
    msb: async (): Promise<Locator> => {
      const bits = await this.page
        .locator(".lfsr .reg")
        .evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-bit"))));
      return this.page.locator(`.lfsr .reg[data-bit="${Math.max(...bits)}"]`);
    },
    /**
     * The head of the flow at this step: of the parts values flow through (the lit gates, the registers hit and the arriving
     * feedback box), the first along the route, which runs from the input gate on the left towards r0 on the right. Undefined
     * when nothing flows.
     */
    flowHead: async (): Promise<Locator | undefined> => {
      const flowing = this.page.locator(".lfsr :is(.gate.active, .reg.hit, .fb-box.arriving)");
      const lefts = await flowing.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
      if (lefts.length === 0) return undefined;
      return flowing.nth(lefts.indexOf(Math.min(...lefts)));
    },
    /** The zoom buttons at the top right of the diagram: out (−), in (＋) and fit (back to the automatic size). */
    zoom: (button: "out" | "in" | "fit") => this.page.locator(`.hardware [data-zoom="${button}"]`),
    /**
     * Pinches over the middle of the diagram's pane with two touch points that start from px apart and end to px apart (spreading
     * when to is larger), sent as CDP touch events with touch emulation turned on.
     */
    pinch: async (from: number, to: number) => {
      const box = (await this.page.locator(".hardware").boundingBox())!;
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      const points = (d: number) => [
        { x: x - d / 2, y },
        { x: x + d / 2, y },
      ];
      const cdp = await this.page.context().newCDPSession(this.page);
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(from) });
      for (let i = 1; i <= 5; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(from + ((to - from) * i) / 5) });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await cdp.detach();
    },
    /** The width (px) of the diagram's area. */
    areaWidth: async () => (await this.page.locator(".hardware").boundingBox())!.width,
    /**
     * How the diagram fits its area: the size and bottom of its box, the height-to-width ratio of the drawing (its view box), the
     * bottom of its area and the area's bottom padding (px).
     */
    fit: () =>
      this.page.evaluate(() => {
        const svg = document.querySelector<SVGSVGElement>("svg.lfsr")!;
        const area = document.querySelector(".hardware")!;
        const [box, view] = [svg.getBoundingClientRect(), svg.viewBox.baseVal];
        return {
          boxWidth: box.width,
          boxHeight: box.height,
          boxBottom: box.bottom,
          aspect: view.height / view.width,
          areaBottom: area.getBoundingClientRect().bottom,
          padding: parseFloat(getComputedStyle(area).paddingBottom),
        };
      }),
    /** The width (px) the diagram is drawn at. */
    drawnWidth: async () => (await this.page.locator("svg.lfsr").boundingBox())!.width,
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
    /**
     * Once the log's previous motion has finished, moves the step with key and samples every frame until the motion ends: the
     * space between the bottom of the first entry and the top of the second (px, negative when they overlap), the first entry's
     * opacity, and whether the part of the first entry above the top of the list is hidden.
     */
    framesAfter: (key: string) =>
      this.page.evaluate(async (k) => {
        const log = document.querySelector(".log")!;
        await Promise.all(log.getAnimations({ subtree: true }).map((a) => a.finished));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
        const frames: { space: number; opacity: number; clipped: boolean }[] = [];
        do {
          await new Promise((r) => requestAnimationFrame(r));
          const [first, second] = [...document.querySelectorAll<HTMLElement>(".log-entry")];
          const list = document.querySelector(".log-list")!;
          frames.push({
            space: second!.getBoundingClientRect().top - first!.getBoundingClientRect().bottom,
            opacity: Number(getComputedStyle(first!).opacity),
            clipped:
              first!.getBoundingClientRect().top >= list.getBoundingClientRect().top ||
              getComputedStyle(list).overflowY !== "visible",
          });
        } while (log.getAnimations({ subtree: true }).some((a) => a.playState === "running"));
        return frames;
      }, key),
  };

  readonly workbench = {
    /**
     * The share (0 to 1) of points sampled across target's box that are inside the viewport and not covered by anything else: the
     * element hit there is target, inside it, one of its ancestors (target lets the pointer through) or part of the same drawing
     * (svg). 1 means target is wholly in view and nothing such as a docked bar, a sticky header or a drawer lies over it.
     */
    uncovered: (target: Locator) =>
      target.evaluate((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return 0;
        const svg = el.closest("svg");
        const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => r.left + f * r.width);
        const ys = [0.15, 0.5, 0.85].map((f) => r.top + f * r.height);
        let clear = 0;
        for (const x of xs)
          for (const y of ys) {
            if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
            const hit = document.elementFromPoint(x, y);
            if (hit && (hit === el || el.contains(hit) || hit.contains(el) || (svg !== null && svg.contains(hit)))) clear++;
          }
        return clear / (xs.length * ys.length);
      }),
    /**
     * The controls inside the elements matched by scope, found by their accessibility role, that are cut off, each with the share
     * of its box left in view (below 0.99). strict: every ancestor that clips, scrolling ones included, and the window count, so a
     * control must be in view without scrolling. Otherwise a control only has to be reachable: ancestors below the nearest scrolling
     * ancestor on each axis cut it, and that ancestor and the ones beyond do not.
     */
    cutControls: async (scope: string, strict: boolean) => {
      const cut: { name: string; shown: number }[] = [];
      for (const role of CONTROL_ROLES)
        cut.push(
          ...(await this.page
            .locator(scope)
            .getByRole(role)
            .evaluateAll((els, strict) => {
              const out: { name: string; shown: number }[] = [];
              for (const el of els) {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
                let [left, top, right, bottom] = [r.left, r.top, r.right, r.bottom];
                let [clipX, clipY] = [true, true];
                for (let a = el.parentElement; a; a = a.parentElement) {
                  const s = getComputedStyle(a);
                  const box = a.getBoundingClientRect();
                  if (!strict && /auto|scroll/.test(s.overflowX)) clipX = false;
                  if (!strict && /auto|scroll/.test(s.overflowY)) clipY = false;
                  if (s.overflowX !== "visible" && clipX) [left, right] = [Math.max(left, box.left), Math.min(right, box.right)];
                  if (s.overflowY !== "visible" && clipY) [top, bottom] = [Math.max(top, box.top), Math.min(bottom, box.bottom)];
                }
                if (clipX) [left, right] = [Math.max(left, 0), Math.min(right, innerWidth)];
                if (clipY) [top, bottom] = [Math.max(top, 0), Math.min(bottom, innerHeight)];
                const shown = (Math.max(0, right - left) * Math.max(0, bottom - top)) / (r.width * r.height);
                const name = el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent?.trim() || el.tagName;
                if (shown < 0.99)
                  out.push({ name: `${el.tagName.toLowerCase()} "${name.slice(0, 30)}"`, shown: Math.round(shown * 100) / 100 });
              }
              return out;
            }, strict)),
        );
      return cut;
    },
    /** The bottom dock of a phone, which holds the controls a page docks and the one-line result of what they do. */
    dock: () => this.page.locator(".dock"),
    /** The one-line result shown in the phone dock (the verdict, or the index and value of the chosen table row). */
    dockResult: () => this.page.locator(".dock [data-dock-result]"),
    /**
     * The gap (px) between the top of the phone dock and the lowest content of the editor area above it, with content cut off at
     * the bottom of the editor area (a page or pane that scrolls reaches it, so its gap is 0). Undefined when the dock is empty.
     */
    dockGap: () =>
      this.page.evaluate(() => {
        const dock = document.querySelector(".dock");
        if (!dock || dock.childElementCount === 0) return undefined;
        const editor = document.querySelector(".editor")!;
        const bottom = editor.getBoundingClientRect().bottom;
        const reached = [...editor.querySelectorAll("*")]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0)
          .map((r) => Math.min(r.bottom, bottom));
        return dock.getBoundingClientRect().top - Math.max(...reached);
      }),
    /** The tabs that switch between the software and the log on a short screen (data-tab is software or log). */
    panelTab: (name: "software" | "log") => this.page.locator(`.panel [role="tab"][data-tab="${name}"]`),
    /** The code's heading in the lower panel (Software and the code-language select). */
    codeHeading: () => this.page.locator(".panel > .software > h2"),
    /** The variables placed in the Software pane of the lower panel, and the variables section of the sidebar. */
    panelVariables: () => this.page.locator(".panel > .software .variables-pane"),
    sidebarVariables: () => this.page.locator('.sidebar-section[data-section="variables"]'),
    /** The explanation paragraphs of the page, which a short screen closes at first (details elements, opened from their summary). */
    explanations: () => this.page.locator(".editor details[data-explain]"),
    /** The page switcher in the activity bar. */
    pageLink: (
      name: "visualizer" | "names" | "narrow" | "cyclic" | "redundancy" | "check" | "equivalence" | "table" | "estimate",
    ) => this.page.locator(`.activity a[data-page="${name}"]`),
    /** The display-language selector in the status bar. */
    localeSelect: () => this.page.locator(".statusbar .locale-select"),
    sidebar: () => this.page.locator(".sidebar"),
    sidebarToggle: () => this.page.locator(".activity .sidebar-toggle"),
    /** The icon of the sidebar toggle, whose lucide class names the panel opening or closing. */
    sidebarToggleIcon: () => this.page.locator(".activity .sidebar-toggle svg"),
    statusbar: () => this.page.locator(".statusbar"),
    /** The step shown in the status bar, which stands in for the newest log entry on a phone or a short screen. */
    statusStep: () => this.page.locator(".statusbar .status-step"),
    /** The shade behind the sidebar drawn over the editor on a phone; tapping it closes the sidebar. */
    drawerShade: () => this.page.locator(".drawer-shade"),
    /** The boxes of the activity bar, the editor area and the status bar, and the size of the window. */
    frameBoxes: () =>
      this.page.evaluate(() => {
        const box = (selector: string) => {
          const r = document.querySelector(selector)!.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        return {
          activity: box(".activity"),
          editor: box(".editor"),
          statusbar: box(".statusbar"),
          view: { width: innerWidth, height: innerHeight },
        };
      }),
    /**
     * Elements in the editor area that stick out past its right edge where they cannot be scrolled to: those not inside an element
     * that scrolls or clips sideways (other than the page itself, which scrolls down). Returns up to five of them as tag.class.
     */
    sticking: () =>
      this.page.evaluate(() => {
        const editor = document.querySelector(".editor")!;
        const right = editor.getBoundingClientRect().right;
        const clipped = (el: Element) => {
          for (let a = el.parentElement; a && a !== editor && a.parentElement !== editor; a = a.parentElement)
            if (/auto|scroll|hidden/.test(getComputedStyle(a).overflowX)) return true;
          return false;
        };
        return [...editor.querySelectorAll("*")]
          .filter((el) => el.getBoundingClientRect().right > right + 1 && !clipped(el))
          .map((el) => el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(" ")[0]}` : ""))
          .slice(0, 5);
      }),
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
     * their height (left mostly empty by a taller neighbour). narrow: cards whose content
     * reaches less than 55 % of their width (left mostly empty on the right). scrolling: parts of cards that have to be scrolled sideways to be seen
     * whole. brokenBadges: verdict and match badges split over two lines. squeezed: texts squeezed so narrow that they run down three or more
     * lines of at most two characters each. count: the number of cards.
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
        const narrow = cards.filter(({ el, r }) => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let right = r.left;
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
          }
          for (const d of el.querySelectorAll("svg, table, input, button, .bit-cell, .word-dot"))
            right = Math.max(right, d.getBoundingClientRect().right);
          return right - r.left < 0.55 * r.width;
        }).length;
        const scrolling = cards.flatMap(({ el }) =>
          [...el.querySelectorAll("*")].filter(
            (d) => d.scrollWidth > d.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(d).overflowX),
          ),
        ).length;
        const brokenBadges = [...document.querySelectorAll(".editor :is(.match, .verdict)")].filter(
          (badge) => new Set([...badge.getClientRects()].map((r) => Math.round(r.top))).size > 1,
        ).length;
        const squeezed = [...document.querySelectorAll(".editor *")].filter((el) => {
          const text = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
          if (!text.length) return false;
          const range = document.createRange();
          range.selectNodeContents(el);
          const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
          return lines >= 3 && el.getBoundingClientRect().width < 2.5 * parseFloat(getComputedStyle(el).fontSize);
        }).length;
        return { minGap, ragged, overflowing, sparse, narrow, scrolling, brokenBadges, squeezed, count: cards.length };
      }),
    /**
     * How far across the editor area the content reaches in the first screen: the editor is cut into horizontal strips 40 px high,
     * and for each strip that holds content the right edge of the furthest text or drawing is taken as a share of the editor width (0 to 1).
     * Headings are left out, as they are short by nature. A card counts as drawn across its whole box, since how far its own
     * content reaches is checked card by card (cardLayout's narrow and sparse). Returns the share of those strips whose content reaches past the middle of the editor (0 to 1).
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
        const drawn = [
          ...document.querySelectorAll(
            ".editor :is(svg, button, input, select, .bit-cell, .word-dot, :is(.page-columns, .names-page) > :not(.page-columns))",
          ),
        ];
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
    /**
     * How far down the editor area the page reaches, as a share of the editor height (0 to 1): the bottom of the lowest card, or of
     * the lowest content of a page without cards. A page taller than the editor, which scrolls, counts as 1.
     */
    pageFill: () =>
      this.page.evaluate(() => {
        const editor = document.querySelector(".editor")!;
        const page = editor.firstElementChild!;
        if (page.scrollHeight > page.clientHeight + 1) return 1;
        const box = editor.getBoundingClientRect();
        const bottom = Math.max(...[...page.querySelectorAll("*")].map((el) => el.getBoundingClientRect().bottom));
        return (bottom - box.top) / box.height;
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

  readonly debug = {
    /** A section of the visualizer's sidebar, and the heading that opens and closes it. */
    section: (name: "settings" | "variables" | "breakpoints") => this.page.locator(`.sidebar-section[data-section="${name}"]`),
    sectionHeading: (name: "settings" | "variables" | "breakpoints") =>
      this.page.locator(`.sidebar-section[data-section="${name}"] > h2 button`),
    /** The row of a variable, and its value. */
    variable: (name: string) => this.page.locator(`.variables [data-var="${name}"]`),
    value: (name: string) => this.page.locator(`.variables [data-var="${name}"] .var-value`),
    /** The place left of a line number that sets or removes a breakpoint on the line containing text. */
    gutter: (text: string | RegExp) => this.page.locator(".code-line", { hasText: text }).locator(".bp-gutter"),
    /** The part of the input stream that sets or removes a breakpoint on byte k, and its mark. */
    byte: (k: number) => this.page.locator(`.lfsr .byte-hit[data-byte="${k}"]`),
    byteMark: (k: number) => this.page.locator(`.lfsr .byte-bp[data-byte="${k}"]`),
    /** The part of the input stream above the value at position p from the left, which sets or removes the breakpoint of the bit fed there. */
    bitAt: (p: number) => this.page.locator(".lfsr .bit-hit").nth(p),
    /** The part of the input stream that sets or removes a breakpoint on bit n, and its mark. */
    bit: (n: number) => this.page.locator(`.lfsr .bit-hit[data-bit="${n}"]`),
    bitMark: (n: number) => this.page.locator(`.lfsr .bit-bp[data-bit="${n}"]`),
    /** The position, counted from the left of the input stream, of the value the mark of bit n is above (-1 if none). */
    bitMarkPosition: (n: number) =>
      this.page
        .locator(`.lfsr .bit-bp[data-bit="${n}"]`)
        .evaluate((mark) =>
          [...mark.closest("svg")!.querySelectorAll(".stream-bit")].findIndex(
            (t) => t.getAttribute("x") === mark.getAttribute("cx"),
          ),
        ),
    /** The entries of the breakpoint list; key is as in the bp parameter, such as xor or byte0. */
    entries: () => this.page.locator(".bp-entry"),
    entry: (key: string) => this.page.locator(`.bp-entry[data-bp="${key}"]`),
    enabled: (key: string) => this.page.locator(`.bp-entry[data-bp="${key}"] input[type="checkbox"]`),
    hitCount: (key: string) => this.page.locator(`.bp-entry[data-bp="${key}"] input.bp-hit`),
    hits: (key: string) => this.page.locator(`.bp-entry[data-bp="${key}"] .bp-hits`),
    removeAll: () => this.page.locator(".bp-remove-all"),
  };

  /** The frames of hex input under the settings: the shared layout and one row per frame, numbered from 0. */
  readonly frames = {
    from: () => this.page.locator('.frame-layout input[data-range="from"]'),
    to: () => this.page.locator('.frame-layout input[data-range="to"]'),
    /** The checkbox saying whether the input holds a CRC right after the range. */
    crcInInput: () => this.page.locator(".frame-layout input.crc-in-input"),
    /** The byte order choice of the CRC in input, shown only while the input holds one. */
    order: (order: "be" | "le") => this.page.locator(`.frame-layout input.crc-order[value="${order}"]`),
    /** The sentence saying which bytes of the selected frame are read as the CRC in input. */
    crcNote: () => this.page.locator(".frame-layout .crc-in-input-note"),
    rangeError: () => this.page.locator(".frame-layout .error"),
    rows: () => this.page.locator(".frame-row"),
    row: (i: number) => this.page.locator(`.frame-row[data-frame="${i}"]`),
    pick: (i: number) => this.page.locator(`.frame-row[data-frame="${i}"] .frame-pick`),
    byte: (i: number, k: number) => this.page.locator(`.frame-row[data-frame="${i}"] .frame-byte[data-byte="${k}"]`),
    crc: (i: number) => this.page.locator(`.frame-row[data-frame="${i}"] .frame-crc`),
    field: (i: number) => this.page.locator(`.frame-row[data-frame="${i}"] .frame-field`),
    verdict: (i: number) => this.page.locator(`.frame-row[data-frame="${i}"] .frame-verdict`),
    /** Drags across the bytes of frame i from byte a to byte b. */
    drag: async (i: number, a: number, b: number) => {
      await this.frames.byte(i, a).hover();
      await this.page.mouse.down();
      await this.frames.byte(i, b).hover();
      await this.page.mouse.up();
    },
  };

  readonly settings = {
    preset: () => this.page.locator('label[data-field="preset"] select'),
    /** The field names of the settings panel. */
    labels: () => this.page.locator(".config label > span:first-child"),
    /** The inputs of the non-parameter fields (preset, inputMode, input). */
    field: (name: "preset" | "inputMode" | "input") =>
      this.page.locator(`label[data-field="${name}"] :is(input, select, textarea)`),
    param: (name: string) => this.page.locator(`label[data-param="${name}"]`),
    /** The generator polynomial shown under the poly field. */
    generator: () => this.page.locator('label[data-param="poly"] .generator'),
    help: () => this.page.locator(".param-help"),
    currentHelp: () => this.page.locator(".param-help .current"),
    speedMode: () => this.page.getByTitle("速度モード"),
    rate: () => this.page.getByTitle("速度倍率"),
    loop: () => this.page.getByTitle("ループ再生（L）"),
    play: () => this.page.getByTitle("再生 / 一時停止（Space）"),
    query: () => new URL(this.page.url()).searchParams,
  };
}
