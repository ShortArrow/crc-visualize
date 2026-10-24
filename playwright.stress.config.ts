import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
import type { ThrottleOptions } from "./e2e/support/scenario";

/** The E2E tests with each page's CPU slowed down, one project per rate (x1, x2, x4, x6), for the Stress E2E workflow. */
export default defineConfig<ThrottleOptions>(base, {
  projects: [1, 2, 4, 6].map((rate) => ({ name: `x${rate}`, use: { cpuThrottle: rate } })),
});
