// "use_case_use_on_phone" in use-cases, the header and its menu in Chromium
// and WebKit, in every theme: the header takes one row at every width, the
// site's name and the menu's button, so the page starts high on the
// screen. The button stays a touch target's height (44 px), the site's name
// at least WCAG 2.5.8's minimum (24 px), and nothing scrolls sideways. The
// open menu fits the narrowest phone, with every link a target's height.
// The header is laid out by width alone (no pointer media query in src/),
// so the test's viewport stands in for the phone. The theme fonts are
// loaded, since the site's name's width depends on them.
// test/app/phone-pages.touch.browser.test.tsx checks every page's reflow
// and targets.
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AccountLinks, SiteHeader } from "@/components/site-header.tsx";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY, SITE_MENU_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  IPHONE_15_VIEWPORT,
  LAPTOP_VIEWPORT,
  MINIMUM_TARGET_PX,
  NARROWEST_VIEWPORT,
  setViewport,
  type ViewportSize,
} from "../viewports-test-kit.ts";
import { closeMenu, menuButton, openMenu } from "./site-menu-test-kit.ts";

// site-header.tsx reads the session for SignedInLinks, server code.
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

// Saving a theme choice is a round trip to the server, which
// save-theme-choice-action.server.test.ts covers.
const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

// The height of a button, as --target-size sets it in
// src/app/page-roles.css.
const BUTTON_HEIGHT_PX = 44;

// The menu's links, in their groups and order, by their names.
const PLACES = [
  CHAT_COPY.headerLink,
  PROJECTS_COPY.headerLink,
  BUDDIES_COPY.headerLink,
] as const;
const YOU = [SETTINGS_COPY.headerLink, ACCOUNT_COPY.headerLink] as const;

// The screens the header is checked on.
const SCREENS: readonly { name: string; viewport: ViewportSize }[] = [
  { name: "an iPhone 15", viewport: IPHONE_15_VIEWPORT },
  { name: "the narrowest phone", viewport: NARROWEST_VIEWPORT },
  { name: "a laptop", viewport: LAPTOP_VIEWPORT },
];

function heightOf(target: Locator): number {
  return target.element().getBoundingClientRect().height;
}

// The names of the links in the menu's list labelled label, in order.
function linkNames(label: string): readonly string[] {
  return page
    .getByRole("list", { name: label })
    .getByRole("link")
    .elements()
    .map((link) => link.textContent);
}

// Stops a clicked link from leaving the test's page.
function stayOnThisPage(event: MouseEvent): void {
  event.preventDefault();
}

async function renderSignedIn(): Promise<void> {
  await render(<SiteHeader links={<AccountLinks />} />);
}

beforeAll(() => {
  installThemeFonts();
});

afterEach(async () => {
  action.saveThemeChoiceAction.mockReset();
  await setViewport(LAPTOP_VIEWPORT);
});

describe("use_case_use_on_phone", () => {
  for (const screen of SCREENS) {
    describe(`the signed-in header on ${screen.name}`, () => {
      for (const theme of THEME_IDS) {
        test(`in ${theme}`, async () => {
          applyTheme(theme);
          await setViewport(screen.viewport);
          await renderSignedIn();
          await expect.element(menuButton()).toBeVisible();
          await loadFonts();

          const title = page
            .getByRole("banner")
            .getByRole("link", { name: SITE_COPY.name });
          expect(
            getComputedStyle(title.element()).fontFamily,
            "the site's name is in a loaded theme font",
          ).toContain("test kit");
          const titleBox = title.element().getBoundingClientRect();
          const buttonBox = menuButton().element().getBoundingClientRect();
          expect(
            titleBox.bottom > buttonBox.top && buttonBox.bottom > titleBox.top,
            "the site's name and the menu's button share one row",
          ).toBe(true);
          expect(titleBox.height).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX);
          expect(buttonBox.height).toBeGreaterThanOrEqual(BUTTON_HEIGHT_PX);
          expect(
            document.documentElement.scrollWidth,
            "no sideways scroll",
          ).toBeLessThanOrEqual(screen.viewport.width);

          await openMenu();
          const panel = page
            .getByRole("dialog", { name: SITE_MENU_COPY.title })
            .element()
            .getBoundingClientRect();
          expect(panel.left, "the menu starts on the screen").toBeGreaterThan(
            0,
          );
          expect(
            panel.right,
            "the menu ends on the screen",
          ).toBeLessThanOrEqual(screen.viewport.width);
          const links = page.getByRole("dialog").getByRole("link").all();
          expect(links).toHaveLength(PLACES.length + YOU.length);
          expect(
            links.filter((link) => heightOf(link) < BUTTON_HEIGHT_PX),
            `every link at least ${BUTTON_HEIGHT_PX} px tall`,
          ).toEqual([]);
        });
      }
    });
  }
});

describe("the site menu", () => {
  test("groups Chats, Projects and Buddies apart from Settings and Account, above the appearance choices", async () => {
    await renderSignedIn();
    await openMenu();

    expect(linkNames(SITE_MENU_COPY.placesLabel)).toEqual(PLACES);
    expect(linkNames(SITE_MENU_COPY.youLabel)).toEqual(YOU);
    await expect
      .element(page.getByRole("group", { name: THEME_COPY.themeLabel }))
      .toBeVisible();
    await expect
      .element(page.getByRole("group", { name: THEME_COPY.modeLabel }))
      .toBeVisible();
  });

  test("its links are in the page while it is closed, for the first HTML", async () => {
    await renderSignedIn();

    expect(menuButton().element()).toHaveAttribute("aria-expanded", "false");
    expect(
      [...document.querySelectorAll("a")].map((link) => link.textContent),
    ).toEqual(expect.arrayContaining([...PLACES, ...YOU]));
    expect(page.getByRole("dialog").query()).toBeNull();
  });

  test("opens from the keyboard, and Escape closes it and returns focus to its button", async () => {
    await renderSignedIn();
    menuButton().element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByRole("dialog")).toBeVisible();
    expect(menuButton().element()).toHaveAttribute("aria-expanded", "true");

    await closeMenu();
    expect(document.activeElement).toBe(menuButton().element());
    expect(menuButton().element()).toHaveAttribute("aria-expanded", "false");
  });

  test("its close button closes it", async () => {
    await renderSignedIn();
    await openMenu();
    await page.getByRole("button", { name: SITE_MENU_COPY.close }).click();

    await expect.poll(() => page.getByRole("dialog").query()).toBeNull();
  });

  test("following one of its links closes it", async () => {
    // Keep the test's page: the link's own navigation is Next's to test.
    globalThis.addEventListener("click", stayOnThisPage, { capture: true });
    try {
      await renderSignedIn();
      await openMenu();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: PROJECTS_COPY.headerLink })
        .click();

      await expect.poll(() => page.getByRole("dialog").query()).toBeNull();
    } finally {
      globalThis.removeEventListener("click", stayOnThisPage, {
        capture: true,
      });
    }
  });

  test("leaves the page beside it undimmed", async () => {
    await renderSignedIn();
    await openMenu();
    const dialog = page.getByRole("dialog").element();

    expect(getComputedStyle(dialog, "::backdrop").backgroundColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
  });

  test("offers a visitor the appearance choices and no links", async () => {
    await render(<SiteHeader />);
    await openMenu();

    expect(page.getByRole("dialog").getByRole("link").all()).toEqual([]);
    await expect
      .element(page.getByRole("group", { name: THEME_COPY.themeLabel }))
      .toBeVisible();
  });
});
