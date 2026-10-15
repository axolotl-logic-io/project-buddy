// "use_case_hide_extras" in use-cases/appearance.md, on the Settings page,
// in Chromium and WebKit: a switch hides its extra on the page at once and
// shows it again, and in every theme the page fits the narrowest screen
// with each switch a touch target tall. The page renders without the
// workspace layout around it; e2e/mobile.spec.ts checks Settings at 320 px
// inside it. That each extra hides only itself is
// src/flags/hide-extras.browser.test.tsx's to check; keeping the choice
// across a reload and a sign-in is e2e/hide-extras.spec.ts's. The site's
// stylesheet comes from vitest.browser-setup.ts.
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { HIDE_ATTRIBUTE } from "@/flags/flag-choice.ts";
import { extraTag, FLAGS } from "@/flags/flags.ts";
import type { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { installThemeFonts } from "@/themes/theme-fonts-test-kit.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";
import { NARROWEST_VIEWPORT } from "../../../../e2e/viewports.ts";
import SettingsPage from "./page.tsx";

// Saving the choice to her account is a round trip to the server, which
// e2e/settings-follow-user.spec.ts covers.
const action = vi.hoisted(() => ({
  saveHiddenFlagsAction: vi.fn<typeof saveHiddenFlagsAction>(),
}));
vi.mock("@/flags/save-hidden-flags-action.ts", () => action);

// Vitest's own viewport for browser tests, restored after each test.
const VITEST_VIEWPORT = { width: 414, height: 896 } as const;

// The least height of a switch's target where the layout allows it (WCAG
// 2.5.5).
const TARGET_HEIGHT = 44;

const WORKING_NOTE = "A working note";
const workingNote = page.getByText(WORKING_NOTE);

// Resizes the page and waits until it has laid out at the new width.
async function resize(viewport: {
  readonly width: number;
  readonly height: number;
}): Promise<void> {
  await page.viewport(viewport.width, viewport.height);
  await vi.waitFor(() => {
    if (window.innerWidth !== viewport.width) {
      throw new Error(`The page is ${window.innerWidth}px wide`);
    }
  });
  await document.fonts.ready;
}

// The height of each switch's row: the switch's label, which holds its
// words and is its touch target.
function switchRowHeights(): number[] {
  return page
    .getByRole("switch")
    .elements()
    .map((control) => {
      if (!(control instanceof HTMLButtonElement)) {
        return 0;
      }
      return control.labels[0]?.getBoundingClientRect().height ?? 0;
    });
}

beforeAll(() => {
  installThemeFonts();
});

beforeEach(() => {
  action.saveHiddenFlagsAction.mockResolvedValue();
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
});

afterEach(async () => {
  document.documentElement.removeAttribute(HIDE_ATTRIBUTE);
  vi.clearAllMocks();
  await resize(VITEST_VIEWPORT);
});

describe("use_case_hide_extras", () => {
  test("a switch hides its extra on the page at once, and shows it again", async () => {
    await render(
      <>
        <SettingsPage />
        <p {...extraTag("working-notes")}>{WORKING_NOTE}</p>
      </>,
    );
    const control = page.getByRole("switch", {
      name: FLAG_COPY.workingNotes.label,
    });
    await expect.element(workingNote).toBeVisible();

    await control.click();
    await expect.element(control).not.toBeChecked();
    await expect.element(workingNote).not.toBeVisible();

    await control.click();
    await expect.element(control).toBeChecked();
    await expect.element(workingNote).toBeVisible();
  });

  for (const theme of THEME_IDS) {
    test(`Settings fits the narrowest screen, with switches easy to tap, in ${theme}`, async () => {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
      await render(<SettingsPage />);
      await expect.element(page.getByRole("switch").last()).toBeVisible();
      await resize(NARROWEST_VIEWPORT);

      const root = document.documentElement;
      expect(root.scrollWidth - root.clientWidth).toBeLessThanOrEqual(0);
      const heights = switchRowHeights();
      expect(heights).toHaveLength(FLAGS.length);
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(TARGET_HEIGHT);
    });
  }
});
