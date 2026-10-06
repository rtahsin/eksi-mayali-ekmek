import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@content": path.resolve(__dirname, "content"),
      "server-only": path.resolve(
        __dirname,
        "node_modules/next/dist/compiled/server-only/empty.js"
      ),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
