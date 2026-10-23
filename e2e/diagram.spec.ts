import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("Value flow in the diagram (CRC-3/TUTORIAL, the 1st clock has feedback 1)", () => {
  test("computing the feedback bit, the input bit and the MSB meet at the input gate and the result enters the feedback box", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the feedback step of the 1st clock", () => v.goTo("feedback"));
    await then("particles for input bit 1 and MSB 0 head to the input gate", async () => {
      await expect(v.diagram.particle("input")).toHaveText("1");
      await expect(v.diagram.particle("msb")).toHaveText("0");
      await expect(v.diagram.wire("input")).toHaveAttribute("data-level", "1");
      await expect(v.diagram.wire("msb")).toHaveAttribute("data-level", "0");
    });
    await then("a result-1 particle travels along the result wire into the feedback box", async () => {
      await expect(v.diagram.particle("result")).toHaveText("1");
      await expect(v.diagram.wire("result")).toHaveAttribute("data-level", "1");
      await expect(v.diagram.feedbackValue()).toHaveText("1");
      await expect(v.diagram.feedbackBox()).toHaveAttribute("data-level", "1");
    });
    await then("feedback is not yet sent to the gates", async () => {
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "none");
    });
  });

  test("during shift, the feedback value stays in its box and does not flow along the feedback wires", async ({ page }) => {
    const v = await given("at the feedback step of the 1st clock", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("feedback");
      return v;
    });
    await when("advancing to the shift step", () => v.stepForward());
    await then("the feedback box stays 1 and nothing flows along the result and feedback wires", async () => {
      await expect(v.diagram.feedbackValue()).toHaveText("1");
      await expect(v.diagram.wire("result")).toHaveAttribute("data-level", "none");
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "none");
      await expect(v.diagram.particles()).toHaveCount(0);
    });
  });

  test("on xor, a 1 is carried from the feedback box to each tap's gate and the XOR with r[i] returns to the box", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the xor step of the 1st clock", () => v.goTo("xor"));
    await then(
      "1 particles head from the feedback box to the gates of taps 0 and 1, and the feedback wires become 1",
      async () => {
        await expect(v.diagram.particle("tap-0")).toHaveText("1");
        await expect(v.diagram.particle("tap-1")).toHaveText("1");
        await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "1");
        await expect(v.diagram.wire("feedback-1")).toHaveAttribute("data-level", "1");
      },
    );
    await then("each r[i]'s value 0 goes down the left leg and the result 1 comes up the right leg", async () => {
      await expect(v.diagram.particles()).toHaveCount(6);
      for (const i of [0, 1]) {
        await expect(v.diagram.particle(`in-${i}`)).toHaveText("0");
        await expect(v.diagram.particle(`out-${i}`)).toHaveText("1");
        await expect(v.diagram.wire(`tap-in-${i}`)).toHaveAttribute("data-level", "0");
        await expect(v.diagram.wire(`tap-out-${i}`)).toHaveAttribute("data-level", "1");
      }
    });
    await then("nothing flows along the input wire", async () => {
      await expect(v.diagram.wire("input")).toHaveAttribute("data-level", "none");
    });
  });

  test("on a clock with feedback 0 no xor comes, the box is white, and nothing flows along the feedback wires", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the shift step of the 2nd clock (feedback 0)", () => v.goTo("shift", 2));
    await then("the feedback box is 0 and white, and the feedback wires stay grey", async () => {
      await expect(v.diagram.feedbackValue()).toHaveText("0");
      await expect(v.diagram.feedbackBox()).toHaveAttribute("data-level", "0");
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "none");
    });
    await then("the next step is the next clock's feedback, not xor", async () => {
      await v.stepForward();
      expect(await v.stepKind()).toBe("feedback");
    });
  });

  test("the diagram shows the flow only by wire colour and particles, without formula text", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await then("on the first step there are no particles and no wires carrying values", async () => {
      await expect(v.diagram.particles()).toHaveCount(0);
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "none");
    });
    await when("advancing to the xor step", () => v.goTo("xor"));
    await then("the diagram has no ⊕ or = formula, and the legend explains ⊕", async () => {
      await expect(v.diagram.root()).not.toContainText("⊕");
      await expect(v.diagram.root()).not.toContainText("=");
      await expect(page.locator(".legend")).toContainText("⊕ = XOR（2 入力が異なれば 1）");
    });
    await then("the glow region is taken in whole-diagram coordinates so straight wires keep their glow", async () => {
      expect(await page.locator(".lfsr filter#glow").getAttribute("filterUnits")).toBe("userSpaceOnUse");
    });
  });
});

