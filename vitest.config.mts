import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Vitest blanks every CSS import unless it matches here. The contrast
    // test (src/themes/contrast.test.ts) reads the theme CSS as text.
    css: { include: [/\/src\/themes\/[^/]+\.css/u] },
    // Playwright owns e2e/; its specs cannot run under Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
