import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["__tests__/setup.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@eng-suite/physics": path.resolve(
        __dirname,
        "../../packages/physics-engine/src/index.ts",
      ),
      "@eng-suite/engineering-units": path.resolve(
        __dirname,
        "../../packages/engineering-units/src/index.ts",
      ),
      react: path.resolve(__dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
})
