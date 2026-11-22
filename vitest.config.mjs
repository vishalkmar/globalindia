import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside a React Server environment; tests run in plain Node.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    globalSetup: ["tests/globalSetup.js"],
    fileParallelism: false, // one shared test database
    testTimeout: 20000,
    // Phase 30 todo 01: auth and security code stays at 90 %+ (npm run test:coverage).
    coverage: {
      include: ["src/lib/auth/**", "src/lib/security/**"],
      reporter: ["text-summary", "html"],
      thresholds: { statements: 90, lines: 90, functions: 90 },
    },
  },
});
