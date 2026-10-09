import { defineConfig } from "@playwright/test";

const PORT = 5180;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    channel: "chrome",
    viewport: { width: 1366, height: 1000 },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
  },
});