test.describe("Register boxes", () => {
  test("on xor, only the boxes of poly's 1 bits flip their value, and the box colour does not change", async ({ page }) => {
    const v = await given("the page is open with the default settings (poly 0x3)", () => Visualizer.open(page));
    await when("advancing to the xor step", () => v.goTo("xor"));
    await then("only r0 and r1 flip", async () => {
      await expect(v.diagram.register(0)).toHaveClass(/\bhit\b/);
      await expect(v.diagram.register(1)).toHaveClass(/\bhit\b/);
      await expect(v.diagram.register(2)).not.toHaveClass(/\bhit\b/);
    });
    await then("the flipping boxes keep the same colour as r2, which does not flip", async () => {
      const same = async (bit: number) => (await v.diagram.registerLook(bit)) === (await v.diagram.registerLook(2));
      await expect.poll(() => same(0)).toBe(true);
      await expect.poll(() => same(1)).toBe(true);
    });
  });

  test("on shift, the original r[width-1] overflows and leaves to the left", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the shift step", () => v.goTo("shift"));
    await then("r2's original value 0 leaves", async () => {
      await expect(v.diagram.register(2).locator(".drop")).toHaveText("0");
    });
  });

  test("on shift, the value leaving to the left does not enter the input gate and fades out before reaching it", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the shift step", () => v.goTo("shift"));
    await then("while visible, the leaving value is right of the input gate's right edge", async () => {
      const gate = await v.diagram.gateEdges("input");
      for (let progress = 0; progress <= 1; progress += 0.05) {
        const frame = await v.diagram.frameAt(v.diagram.dropped(), progress);
        if (frame.opacity > 0) expect(frame.left, `progress ${progress.toFixed(2)}`).toBeGreaterThan(gate.right);
      }
    });
  });

  test("on shift, the values leaving to the left and entering from the right move as fast as values moving to the neighbouring box", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the shift step", () => v.goTo("shift"));
    await then(
      "at every point, the value leaving r2, the value entering r0 from the right and the value moving r0 to r1 have moved the same distance",
      async () => {
        for (const progress of [0.25, 0.5, 0.9]) {
          const sliding = await v.diagram.travelX(v.diagram.sliding(1), progress);
          expect(await v.diagram.travelX(v.diagram.dropped(), progress)).toBeCloseTo(sliding, 0);
          expect(await v.diagram.travelX(v.diagram.sliding(0), progress)).toBeCloseTo(sliding, 0);
        }
      },
    );
  });

  test("if the next step is shift, the value entering r0 is shown in advance right beside r0", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await then("on the first step no upcoming value is shown", async () => {
      await expect(v.diagram.upcoming()).toHaveCount(0);
    });
    await when("advancing to a feedback step followed by shift", () => v.goTo("feedback"));
    await then("the 0 entering r0 is shown on the right, where values come in, level with the box", async () => {
      await expect(v.diagram.upcoming()).toHaveCount(1);
      await expect(v.diagram.upcoming()).toHaveAttribute("data-bit", "0");
      await expect(v.diagram.upcoming()).toHaveText("0");
      const box = (await v.diagram.register(0).locator("rect").boundingBox())!;
      const hint = (await v.diagram.upcoming().boundingBox())!;
      expect(hint.x).toBeGreaterThan(box.x + box.width);
      expect(hint.y + hint.height / 2).toBeCloseTo(box.y + box.height / 2, 0);
    });
    await when("advancing to a shift step followed by xor", () => v.stepForward());
    await then("no upcoming value is shown, since particles show the xor result", async () => {
      await expect(v.diagram.upcoming()).toHaveCount(0);
    });
  });

  test("when done, the registers turn green and the CRC is shown appended to the input", async ({ page }) => {
    const v = await given("the page is open with the default settings (input 10101)", () => Visualizer.open(page));
    await when("advancing to the end", () => v.goToEnd());
    await then("every box takes the done colour", async () => {
      for (const bit of [0, 1, 2]) await expect(v.diagram.register(bit)).toHaveClass(/\bdone\b/);
    });
    await then("CRC 101 follows the input 10101", async () => {
      await expect(page.locator(".framed")).toHaveText("10101101");
      await expect(page.locator(".crc-tail")).toHaveText("101");
    });
  });
});

test.describe("Gate lighting", () => {
  test("gates light yellow only on the steps that use them, regardless of the feedback bit's value", async ({ page }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await when("advancing to the feedback step of a clock with feedback 1", () => v.goTo("feedback"));
    await then("only the input gate lights", async () => {
      await expect.poll(() => v.diagram.gateLit("input")).toBe(true);
      await expect.poll(() => v.diagram.gateLit(1)).toBe(false);
    });
    await when("advancing to the xor step", () => v.goTo("xor"));
    await then("only the tap gates light", async () => {
      await expect.poll(() => v.diagram.gateLit("input")).toBe(false);
      await expect.poll(() => v.diagram.gateLit(1)).toBe(true);
    });
    await when("advancing to the feedback step of a clock with feedback 0", () => v.goTo("feedback"));
    await then("the input gate lights", async () => {
      await expect.poll(() => v.diagram.gateLit("input")).toBe(true);
    });
  });
});

test.describe("Diagram size on a PC screen of 1280×1024 less the browser frame and taskbar (1280×850)", () => {
  const SCREEN = { width: 1280, height: 850 };
  const CRC16 = "?width=16&poly=0x1021&init=0x0&refin=1&refout=1&xorout=0x0&inputMode=text&input=123456789";
  const CRC32 = "?width=32&poly=0x4c11db7&init=0xffffffff&refin=1&refout=1&xorout=0xffffffff&inputMode=text&input=123456789";

  test("a 16-bit diagram is shrunk to fit the width of its area, with every register in view", async ({ page }) => {
    await given("a 16-bit CRC is open on the screen", async () => {
      await page.setViewportSize(SCREEN);
      return Visualizer.open(page, CRC16);
    });
    await then("the diagram area does not scroll sideways, and every register is wholly in view", async () => {
      const hardware = page.locator(".hardware");
      expect(await hardware.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(0);
      for (const reg of await page.locator(".reg").all()) await expect(reg).toBeInViewport({ ratio: 1 });
    });
  });

  test("a 32-bit diagram scrolls sideways, and is scrolled back to the most significant register being read", async ({
    page,
  }) => {
    const v = await given("a 32-bit CRC is open on the screen", async () => {
      await page.setViewportSize(SCREEN);
      return Visualizer.open(page, CRC32);
    });
    await when("scrolling the diagram to its right end and stepping to the first feedback", async () => {
      await page.locator('.reg[data-bit="0"]').scrollIntoViewIfNeeded();
      await v.goTo("feedback");
    });
    await then("the most significant register is wholly in view", () =>
      expect(page.locator(".reg.msb")).toBeInViewport({ ratio: 1 }),
    );
  });
});
