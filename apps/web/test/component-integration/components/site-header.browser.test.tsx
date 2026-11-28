// The pinned page header and its site panel in Chromium and WebKit.

import type { JSX } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { commands, type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { AccountLinks, PageHeader } from "@/components/page-header.tsx";
import { SignedInHeader } from "@/components/signed-in-header.tsx";
import { SitePanel } from "@/components/site-panel.tsx";
import { TrailBand } from "@/components/trail-band.tsx";
import { THEME_IDS } from "@/themes/themes.ts";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { QUICK_ADD_COPY } from "@/ui/copy/quick-add.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY, SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { animationsSettled } from "../../support/animations-test-kit.ts";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../themes/theme-fonts-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  IPHONE_15_VIEWPORT,
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
  type ViewportSize,
} from "../viewports-test-kit.ts";
import { usePathname, useSearchParams } from "./router-test-kit.ts";
import {
  closeButton,
  closePanel,
  openPanel,
  panelButton,
  sitePanel,
} from "./site-panel-test-kit.ts";

// SignedInHeader reads the session and reports experience gains.
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../experience/experience-store-test-kit.ts"),
);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

// The height of a button, as --target-size sets it in
// src/app/page-roles.css.
const BUTTON_HEIGHT_PX = 44;
const MAX_SINGLE_ROW_HEIGHT_PX = 56;

// The site panel's links, in their groups and order, by their names.
const PLACES = [
  HOME_COPY.headerLink,
  QUESTS_COPY.headerLink,
  GRIMOIRE_COPY.heading,
  TIMER_COPY.panelLink,
] as const;
const YOU = [PROFILE_COPY.headerLink, SETTINGS_COPY.headerLink] as const;

// The screens the header is checked on.
const SCREENS: readonly { name: string; viewport: ViewportSize }[] = [
  { name: "an iPhone 15", viewport: IPHONE_15_VIEWPORT },
  { name: "the narrowest phone", viewport: NARROWEST_VIEWPORT },
  { name: "a small tablet", viewport: { width: 544, height: 720 } },
  { name: "a tablet", viewport: { width: 800, height: 720 } },
  { name: "a laptop", viewport: LAPTOP_VIEWPORT },
];

function heightOf(target: Locator): number {
  return target.element().getBoundingClientRect().height;
}

// The names of the links in the panel's list labelled label, in order.
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

const SIGNED_IN_PANEL: JSX.Element = <SitePanel links={<AccountLinks />} />;

function renderSignedIn(): ReturnType<typeof render> {
  return render(<PageHeader panel={SIGNED_IN_PANEL} />);
}

// The page under the header, in signedInFrame.
const PAGE_TEXT = "The page";

// The signed-in header over a page, as the root layout renders them.
function signedInFrame(): JSX.Element {
  return (
    <>
      <PageHeader panel={<SitePanel links={<AccountLinks />} />} />
      <main>
        <p>{PAGE_TEXT}</p>
      </main>
    </>
  );
}

beforeAll(async () => {
  // The layout assertions measure the drawer at rest.
  await commands.reduceMotion();
  installThemeFonts();
});

beforeEach(() => {
  applyTheme("parchment");
  usePathname.mockReset();
  useSearchParams.mockReset();
});

