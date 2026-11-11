// "use_case_use_on_phone" in use-cases, the header and its menu in Chromium
// and WebKit, in every theme: the header's bar takes one row at every
// width, the brand and the menu's button, so the page starts high on the
// screen. On a phone the brand is its medallion alone, still named for the
// site. The button stays a touch target's height (44 px), the brand at
// least WCAG 2.5.8's minimum (24 px), and nothing scrolls sideways. The
// open menu fits the narrowest phone, with every link a target's height.
// The header is laid out by width alone (no pointer media query in src/),
// so the test's viewport stands in for the phone. The theme fonts are
// loaded, since the site's name's width depends on them. The trail band
// under the bar: parent links leading into the page's one heading, which
// keeps its words while the parents shorten, and stays pinned while the bar
// scrolls away.
// test/component-integration/app/phone-pages.touch.browser.test.tsx checks every page's reflow
// and targets.
import type { JSX } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import {
  AccountLinks,
  HeaderBalance,
  SignedInLinks,
  SiteHeader,
  TrailBand,
} from "@/components/site-header.tsx";
import { SiteMenu } from "@/components/site-menu.tsx";
import { readGoldBalance } from "@/gold/gold-store.ts";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";
import { LIBRARY_COPY } from "@/ui/copy/library.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY, SITE_MENU_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";
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
import { tabForward } from "./keyboard-test-kit.ts";
import { closeMenu, menuButton, openMenu } from "./site-menu-test-kit.ts";

// site-header.tsx reads the session for SignedInLinks, server code.
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

vi.mock("@/gold/gold-store.ts", () => ({ readGoldBalance: vi.fn() }));

// Saving a theme choice is a round trip to the server, which
// save-theme-choice-action.server.test.ts covers.
const action = vi.hoisted(() => ({
  saveThemeChoiceAction: vi.fn<typeof saveThemeChoiceAction>(),
}));
vi.mock("@/themes/save-theme-choice-action.ts", () => action);

// The height of a button, as --target-size sets it in
// src/app/page-roles.css.
const BUTTON_HEIGHT_PX = 44;
const LOCATION_BALANCE = 870_000;
// Narrower than this (32rem), the brand is its medallion alone and a deeper
// trail leaves out its Quests link.
const PHONE_LAYOUT_BELOW_PX = 512;

// The menu's links, in their groups and order, by their names.
const PLACES = [
  PROJECTS_COPY.headerLink,
  CHAT_COPY.headerLink,
  LIBRARY_COPY.heading,
  WORKSHOP_COPY.heading,
  RETIREMENT_COPY.heading,
  GENERATION_COPY.heading,
] as const;
const YOU = [SETTINGS_COPY.headerLink] as const;

// The screens the header is checked on.
const SCREENS: readonly { name: string; viewport: ViewportSize }[] = [
  { name: "an iPhone 15", viewport: IPHONE_15_VIEWPORT },
  { name: "the narrowest phone", viewport: NARROWEST_VIEWPORT },
  { name: "a small tablet", viewport: { width: 544, height: 720 } },
  { name: "a tablet", viewport: { width: 800, height: 720 } },
  { name: "a laptop", viewport: LAPTOP_VIEWPORT },
];

// How many lines the text inside element takes.
function textLines(element: Element): number {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let lines = 0;
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.textContent?.trim() !== "") {
      range.selectNodeContents(node);
      lines += range.getClientRects().length;
    }
  }
  return lines;
}

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

function renderSignedIn(): ReturnType<typeof render> {
  return render(
    <SiteHeader
      links={
        <>
          <HeaderBalance microUsd={870_000} />
          <SiteMenu links={<AccountLinks />} />
        </>
      }
    />,
  );
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
          await expect
            .element(
              page.getByRole("link", { name: "Quick Note", exact: true }),
            )
            .not.toBeInTheDocument();
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
          expect(
            titleBox.width === BUTTON_HEIGHT_PX,
            "on a phone the brand is its medallion alone, a target wide",
          ).toBe(screen.viewport.width < PHONE_LAYOUT_BELOW_PX);
          expect(
            textLines(title.element()),
            "the brand's name is on one line",
          ).toBe(1);
          expect(titleBox.height).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX);
          expect(buttonBox.height).toBeGreaterThanOrEqual(BUTTON_HEIGHT_PX);
          expect(titleBox.right).toBeLessThanOrEqual(buttonBox.left);
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
          expect(links).toHaveLength(PLACES.length + YOU.length + 1);
          expect(
            links.filter((link) => heightOf(link) < BUTTON_HEIGHT_PX),
            `every link at least ${BUTTON_HEIGHT_PX} px tall`,
          ).toEqual([]);
        });
      }
    });
  }
});

