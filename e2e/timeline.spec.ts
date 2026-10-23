import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

/** Steady speed ×0.25: one step takes 2400 ms, and particles take 768 ms for each of the first and second halves. */
const SLOW = "?speed=steady&rate=0.25";
const PHASE = { timeout: 3000 };

test.describe("Timing within one step", () => {
  test("wires, gates and boxes do not show the result before the particle arrives", async ({ page }) => {
    const v = await given("the page is open with slow playback settings", () => Visualizer.open(page, SLOW));
    await when("right after advancing to the feedback step", () => v.goToFrozen("feedback"));
    await then("the result wire is unpainted, the input gate is unlit, and the feedback box is empty and grey", async () => {
      expect(await v.diagram.painted("result")).toBeLessThan(0.1);
      expect(await v.diagram.gateLit("input")).toBe(false);
      expect(await v.diagram.feedbackShown()).toBe(false);
      expect(await v.diagram.feedbackRed()).toBe(false);
    });
    await when("the step plays on", () => v.resume());
    await then("at the end of the first half the input wire is fully painted and the input gate lights", async () => {
      await expect.poll(() => v.diagram.painted("input"), PHASE).toBeGreaterThan(0.99);
      await expect.poll(() => v.diagram.gateLit("input"), PHASE).toBe(true);
    });
    await then("the input-bit particle disappears once it arrives", async () => {
      const opacity = () => v.diagram.particle("input").evaluate((el) => getComputedStyle(el).opacity);
      await expect.poll(opacity, PHASE).toBe("0");
    });
    await then(
      "at the end of the second half the result wire is fully painted and the feedback box gets 1 and turns red",
      async () => {
        await expect.poll(() => v.diagram.painted("result"), PHASE).toBeGreaterThan(0.99);
        await expect.poll(() => v.diagram.feedbackShown(), PHASE).toBe(true);
        await expect.poll(() => v.diagram.feedbackRed(), PHASE).toBe(true);
      },
    );
  });

  test("even the first render, before the particles start moving, shows no particles or wires yet to be painted", async ({
    page,
  }) => {
    const v = await given("the page is open with slow playback settings", () => Visualizer.open(page, SLOW));
    await when(
      "advancing to the feedback step and returning to the state before the particle and wire animations start",
      async () => {
        await v.goTo("feedback");
        await v.diagram.withoutMotion();
      },
    );
    await then("no particle is visible, and the input, MSB and result wires are unpainted", async () => {
      for (const particle of await v.diagram.particles().all()) {
        expect(await particle.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
      }
      for (const wire of ["input", "msb", "result"]) {
        expect(await v.diagram.painted(wire)).toBe(0);
      }
    });
  });

  test("the start of the next step does not carry over the previous step's display", async ({ page }) => {
    const v = await given("with slow playback, at a feedback step where the input gate is lit", async () => {
      const v = await Visualizer.open(page, SLOW);
      await v.goTo("feedback");
      await expect.poll(() => v.diagram.gateLit("input"), PHASE).toBe(true);
      return v;
    });
    await when("right after advancing to the shift step", () => v.stepForward());
    await then("the input gate goes out at once", async () => {
      expect(await v.diagram.gateLit("input")).toBe(false);
    });
  });
});
