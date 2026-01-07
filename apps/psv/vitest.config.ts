import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    server: {
      deps: {
        inline: [
          /@mui\/material/,
          /@mui\/icons-material/,
          /@emotion\/react/,
          /@emotion\/styled/,
        ],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@eng-suite/api": path.resolve(
        __dirname,
        "../../packages/api-std/src/index.ts",
      ),
      "@eng-suite/api/*": path.resolve(
        __dirname,
        "../../packages/api-std/src/*",
      ),
      "@eng-suite/physics": path.resolve(
        __dirname,
        "../../packages/physics-engine/src/index.ts",
      ),
      "@eng-suite/physics/*": path.resolve(
        __dirname,
        "../../packages/physics-engine/src/*",
      ),
      "@eng-suite/vessels": path.resolve(
        __dirname,
        "../../packages/vessels-calc/src/index.ts",
      ),
      "@eng-suite/vessels/*": path.resolve(
        __dirname,
        "../../packages/vessels-calc/src/*",
      ),
      react: path.resolve(__dirname, "../../node_modules/react"),
      "react/jsx-runtime": path.resolve(
        __dirname,
        "../../node_modules/react/jsx-runtime",
      ),
      "react/jsx-dev-runtime": path.resolve(
        __dirname,
        "../../node_modules/react/jsx-dev-runtime",
      ),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
      "react-dom/client": path.resolve(
        __dirname,
        "../../node_modules/react-dom/client",
      ),
      "react-dom/test-utils": path.resolve(
        __dirname,
        "../../node_modules/react-dom/test-utils",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
});