test.each(SCREENS)(
  "Quests and Chat are reached through the menu on $name",
  async (screen) => {
    await setViewport(screen.viewport);
    await renderSignedIn();
    const header = page.getByRole("banner");
    expect(
      header.getByRole("link", { name: PROJECTS_COPY.headerLink }).query(),
    ).toBeNull();
    expect(
      header.getByRole("link", { name: CHAT_COPY.headerLink }).query(),
    ).toBeNull();
    await openMenu();
    await expect
      .element(
        page
          .getByRole("dialog")
          .getByRole("link", { name: PROJECTS_COPY.headerLink }),
      )
      .toHaveAttribute("href", "/projects");
    await expect
      .element(
        page
          .getByRole("dialog")
          .getByRole("link", { name: CHAT_COPY.headerLink }),
      )
      .toHaveAttribute("href", "/chat");
    await closeMenu();
  },
);

describe("the site menu", () => {
  test("groups Chats, Image gallery, Projects, Workshop apart from Settings, above the appearance choices and Credits", async () => {
    await renderSignedIn();
    await openMenu();

    expect(linkNames(SITE_MENU_COPY.placesLabel)).toEqual(PLACES);
    expect(linkNames(SITE_MENU_COPY.youLabel)).toEqual(YOU);
    await expect
      .element(page.getByRole("group", { name: THEME_COPY.modeLabel }))
      .toBeVisible();
    expect(
      page.getByRole("dialog").getByRole("link").elements().at(-1)?.textContent,
      "Credits ends the menu",
    ).toBe(CREDITS_COPY.menuLink);
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

  test("offers a visitor the appearance choices and Credits", async () => {
    await render(<SiteHeader />);
    await openMenu();

    await expect
      .element(
        page
          .getByRole("dialog")
          .getByRole("link", { name: CREDITS_COPY.menuLink }),
      )
      .toHaveAttribute("href", "/credits");
    await expect
      .element(page.getByRole("group", { name: THEME_COPY.modeLabel }))
      .toBeVisible();
  });
});

const LONG_NAME_REPEATS = 20;
const LONG_NAME = "Long quest and adventure name ".repeat(LONG_NAME_REPEATS);
// Enough lines of page to scroll the header away, on any screen.
const SCROLL_LINES = Array.from({ length: 200 }, (_, line) => `Line ${line}`);
const QUESTS: Breadcrumb = { label: PROJECTS_COPY.heading, href: "/projects" };

// The signed-in header with the trail band of items, as the @header slot
// renders it.
function bandedHeader(items: readonly Breadcrumb[]): JSX.Element {
  return (
    <SiteHeader
      links={
        <>
          <HeaderBalance microUsd={LOCATION_BALANCE} />
          <SiteMenu links={<AccountLinks />} />
          <TrailBand items={items} />
        </>
      }
    />
  );
}

function trailNavigation(): Locator {
  return page.getByRole("navigation", { name: SITE_COPY.breadcrumbs });
}

function pageHeading(): Locator {
  return page.getByRole("heading", { level: 1 });
}

describe("the trail band", () => {
  test.each(
    [NARROWEST_VIEWPORT, IPHONE_15_VIEWPORT, LAPTOP_VIEWPORT].flatMap(
      (viewport) => ["light", "dark"].map((mode) => ({ viewport, mode })),
    ),
  )(
    "keeps the main origin and header footprint from Quests to Settings at $viewport.width px in $mode",
    async ({ viewport, mode }) => {
      applyTheme("parchment", mode);
      signInAs(SIGNED_IN_USER);
      vi.mocked(readGoldBalance).mockResolvedValue(LOCATION_BALANCE);
      await setViewport(viewport);
      async function location(quests: boolean): Promise<JSX.Element> {
        let trail: readonly Breadcrumb[] = [{ label: PROJECTS_COPY.heading }];
        if (!quests) {
          trail = [QUESTS, { label: SETTINGS_COPY.heading }];
        }
        return (
          <>
            <SiteHeader links={await SignedInLinks({ breadcrumbs: trail })} />
            <main />
          </>
        );
      }
      const screen = await render(await location(true));
      await loadFonts();
      await expect
        .element(pageHeading())
        .toHaveTextContent(PROJECTS_COPY.heading);
      expect(
        page.getByRole("banner").getByRole("heading", { level: 1 }).elements(),
        "Quests' one heading is the band's",
      ).toHaveLength(1);
      await expect.element(trailNavigation()).not.toBeInTheDocument();
      const before = page
        .getByRole("banner")
        .element()
        .getBoundingClientRect()
        .toJSON();
      const main = page.getByRole("main").element();
      const origin = main.getBoundingClientRect().y;
      await screen.rerender(await location(false));
      await expect
        .element(pageHeading())
        .toHaveTextContent(SETTINGS_COPY.heading);
      expect(
        page.getByRole("banner").element().getBoundingClientRect().toJSON(),
      ).toEqual(before);
      expect(main.getBoundingClientRect().y).toBe(origin);
      await expect
        .element(
          trailNavigation().getByRole("link", { name: PROJECTS_COPY.heading }),
        )
        .toHaveAttribute("href", "/projects");
      await openMenu();
      await closeMenu();
      await screen.rerender(await location(true));
      expect(main.getBoundingClientRect().y).toBe(origin);
      expect(
        page.getByRole("banner").element().getBoundingClientRect().toJSON(),
      ).toEqual(before);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        viewport.width,
      );
    },
  );

  test("leads the parent links into the page's one heading, on the bar's row below", async () => {
    applyTheme("parchment");
    await setViewport(LAPTOP_VIEWPORT);
    await render(
      bandedHeader([
        QUESTS,
        { label: "Our quest", href: "/projects/quest" },
        { label: "Journal" },
      ]),
    );
    await loadFonts();
    const links = trailNavigation().getByRole("link").all();
    expect(links.map((link) => link.element().textContent)).toEqual([
      PROJECTS_COPY.heading,
      "Our quest",
    ]);
    await expect.element(pageHeading()).toHaveTextContent("Journal");
    expect(
      page.getByRole("heading", { level: 1 }).elements(),
      "one heading",
    ).toHaveLength(1);
    const heading = pageHeading().element().getBoundingClientRect();
    const brand = page
      .getByRole("link", { name: SITE_COPY.name })
      .element()
      .getBoundingClientRect();
    const menu = menuButton().element().getBoundingClientRect();
    expect(heading.top, "the band is under the bar").toBeGreaterThanOrEqual(
      Math.max(brand.bottom, menu.bottom),
    );
    for (const link of links) {
      const bounds = link.element().getBoundingClientRect();
      expect(bounds.right, "parents lead into the heading").toBeLessThan(
        heading.left,
      );
      expect(
        Math.abs(bounds.bottom - heading.bottom),
        "on the heading's line",
      ).toBeLessThan(heading.height);
    }
  });

  test("stays pinned while the bar scrolls away", async () => {
    applyTheme("parchment");
    await setViewport(IPHONE_15_VIEWPORT);
    await render(
      <>
        {bandedHeader([QUESTS, { label: LONG_NAME }])}
        <main>
          {SCROLL_LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </main>
      </>,
    );
    await loadFonts();
    window.scrollTo(0, window.innerHeight);
    await expect
      .poll(() => pageHeading().element().getBoundingClientRect().top)
      .toBeGreaterThanOrEqual(0);
    await expect.element(pageHeading()).toBeInViewport({ ratio: 1 });
    await expect
      .element(
        trailNavigation().getByRole("link", { name: PROJECTS_COPY.heading }),
      )
      .toBeInViewport({ ratio: 1 });
    await expect
      .element(page.getByRole("link", { name: SITE_COPY.name }))
      .not.toBeInViewport();
    await expect.element(menuButton()).not.toBeInViewport();
    window.scrollTo(0, 0);
  });

  for (const mode of ["light", "dark"]) {
    test(`long names shorten the parents, keep the heading's words and fit 320 px in ${mode}`, async () => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      const screen = await render(
        bandedHeader([
          QUESTS,
          { label: LONG_NAME, href: "/projects/quest" },
          { label: "Journal" },
        ]),
      );
      await loadFonts();
      await expect.element(trailNavigation()).toBeVisible();
      await expect
        .element(
          trailNavigation().getByRole("link", { name: PROJECTS_COPY.heading }),
        )
        .not.toBeInTheDocument();
      const parent = trailNavigation().getByRole("link", { name: LONG_NAME });
      expect(
        getComputedStyle(parent.element()).textOverflow,
        "the shortened parent ends in an ellipsis",
      ).toBe("ellipsis");
      expect(parent.element().scrollWidth).toBeGreaterThan(
        parent.element().clientWidth,
      );
      parent.element().focus();
      await expect.element(parent).toHaveFocus();
      const bounds = parent.element().getBoundingClientRect();
      expect(bounds.width).toBeGreaterThanOrEqual(BUTTON_HEIGHT_PX);
      expect(bounds.height).toBeGreaterThanOrEqual(BUTTON_HEIGHT_PX);
      await expect.element(pageHeading()).toHaveTextContent("Journal");
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
      await expect.element(menuButton()).toBeVisible();

      await screen.rerender(bandedHeader([QUESTS, { label: LONG_NAME }]));
      await expect
        .element(
          trailNavigation().getByRole("link", { name: PROJECTS_COPY.heading }),
        )
        .toBeVisible();
      const heading = pageHeading().element();
      expect(heading.textContent, "the heading keeps its words").toBe(
        LONG_NAME,
      );
      const lineHeight = Number.parseFloat(
        getComputedStyle(heading).lineHeight,
      );
      expect(
        heading.getBoundingClientRect().height,
        "on at most two lines",
      ).toBeLessThanOrEqual(lineHeight * 2 + 1);
      expect(
        heading.getBoundingClientRect().width,
        "the heading takes the room the parents give up",
      ).toBeGreaterThan(NARROWEST_VIEWPORT.width / 2);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );

      await screen.rerender(<SiteHeader />);
      await expect.element(trailNavigation()).not.toBeInTheDocument();
      await expect.element(pageHeading()).not.toBeInTheDocument();
    });
  }

  test("keeps the Quests link in deeper trails wider than a phone", async () => {
    await setViewport({ width: 544, height: 720 });
    await render(
      bandedHeader([
        QUESTS,
        { label: "Our quest", href: "/projects/quest" },
        { label: "Journal" },
      ]),
    );
    await expect
      .element(
        trailNavigation().getByRole("link", { name: PROJECTS_COPY.heading }),
      )
      .toBeVisible();
  });
});

