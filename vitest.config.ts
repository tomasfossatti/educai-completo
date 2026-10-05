import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    alias: { "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)) },
    include: ["tests/unit/**/*.test.ts", "tests/contract/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    pool: "forks",
  },
});
