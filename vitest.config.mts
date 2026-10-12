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
    // Vitest blanks every CSS import unless it matches here. The theme tests
    // (src/themes/contrast.test.ts and the others) read the theme CSS as
    // text, and src/themes/streamdown-names.test.ts reads every stylesheet in
    // src/.
    css: { include: [/\/src\/.+\.css/u] },
    // Playwright owns e2e/; its specs cannot run under Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