describe("header battery balance", () => {
  test("signed-in session reads its balance and unavailable reads stay explicit", async () => {
    signInAs(SIGNED_IN_USER);
    vi.mocked(readGoldBalance).mockRejectedValueOnce(new Error("Unavailable"));
    await render(<SiteHeader links={await SignedInLinks()} />);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Batteries: Unavailable");
  });

  test("signed-out session supplies no balance", async () => {
    signOut();
    await render(<SiteHeader links={await SignedInLinks()} />);
    expect(page.getByRole("status").query()).toBeNull();
  });

  test.each(["light", "dark"])(
    "fits Quests and shared controls at 320px in %s",
    async (mode) => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      await render(
        <>
          <SiteHeader
            links={
              <>
                <HeaderBalance microUsd={870_000} />
                <SiteMenu links={<AccountLinks />} />
              </>
            }
          />
          <main>
            <h1>{PROJECTS_COPY.heading}</h1>
          </main>
        </>,
      );
      await expect.element(page.getByRole("status")).toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
      const balanceBox = page
        .getByRole("status")
        .element()
        .getBoundingClientRect();
      const menuBox = menuButton().element().getBoundingClientRect();
      expect(balanceBox.right).toBeLessThanOrEqual(menuBox.left);
      await tabForward();
      await expect
        .element(page.getByRole("link", { name: SITE_COPY.name }))
        .toHaveFocus();
    },
  );

  const Balances = [
    { microUsd: 0, shown: "0" },
    { microUsd: 9999, shown: "0" },
    { microUsd: 870_001, shown: "87" },
  ];
  test.each(Balances)(
    "rounds $microUsd like Account",
    async ({ microUsd, shown }) => {
      await render(<HeaderBalance microUsd={microUsd} />);
      await expect
        .element(page.getByRole("status"))
        .toHaveTextContent(`Batteries: ${shown}`);
    },
  );

  test("shows the balance on one line, named for screen readers", async () => {
    await render(<HeaderBalance microUsd={870_001} />);
    const balance = page.getByRole("status");
    await expect.element(balance).toHaveTextContent("Batteries: 87");
    const element = balance.element();
    const line = Number.parseFloat(getComputedStyle(element).lineHeight);
    expect(element.getBoundingClientRect().height).toBeLessThan(line * 2);
  });

  test("unavailable is distinct from zero", async () => {
    await render(<HeaderBalance microUsd={undefined} />);
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Batteries: Unavailable");
  });
});
