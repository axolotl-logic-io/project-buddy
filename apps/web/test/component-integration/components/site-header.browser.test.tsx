// "use_case_use_on_phone" in use-cases, the header and its site panel in
// Chromium and WebKit, in every theme: the header's bar takes one row at
// every width, so the page starts high on the screen. On a phone the brand
// is its medallion alone, still named for the site. The site panel's button
// sits at the breadcrumb row's left end; the close button lines up with
// it inside the open panel. The button stays a touch target's height (44 px), the
// brand at least WCAG 2.5.8's minimum (24 px), and nothing scrolls
// sideways. The open panel, on the left under the header, fits the
// narrowest phone, with every link a target's height. On a wide screen the
// panel docks over the page, which keeps its size and flow (#999).
// The header is laid out by width alone (no pointer media query in src/),
// so the test's viewport stands in for the phone. The theme fonts are
// loaded, since the site's name's width depends on them. The trail band
// under the bar: parent links leading into the page's one heading, which
// keeps its words while the parents shorten, and stays pinned while the bar
// scrolls away.
// test/component-integration/app/phone-pages.touch.browser.test.tsx checks every page's reflow
// and targets.

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
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { SignedInHeader } from "@/components/signed-in-header.tsx";
import {
  AccountLinks,
  SiteHeader,
  TrailBand,
} from "@/components/site-header.tsx";
import { SitePanel } from "@/components/site-panel.tsx";
import type { saveThemeChoiceAction } from "@/themes/save-theme-choice-action.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SITE_COPY, SITE_PANEL_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { MABEL_EXPERIENCE } from "../experience/experience-store-test-kit.ts";
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
  PHONE_VIEWPORT,
  setViewport,
  type ViewportSize,
} from "../viewports-test-kit.ts";
import {
  closeButton,
  closePanel,
  openPanel,
  panelButton,
  sitePanel,
} from "./site-panel-test-kit.ts";

// SignedInHeader reads the session, and the ring of the user's circle reads
// their experience: server code.
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../experience/experience-store-test-kit.ts"),
);
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
// Narrower than this (32rem), the brand is its medallion alone and a deeper
// trail leaves out its Quests link.
const PHONE_LAYOUT_BELOW_PX = 512;

// The site panel's links, in their groups and order, by their names.
const PLACES = [
  QUESTS_COPY.headerLink,
  WORKSHOP_COPY.heading,
  TIMER_COPY.panelLink,
  RETIREMENT_COPY.heading,
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
  return render(<SiteHeader panel={SIGNED_IN_PANEL} />);
}

// The page under the header, in signedInFrame.
const PAGE_TEXT = "The page";

// The signed-in header over a page, as the root layout renders them.
function signedInFrame(): JSX.Element {
  return (
    <>
      <SiteHeader panel={SIGNED_IN_PANEL} />
      <main>
        <p>{PAGE_TEXT}</p>
      </main>
    </>
  );
}

beforeAll(() => {
  installThemeFonts();
});