afterEach(async () => {
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
          await expect.element(panelButton()).toBeVisible();
          await expect
            .element(
              page.getByRole("link", {
                name: QUICK_ADD_COPY.panelItem,
                exact: true,
              }),
            )
            .not.toBeInTheDocument();
          const buttonBox = panelButton().element().getBoundingClientRect();
          const headerBox = page
            .getByRole("banner")
            .element()
            .getBoundingClientRect();
          expect(buttonBox.height).toBeGreaterThanOrEqual(BUTTON_HEIGHT_PX);
          expect(
            buttonBox.top,
            "the panel's button is inside the header",
          ).toBeGreaterThanOrEqual(headerBox.top);
          expect(buttonBox.bottom).toBeLessThanOrEqual(headerBox.bottom);
          expect(
            buttonBox.right,
            "the panel's button is on the left, where the panel opens",
          ).toBeLessThan(screen.viewport.width / 2);
          expect(
            document.documentElement.scrollWidth,
            "no sideways scroll",
          ).toBeLessThanOrEqual(screen.viewport.width);

          await openPanel();
          const panel = sitePanel().element().getBoundingClientRect();
          expect(panel.left, "the panel is on the left").toBe(0);
          const closeBox = closeButton().element().getBoundingClientRect();
          expect(
            [closeBox.left, closeBox.top],
            "the panel's close button lines up with its expand button",
          ).toEqual([buttonBox.left, buttonBox.top]);
          expect(
            panel.top,
            "the panel opens from the breadcrumb row",
          ).toBeLessThanOrEqual(buttonBox.top);
          expect(panel.right, "the panel ends on the screen").toBeLessThan(
            screen.viewport.width,
          );
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
  "Quests is reached through the site panel on $name",
  async (screen) => {
    await setViewport(screen.viewport);
    await renderSignedIn();
    const header = page.getByRole("banner");
    expect(
      header.getByRole("link", { name: QUESTS_COPY.headerLink }).query(),
    ).toBeNull();
    await openPanel();
    await expect
      .element(sitePanel().getByRole("link", { name: QUESTS_COPY.headerLink }))
      .toHaveAttribute("href", "/quests");
    await closePanel();
  },
);

describe("the site panel", () => {
  test("groups Home, Quests and Grimoire apart from Profile and Settings, above the appearance choices and Credits", async () => {
    await renderSignedIn();
    await openPanel();

    expect(linkNames(SITE_PANEL_COPY.placesLabel)).toEqual(PLACES);
    expect(linkNames(SITE_PANEL_COPY.youLabel)).toEqual(YOU);
    expect(
      page.getByText("Appearance", { exact: true }).elements(),
    ).toHaveLength(0);
    await expect
      .element(page.getByRole("group", { name: THEME_COPY.modeLabel }))
      .toBeVisible();
    expect(
      page.getByRole("dialog").getByRole("link").elements().at(-1)?.textContent,
      "Credits ends the panel",
    ).toBe(CREDITS_COPY.panelLink);
  });

  test("its links are in the page while it is closed, for the first HTML", async () => {
    await renderSignedIn();

    expect(panelButton().element()).toHaveAttribute("aria-expanded", "false");
    expect(
      [...document.querySelectorAll("a")].map((link) => link.textContent),
    ).toEqual(expect.arrayContaining([...PLACES, ...YOU]));
    expect(page.getByRole("dialog").query()).toBeNull();
  });

  test("on a phone, opens as a drawer from the keyboard, and Escape closes it and returns focus to its button", async () => {
    await setViewport(PHONE_VIEWPORT);
    await renderSignedIn();
    panelButton().element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(sitePanel()).toBeVisible();
    expect(sitePanel().element().matches(":modal"), "a modal drawer").toBe(
      true,
    );
    expect(closeButton().element()).toHaveAttribute("aria-expanded", "true");
    await expect.element(closeButton()).toHaveFocus();

    await closePanel();
    expect(document.activeElement).toBe(panelButton().element());
    expect(panelButton().element()).toHaveAttribute("aria-expanded", "false");
  });

  for (const viewport of [PHONE_VIEWPORT, LAPTOP_VIEWPORT]) {
    test(`its close button closes it and returns focus to its button at ${viewport.width} px`, async () => {
      await setViewport(viewport);
      await renderSignedIn();
      await openPanel();
      await sitePanel()
        .getByRole("button", { name: SITE_PANEL_COPY.close })
        .click();

      await expect.poll(() => sitePanel().query()).toBeNull();
      await expect.element(panelButton()).toHaveFocus();
      expect(panelButton().element()).toHaveAttribute("aria-expanded", "false");
    });
  }

  for (const viewport of [PHONE_VIEWPORT, LAPTOP_VIEWPORT]) {
    test(`following its link to the current page closes it at ${viewport.width} px`, async () => {
      await setViewport(viewport);
      usePathname.mockReturnValue("/quests");
      await renderSignedIn();
      await openPanel();
      // Stop the browser's navigation after React handles the click.
      globalThis.addEventListener("click", stayOnThisPage);
      try {
        await sitePanel()
          .getByRole("link", { name: QUESTS_COPY.headerLink })
          .click();
      } finally {
        globalThis.removeEventListener("click", stayOnThisPage);
      }

      await expect
        .element(panelButton())
        .toHaveAttribute("aria-expanded", "false");
    });

    test(`navigation closes it at ${viewport.width} px`, async () => {
      await setViewport(viewport);
      usePathname.mockReturnValue("/grimoire");
      const screen = await render(signedInFrame());
      await openPanel();

      useSearchParams.mockReturnValue(new URLSearchParams("filter=forgotten"));
      await screen.rerender(signedInFrame());
      await expect
        .element(panelButton())
        .toHaveAttribute("aria-expanded", "false");

      await openPanel();
      usePathname.mockReturnValue("/quests");
      await screen.rerender(signedInFrame());
      await expect
        .element(panelButton())
        .toHaveAttribute("aria-expanded", "false");

      usePathname.mockReturnValue("/grimoire");
      await screen.rerender(signedInFrame());
      await expect
        .element(panelButton())
        .toHaveAttribute("aria-expanded", "false");
      await openPanel();

      await screen.unmount();
      await render(signedInFrame());
      await expect
        .element(panelButton())
        .toHaveAttribute("aria-expanded", "false");
    });
  }

  test("on a wide screen, following its link to another page keeps it docked until that page shows", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    usePathname.mockReturnValue("/grimoire");
    const screen = await render(signedInFrame());
    await openPanel();
    globalThis.addEventListener("click", stayOnThisPage);
    try {
      await sitePanel()
        .getByRole("link", { name: QUESTS_COPY.headerLink })
        .click();
    } finally {
      globalThis.removeEventListener("click", stayOnThisPage);
    }
    // The page header stays put until the page changes with it.
    await expect.element(sitePanel()).toBeVisible();

    usePathname.mockReturnValue("/quests");
    await screen.rerender(signedInFrame());
    await expect
      .element(panelButton())
      .toHaveAttribute("aria-expanded", "false");
  });

  test("leaves the page beside its drawer undimmed", async () => {
    await setViewport(PHONE_VIEWPORT);
    await renderSignedIn();
    await openPanel();
    const dialog = sitePanel().element();

    expect(getComputedStyle(dialog, "::backdrop").backgroundColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
  });

  test("on a wide screen, docks over the page, which keeps its size and flow", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    await render(signedInFrame());
    // Where the page's content starts, and how wide it is.
    function pageBox(): { readonly left: number; readonly width: number } {
      const { left, width } = page
        .getByText(PAGE_TEXT)
        .element()
        .getBoundingClientRect();
      return { left, width };
    }
    const closedBox = pageBox();
    await openPanel();
    expect(
      sitePanel().element().matches(":modal"),
      "the page beside it stays in reach",
    ).toBe(false);
    await expect.element(closeButton()).toHaveFocus();
    const panel = sitePanel().element().getBoundingClientRect();
    expect(pageBox(), "the page stays where it was").toEqual(closedBox);
    expect(
      panel.right,
      "the panel lies over the page's left edge",
    ).toBeGreaterThan(closedBox.left);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      LAPTOP_VIEWPORT.width,
    );

    // A click on the page leaves it open.
    await page.getByText(PAGE_TEXT).click();
    await expect.element(sitePanel()).toBeVisible();
  });

  test("offers a visitor the appearance choices and Credits", async () => {
    await render(<PageHeader />);
    await openPanel();

    await expect
      .element(
        page
          .getByRole("dialog")
          .getByRole("link", { name: CREDITS_COPY.panelLink }),
      )
      .toHaveAttribute("href", "/credits");
    await expect
      .element(page.getByRole("group", { name: THEME_COPY.modeLabel }))
      .toBeVisible();
  });
});

