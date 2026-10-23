import { defineConfig } from "@playwright/test";

const PORT = 5180;

/** Half the logical CPUs, as Playwright does by default, but at most 6, since each worker runs a whole Chrome and more of them than that starve one another */
const WORKERS = Math.min(6, Math.ceil(navigator.hardwareConcurrency / 2));

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: WORKERS,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    channel: "chrome",
    locale: "ja-JP",
    viewport: { width: 1366, height: 1000 },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
  },
});
