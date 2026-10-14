import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { configDefaults, defineConfig } from "vitest/config";
import type { BrowserCommandContext } from "vitest/node";

// Vitest blanks every CSS import unless it matches here. The theme tests
// (src/themes/contrast.test.ts and the others) read the theme CSS as text,
// src/themes/streamdown-names.test.ts reads every stylesheet in src/, and
// the browser tests render with the site's stylesheet.
const SRC_CSS = { include: [/\/src\/.+\.css/u] };
const BROWSER_TESTS = "src/**/*.browser.test.tsx";

// Switches the system color scheme the page under test sees
// (src/browser-test-kit.ts declares it for the tests).
async function emulateColorScheme(
  context: BrowserCommandContext,
  colorScheme: "light" | "dark",
): Promise<void> {
  await context.page.emulateMedia({ colorScheme });
}

// Projects inherit these root options; arrays such as setupFiles would be
// concatenated, so each project sets its own.
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          css: SRC_CSS,
          // Playwright owns e2e/; its specs cannot run under Vitest. The
          // browser project runs the browser tests.
          exclude: [...configDefaults.exclude, "e2e/**", BROWSER_TESTS],
        },
      },
      {
        // The site's Markdown is styled by Tailwind utilities generated from
        // globals.css; Next builds them with @tailwindcss/turbopack.
        plugins: [tailwindcss()],
        // Next's client code, such as next/link, reads process.env, which
        // only Node defines. Vite still replaces process.env.NODE_ENV.
        define: { "process.env": "{}" },
        test: {
          name: "browser",
          include: [BROWSER_TESTS],
          setupFiles: ["./vitest.browser-setup.ts"],
          css: SRC_CSS,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }, { browser: "webkit" }],
            commands: { emulateColorScheme },
          },
        },
      },
    ],
  },
});
