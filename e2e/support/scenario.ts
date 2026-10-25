import { test as base } from "@playwright/test";
import { scenarioStepsViolation, type StepKeyword } from "../../src/testing/scenario";

let topLevelSteps: StepKeyword[] = [];
let depth = 0;

function step(keyword: StepKeyword) {
  return async <T>(title: string, body: () => Promise<T>): Promise<T> => {
    if (depth === 0) topLevelSteps.push(keyword);
    depth++;
    try {
      return await base.step(`${keyword} ${title}`, body);
    } finally {
      depth--;
    }
  };
}

/** A step that sets up the precondition. Reported by Playwright as "Given ...". */
export const given = step("Given");
/** An action that triggers the behaviour. Reported as "When ...". */
export const when = step("When");
/** A check of the expected state. Reported as "Then ...". */
export const then = step("Then");

/** How many times slower than the machine each page's CPU runs; 1 leaves it as it is. Set per project by playwright.stress.config.ts. */
export type ThrottleOptions = { cpuThrottle: number };

/**
 * The E2E test. A passing test is failed if its top-level steps break the writing rule (scenarioStepsViolation).
 * Only steps written with given / when / then are counted. With cpuThrottle above 1, the page runs that many times slower.
 */
export const test = base.extend<{ scenarioShape: void; throttle: void } & ThrottleOptions>({
  cpuThrottle: [1, { option: true }],
  throttle: [
    async ({ page, cpuThrottle }, use) => {
      if (cpuThrottle > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
      }
      await use();
    },
    { auto: true },
  ],
  scenarioShape: [
    async ({}, use, testInfo) => {
      topLevelSteps = [];
      depth = 0;
      await use();
      if (testInfo.status !== "passed") return;
      const violation = scenarioStepsViolation(testInfo.titlePath.slice(1, -1), topLevelSteps);
      if (violation) throw new Error(violation);
    },
    { auto: true },
  ],
});