beforeEach(() => {
  applyTheme("parchment");
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
          await expect.element(panelButton()).toBeVisible();
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
          const buttonBox = panelButton().element().getBoundingClientRect();
          const headerBox = page
            .getByRole("banner")
            .element()
            .getBoundingClientRect();
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
          expect(
            buttonBox.top,
            "the panel's button is inside the header",
          ).toBeGreaterThanOrEqual(headerBox.top);
          expect(buttonBox.bottom).toBeLessThanOrEqual(headerBox.bottom);
          expect(buttonBox.top).toBeGreaterThanOrEqual(titleBox.bottom);
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

// How much of the ring is left unfilled: the arc's dash offset over its
// length.
function unfilledFraction(arc: Element): number {
  return (
    Number(arc.getAttribute("stroke-dashoffset")) /
    Number(arc.getAttribute("stroke-dasharray"))
  );
}

describe("use_case_experience_ring", () => {
  test.each(SCREENS)(
    "the ring of the user's circle fills toward the next one, at the bar's right end, on $name",
    async (screen) => {
      applyTheme("parchment");
      signInAs(SIGNED_IN_USER);
      await setViewport(screen.viewport);
      await render(await SignedInHeader());
      const { circle, title, experience, circleStart, nextCircleStart } =
        MABEL_EXPERIENCE;
      const ring = page.getByRole("banner").getByRole("link", {
        name: EXPERIENCE_COPY.progress(
          circle,
          title,
          nextCircleStart - experience,
          circle + 1,
        ),
      });
      await expect.element(ring).toHaveAttribute("href", "/profile#experience");
      await expect.element(ring).toHaveTextContent(String(circle));
      const arc = ring.element().querySelector(".circle-progress-arc");
      if (arc === null) {
        throw new Error("The ring has no arc");
      }
      expect(unfilledFraction(arc)).toBeCloseTo(
        (nextCircleStart - experience) / (nextCircleStart - circleStart),
      );
      const ringBox = ring.element().getBoundingClientRect();
      const titleBox = page
        .getByRole("link", { name: SITE_COPY.name })
        .element()
        .getBoundingClientRect();
      expect(ringBox.height).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX);
      expect(titleBox.right <= ringBox.left, "the brand, then the ring").toBe(
        true,
      );
      expect(
        ringBox.bottom > titleBox.top && titleBox.bottom > ringBox.top,
        "the ring and the brand share one row",
      ).toBe(true);
      const bar = page.getByRole("banner").element().getBoundingClientRect();
      expect(
        bar.right - ringBox.right,
        "the ring ends the bar, on its right",
      ).toBeLessThanOrEqual(
        Number.parseFloat(
          getComputedStyle(page.getByRole("banner").element()).paddingRight,
        ) + 1,
      );
      expect(
        document.documentElement.scrollWidth,
        "no sideways scroll",
      ).toBeLessThanOrEqual(screen.viewport.width);
    },
  );
});

describe("the site panel", () => {
  test("groups Quests and Workshop apart from Profile and Settings, above the appearance choices and Credits", async () => {
    await renderSignedIn();
    await openPanel();

    expect(linkNames(SITE_PANEL_COPY.placesLabel)).toEqual(PLACES);
    expect(linkNames(SITE_PANEL_COPY.youLabel)).toEqual(YOU);
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

  test("following one of its links closes its drawer", async () => {
    await setViewport(PHONE_VIEWPORT);
    // Keep the test's page: the link's own navigation is Next's to test.
    globalThis.addEventListener("click", stayOnThisPage, { capture: true });
    try {
      await renderSignedIn();
      await openPanel();
      await sitePanel()
        .getByRole("link", { name: QUESTS_COPY.headerLink })
        .click();

      await expect.poll(() => sitePanel().query()).toBeNull();
    } finally {
      globalThis.removeEventListener("click", stayOnThisPage, {
        capture: true,
      });
    }
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

  test("on a wide screen, docks over the page, which keeps its size and flow, and stays open from page to page until closed", async () => {
    applyTheme("parchment");
    await setViewport(LAPTOP_VIEWPORT);
    // Keep the test's page: the link's own navigation is Next's to test.
    globalThis.addEventListener("click", stayOnThisPage, { capture: true });
    try {
      const screen = await render(signedInFrame());
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

      await sitePanel()
        .getByRole("link", { name: QUESTS_COPY.headerLink })
        .click();
      await expect.element(sitePanel()).toBeVisible();

      // The next page, or the same one reloaded, renders the panel afresh.
      await screen.unmount();
      await render(signedInFrame());
      await expect.element(sitePanel()).toBeVisible();
      expect(closeButton().element()).toHaveAttribute("aria-expanded", "true");
      expect(
        document.activeElement,
        "a panel docked on load leaves focus on the page",
      ).not.toBe(closeButton().element());

      await closeButton().click();
      await expect.poll(() => sitePanel().query()).toBeNull();
      await expect.element(panelButton()).toHaveFocus();
      expect(pageBox(), "the page stays where it was").toEqual(closedBox);
    } finally {
      globalThis.removeEventListener("click", stayOnThisPage, {
        capture: true,
      });
    }
  });

  test("offers a visitor the appearance choices and Credits", async () => {
    await render(<SiteHeader />);
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
const LONG_NAME = "Long quest and adventure name ".repeat(LONG_NAME_REPEATS);
// Enough lines of page to scroll the header away, on any screen.
const SCROLL_LINES = Array.from({ length: 200 }, (_, line) => `Line ${line}`);
const QUESTS: Breadcrumb = { label: QUESTS_COPY.heading, href: "/quests" };

// The signed-in header with the trail band of items, as the @header slot
// renders it.
function bandedHeader(items: readonly Breadcrumb[]): JSX.Element {
  return (
    <SiteHeader panel={SIGNED_IN_PANEL} trail={<TrailBand items={items} />} />
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

  test("leads the parent links into the page's one heading, on the bar's row below", async () => {
    applyTheme("parchment");
    await setViewport(LAPTOP_VIEWPORT);
    await render(
      bandedHeader([
        QUESTS,
        { label: "Our quest", href: "/quests/quest" },
        { label: "Journal" },
      ]),
    );
    await loadFonts();
    const links = trailNavigation().getByRole("link").all();
    expect(links.map((link) => link.element().textContent)).toEqual([
      QUESTS_COPY.heading,
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
    expect(heading.top, "the band is under the bar").toBeGreaterThanOrEqual(
      brand.bottom,
    );
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
        trailNavigation().getByRole("link", { name: QUESTS_COPY.heading }),
      )
      .toBeInViewport({ ratio: 1 });
    await expect
      .element(page.getByRole("link", { name: SITE_COPY.name }))
      .not.toBeInViewport();
    // The panel's expand button stays pinned with the breadcrumbs.
    await expect.element(panelButton()).toBeInViewport({ ratio: 1 });
    const expandBounds = panelButton().element().getBoundingClientRect();
    panelButton().element().focus({ preventScroll: true });
    await userEvent.keyboard("{Enter}");
    await expect.element(sitePanel()).toBeVisible();
    await Promise.all(
      sitePanel()
        .element()
        .getAnimations()
        .map((animation) => animation.finished),
    );
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
          { label: "Journal" },
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
      await expect.element(pageHeading()).toHaveTextContent("Journal");
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
        { label: "Our quest", href: "/quests/quest" },
        { label: "Journal" },
      ]),
    );
    await expect
      .element(
        trailNavigation().getByRole("link", { name: QUESTS_COPY.heading }),
      )
      .toBeVisible();
  });
});
