import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatProjectFilter } from "@/components/chat-project-filter.tsx";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { projectIdFixture } from "../id-fixtures.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  MINIMUM_TARGET_PX,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  type ViewportSize,
} from "../viewports-test-kit.ts";

const PROJECT_ID = projectIdFixture();
const COARSE_POINTER = "(pointer: coarse)";
const TARGET_HEIGHT_PX = 44;
const ENLARGED_TARGET_HEIGHT_PX = 64;
const LONG_NAME_REPEATS = 6;
const LONG_WORD_REPEATS = 30;
const LONG_WORD = "Extraordinary".repeat(LONG_WORD_REPEATS);
const LONG_NAMES: readonly { readonly kind: string; readonly name: string }[] =
  [
    {
      kind: "a long name",
      name: "A detailed sculpture of a fox exploring an orchard ".repeat(
        LONG_NAME_REPEATS,
      ),
    },
    { kind: "one long word", name: LONG_WORD },
  ];

interface TargetBounds {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly minHeight: number;
}

async function renderFilter(
  viewport: ViewportSize,
  name: string,
): Promise<void> {
  await page.viewport(viewport.width, viewport.height);
  await vi.waitFor(() => {
    if (window.innerWidth !== viewport.width) {
      throw new Error(`The viewport is ${window.innerWidth}px wide`);
    }
  });
  await render(
    inWorkspace(
      <ChatProjectFilter
        projects={[{ id: PROJECT_ID, name }]}
        selectedProjectId={PROJECT_ID}
      />,
    ),
  );
  await loadFonts();
}

function targetBounds(): readonly TargetBounds[] {
  const controls = [
    page.getByRole("combobox", {
      name: STANDALONE_CHATS_COPY.projectFilterLabel,
    }),
    page.getByRole("button", { name: STANDALONE_CHATS_COPY.showChats }),
  ];
  return controls.map((control) => {
    const element = control.element();
    const { width, height, left, right } = element.getBoundingClientRect();
    const minHeight = Number.parseFloat(getComputedStyle(element).minHeight);
    return { width, height, left, right, minHeight };
  });
}

beforeAll(() => {
  installThemeFonts();
});

afterEach(async () => {
  document.documentElement.style.removeProperty("--target-size");
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
});

describe("chat project filter on phones", () => {
  test("uses a touch screen", () => {
    expect(matchMedia(COARSE_POINTER).matches).toBe(true);
  });

  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    for (const theme of THEME_IDS) {
      for (const { kind, name } of LONG_NAMES) {
        test(`${kind} at ${viewport.width} px in ${theme}`, async () => {
          applyTheme(theme, "light");
          await renderFilter(viewport, name);

          await expect
            .element(page.getByRole("combobox"))
            .toHaveValue(PROJECT_ID);
          const option = page.getByRole("option", { name, exact: true });
          await expect.element(option).toHaveTextContent(name.trim());
          expect(option.element().textContent).toBe(name);
          for (const target of targetBounds()) {
            expect(target.minHeight).toBe(TARGET_HEIGHT_PX);
            expect(target.height).toBeGreaterThanOrEqual(TARGET_HEIGHT_PX);
            expect(target.width).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX);
            expect(target.left).toBeGreaterThanOrEqual(0);
            expect(target.right).toBeLessThanOrEqual(viewport.width);
          }
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
            viewport.width,
          );
        });
      }
    }
  }
});

describe("chat project filter target size", () => {
  for (const theme of THEME_IDS) {
    test(`both controls follow the target size token in ${theme}`, async () => {
      applyTheme(theme, "light");
      document.documentElement.style.setProperty("--target-size", "4rem");
      await renderFilter(NARROWEST_VIEWPORT, LONG_WORD);

      for (const target of targetBounds()) {
        expect(target.minHeight).toBe(ENLARGED_TARGET_HEIGHT_PX);
        expect(target.height).toBeGreaterThanOrEqual(ENLARGED_TARGET_HEIGHT_PX);
        expect(target.width).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX);
        expect(target.left).toBeGreaterThanOrEqual(0);
        expect(target.right).toBeLessThanOrEqual(NARROWEST_VIEWPORT.width);
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
    });
  }
});