const LONG_NAME_REPEATS = 20;
const LONG_NAME = "Long quest and performance name ".repeat(LONG_NAME_REPEATS);
// Enough lines to scroll the page on any screen.
const SCROLL_LINES = Array.from({ length: 200 }, (_, line) => `Line ${line}`);
const QUESTS: Breadcrumb = { label: QUESTS_COPY.heading, href: "/quests" };

// The signed-in header with the trail band of items, as the @header slot
// renders it.
function bandedHeader(items: readonly Breadcrumb[]): JSX.Element {
  return (
    <PageHeader panel={SIGNED_IN_PANEL} trail={<TrailBand items={items} />} />
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
      await setViewport(viewport);
      async function location(quests: boolean): Promise<JSX.Element> {
        let trail: readonly Breadcrumb[] = [{ label: QUESTS_COPY.heading }];
        if (!quests) {
          trail = [QUESTS, { label: SETTINGS_COPY.heading }];
        }
        return (
          <>
            {await SignedInHeader({ breadcrumbs: trail })}
            <main />
          </>
        );
      }
      const screen = await render(await location(true));
      await loadFonts();
      await expect
        .element(pageHeading())
        .toHaveTextContent(QUESTS_COPY.heading);
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
      expect(before.top).toBe(0);
      expect(origin).toBeLessThanOrEqual(MAX_SINGLE_ROW_HEIGHT_PX);
      await expect
        .element(page.getByRole("link", { name: SITE_COPY.name }))
        .not.toBeInTheDocument();
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
          trailNavigation().getByRole("link", { name: QUESTS_COPY.heading }),
        )
        .toHaveAttribute("href", "/quests");
      await openPanel();
      await closePanel();
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

  test("leads the parent links into the page's one heading", async () => {
    applyTheme("parchment");
    await setViewport(LAPTOP_VIEWPORT);
    await render(
      bandedHeader([
        QUESTS,
        { label: "Our quest", href: "/quests/quest" },
        { label: "Members" },
      ]),
    );
    await loadFonts();
    const links = trailNavigation().getByRole("link").all();
    expect(links.map((link) => link.element().textContent)).toEqual([
      QUESTS_COPY.heading,
      "Our quest",
    ]);
    await expect.element(pageHeading()).toHaveTextContent("Members");
    expect(
      page.getByRole("heading", { level: 1 }).elements(),
      "one heading",
    ).toHaveLength(1);
    const heading = pageHeading().element().getBoundingClientRect();
    expect(
      panelButton().element().getBoundingClientRect().top,
      "the panel's button is alongside the breadcrumb heading",
    ).toBeLessThanOrEqual(heading.bottom);
    expect(
      panelButton().element().getBoundingClientRect().bottom,
    ).toBeGreaterThanOrEqual(heading.top);
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

  test("stays pinned while the page scrolls", async () => {
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
        trailNavigation().getByRole("link", { name: QUESTS_COPY.heading }),
      )
      .toBeInViewport({ ratio: 1 });
    // The panel's expand button stays pinned with the breadcrumbs.
    await expect.element(panelButton()).toBeInViewport({ ratio: 1 });
    const expandBounds = panelButton().element().getBoundingClientRect();
    panelButton().element().focus({ preventScroll: true });
    await userEvent.keyboard("{Enter}");
    await expect.element(sitePanel()).toBeVisible();
    await animationsSettled(sitePanel().element(), "The site panel");
    const closeBounds = closeButton().element().getBoundingClientRect();
    expect([closeBounds.left, closeBounds.top]).toEqual([
      expandBounds.left,
      expandBounds.top,
    ]);
    await closePanel();
    window.scrollTo(0, 0);
  });

  for (const mode of ["light", "dark"]) {
    test(`long names shorten the parents, keep the heading's words and fit 320 px in ${mode}`, async () => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      const screen = await render(
        bandedHeader([
          QUESTS,
          { label: LONG_NAME, href: "/quests/quest" },
          { label: "Members" },
        ]),
      );
      await loadFonts();
      await expect.element(trailNavigation()).toBeVisible();
      await expect
        .element(
          trailNavigation().getByRole("link", { name: QUESTS_COPY.heading }),
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
      await expect.element(pageHeading()).toHaveTextContent("Members");
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
      await expect.element(panelButton()).toBeVisible();

      await screen.rerender(bandedHeader([QUESTS, { label: LONG_NAME }]));
      await expect
        .element(
          trailNavigation().getByRole("link", { name: QUESTS_COPY.heading }),
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

      await screen.rerender(<PageHeader />);
      await expect.element(trailNavigation()).not.toBeInTheDocument();
      await expect.element(pageHeading()).not.toBeInTheDocument();
    });
  }

  test("keeps the Quests link in deeper trails wider than a phone", async () => {
    await setViewport({ width: 544, height: 720 });
    await render(
      bandedHeader([
        QUESTS,
        { label: "Our quest", href: "/quests/quest" },
        { label: "Members" },
      ]),
    );
    await expect
      .element(
        trailNavigation().getByRole("link", { name: QUESTS_COPY.heading }),
      )
      .toBeVisible();
  });
});

vi.mock("next/navigation", () => import("./router-test-kit.ts"));
