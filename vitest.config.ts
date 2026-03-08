import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    // Integration tests share a single test.db — disable parallel file execution
    // to prevent race conditions between test files writing to the same SQLite file.
    fileParallelism: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.integration.test.ts"],
    exclude: ["tests/**"],
    setupFiles: ["src/test/setup.ts"],
    globalSetup: ["src/test/globalSetup.ts"],
    env: {
      TURSO_DATABASE_URL: "file:./test.db",
      TURSO_AUTH_TOKEN: "local",
      ANTHROPIC_API_KEY: "test-key-for-vitest",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
