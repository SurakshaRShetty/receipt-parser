import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@receipt-parser/shared": path.resolve(__dirname, "../packages/shared/src/types.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
