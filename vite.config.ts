import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: {
      input: { main: "index.html", privacy: "privacy.html" },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/testing/setup.ts"],
  },
});
