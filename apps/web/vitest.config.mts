import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import {
  type PlaywrightProviderOptions,
  playwright,
} from "@vitest/browser-playwright";
import {
  configDefaults,
  defineConfig,
  type TestProjectInlineConfiguration,
} from "vitest/config";
import type { BrowserCommandContext } from "vitest/node";
import { prebundledBrowserDeps } from "./vitest.browser-deps.mts";
import { servedSyntaxCheck } from "./vitest.browser-syntax.mts";

// Vitest blanks every CSS import unless it matches here. The theme tests
// (src/themes/contrast.test.ts and the others) read the theme CSS as text,
// src/themes/streamdown-names.test.ts reads every stylesheet in src/, and
// the browser tests render with the site's stylesheet.
const SRC_CSS = { include: [/\/src\/.+\.css/u] };
const BROWSER_TESTS = "src/**/*.browser.test.tsx";
// Tests against the test database, which vitest.server.config.mts runs.
const SERVER_TESTS = "src/**/*.server.test.ts";
// Browser tests that need the browser's time zone, run by a browser-<zone>
// project for each of ZONES rather than in the machine's zone.
const ZONED_BROWSER_TESTS = "src/**/*.zoned.browser.test.tsx";
// Browser tests that need a touch screen, such as the phone checks, run by
// the browser-touch project, whose pages have touch on (hasTouch). Touch
// can't be turned on per test. isMobile stays off: Vitest renders the test
// in an iframe, so it would scale the runner's page, not the page under test.
const TOUCH_BROWSER_TESTS = "src/**/*.touch.browser.test.tsx";

// The zones the zoned browser tests run in, each with a locale used there:
// two zones on either side of UTC, where the server renders times, so the
// browser's zone is told apart from the server's and from the machine's.
const ZONES = [
  { timezoneId: "America/New_York", locale: "en-US" },
  { timezoneId: "Asia/Tokyo", locale: "ja-JP" },
] as const;

// Switches the system color scheme the page under test sees
// (src/browser-test-kit.ts declares it for the tests).
async function emulateColorScheme(
  context: BrowserCommandContext,
  colorScheme: "light" | "dark",
): Promise<void> {
  await context.page.emulateMedia({ colorScheme });
}

// The site's stylesheet and Next's client code, for every browser project.
// The site's Markdown is styled by Tailwind utilities generated from
// globals.css; Next builds them with @tailwindcss/turbopack. Next's client
// code, such as next/link, reads process.env, which only Node defines. Vite
// still replaces process.env.NODE_ENV. prebundledBrowserDeps fixes the
// dependencies Vite pre-bundles, so none is optimized mid-run.
// servedSyntaxCheck logs where a module served to the browser doesn't parse,
// so a test file that fails to import with a SyntaxError names the module
// and the position in its transformed code (#386).
const BROWSER_PROJECT = {
  plugins: [tailwindcss(), prebundledBrowserDeps(), servedSyntaxCheck()],
  define: { "process.env": "{}" },
};

// A browser project, name, for the browser tests include matches, whose
// pages are opened with contextOptions. An instance's provider replaces the
// project's rather than merging with it, and Vitest makes one browser
// context per test file, so each instance has its own.
function contextBrowserProject(
  name: string,
  include: string,
  contextOptions: NonNullable<PlaywrightProviderOptions["contextOptions"]>,
): TestProjectInlineConfiguration {
  return {
    ...BROWSER_PROJECT,
    test: {
      name,
      include: [include],
      setupFiles: ["./vitest.browser-setup.ts"],
      css: SRC_CSS,
      browser: {
        enabled: true,
        headless: true,
        instances: [
          {
            browser: "chromium",
            provider: playwright({ contextOptions }),
          },
          {
            browser: "webkit",
            provider: playwright({ contextOptions }),
          },
        ],
        commands: { emulateColorScheme },
      },
    },
  };
}

// A browser project for the zoned browser tests in zone.
function zonedBrowserProject({
  timezoneId,
  locale,
}: (typeof ZONES)[number]): TestProjectInlineConfiguration {
  return contextBrowserProject(`browser-${timezoneId}`, ZONED_BROWSER_TESTS, {
    timezoneId,
    locale,
  });
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
          // browser project runs the browser tests, and `npm run
          // test:server` the server tests.
          exclude: [
            ...configDefaults.exclude,
            "e2e/**",
            BROWSER_TESTS,
            SERVER_TESTS,
          ],
        },
      },
      {
        ...BROWSER_PROJECT,
        test: {
          name: "browser",
          include: [BROWSER_TESTS],
          // The browser-<zone> and browser-touch projects run these.
          exclude: [
            ...configDefaults.exclude,
            ZONED_BROWSER_TESTS,
            TOUCH_BROWSER_TESTS,
          ],
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
      ...ZONES.map(zonedBrowserProject),
      contextBrowserProject("browser-touch", TOUCH_BROWSER_TESTS, {
        hasTouch: true,
      }),
    ],
  },
});
