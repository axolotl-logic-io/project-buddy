import { wcagContrast, wcagLuminance } from "culori";
import React, { type JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import HomeLoading from "@/app/(workspace)/home/loading.tsx";
import HomePage from "@/app/(workspace)/home/page.tsx";
import { HomeAtlas } from "@/components/home-atlas.tsx";
import { SignedInLinks, SiteHeader } from "@/components/site-header.tsx";
import { HomeFrame } from "@/components/ui/page-frame.tsx";
import type { TodayProject } from "@/today/today.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SITE_COPY, SITE_MENU_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../auth/current-user-test-kit.ts";
import { tabForward } from "../../../components/keyboard-test-kit.ts";
import {
  choose,
  closeMenu,
  openMenu,
} from "../../../components/site-menu-test-kit.ts";
import { applyTheme } from "../../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../../../viewports-test-kit.ts";
import { inSiteFrame } from "../../site-frame-test-kit.tsx";
import { inWorkspace } from "../../workspace-test-kit.tsx";
import { FOX_PROJECT } from "../page-fixtures.ts";

const stores = vi.hoisted(() => ({
  readHomeSummary:
    vi.fn<
      () => Promise<{
        latestQuest: TodayProject | undefined;
        firstVisit: boolean;
      }>
    >(),
}));
vi.mock("@/today/today-store.ts", () => stores);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);

// Cookie persistence and next-paint restoration have their own appearance
// tests; this browser integration exercises the visible Home palette.
vi.mock("@/themes/save-theme-choice-action.ts", () => ({
  saveThemeChoiceAction: vi.fn().mockResolvedValue(undefined),
}));

const TOUCH_TARGET_PX = 44;
const TEXT_CONTRAST = 4.5;

const LATEST: TodayProject = {
  project: { id: FOX_PROJECT.id, name: FOX_PROJECT.name },
  nextStep: "Shape the ears",
};
const DESTINATIONS = [
  { name: "Quests", href: "/projects" },
  { name: "Chat", href: "/chat" },
  { name: "Constructs", href: "/constructs" },
  { name: "Workshop", href: "/workshop" },
  { name: "Marketplace", href: "/marketplace" },
] as const;

beforeEach(() => {
  applyTheme("parchment");
  signInAs(SIGNED_IN_USER);
  stores.readHomeSummary.mockResolvedValue({
    latestQuest: undefined,
    firstVisit: true,
  });
});
afterEach(async () => {
  await commands.emulateColorScheme("light");
  vi.clearAllMocks();
});

function destinationLinks(): { name: string | null; href: string | null }[] {
  const places = page.getByRole("navigation", { name: HOME_COPY.placesLabel });
  return places
    .getByRole("link")
    .all()
    .map((link) => ({
      name: link.element().getAttribute("aria-label"),
      href: link.element().getAttribute("href"),
    }));
}

// Next keeps visited pages mounted in Activity boundaries during navigation.
function cachedPages(showHome: boolean): Promise<JSX.Element> {
  let homeMode: "visible" | "hidden" = "hidden";
  let captureMode: "visible" | "hidden" = "visible";
  if (showHome) {
    homeMode = "visible";
    captureMode = "hidden";
  }
  return inSiteFrame(
    <div className="page-column">
      <React.Activity mode={homeMode}>
        <HomeAtlas latestQuest={undefined} />
      </React.Activity>
      <React.Activity mode={captureMode}>
        <h1 className="page-heading">{QUICK_CAPTURE_COPY.heading}</h1>
        <p>{QUICK_CAPTURE_COPY.intro}</p>
      </React.Activity>
    </div>,
  );
}

describe("use_case_home_atlas", () => {
  test("offers every place and the quest start even before the first quest", async () => {
    await render(inWorkspace(await HomePage()));
    await expect
      .element(page.getByRole("heading", { level: 1, name: HOME_COPY.heading }))
      .toBeVisible();
    await expect.element(page.getByText(HOME_COPY.purpose)).toBeVisible();
    const startLink = page
      .getByRole("link", { name: HOME_COPY.newQuest })
      .element();
    const destination = new URL(
      startLink.getAttribute("href") ?? "",
      "https://example.com",
    );
    expect(destination.pathname).toBe("/projects");
    expect(destinationLinks()).toEqual(DESTINATIONS);
    await expect
      .element(page.getByRole("link", { name: "Spellbook", exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Image gallery", exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: HOME_COPY.account, exact: true }))
      .toHaveAttribute("href", "/account");
    await expect
      .element(
        page.getByRole("link", { name: HOME_COPY.settings, exact: true }),
      )
      .toHaveAttribute("href", "/settings");
    await expect
      .element(page.getByText("Next step:", { exact: true }))
      .not.toBeInTheDocument();
  });

  test.each(
    [
      { viewport: NARROWEST_VIEWPORT, columns: 2 },
      { viewport: PHONE_VIEWPORT, columns: 2 },
      { viewport: LAPTOP_VIEWPORT, columns: 3 },
    ].flatMap((layout) =>
      ["light", "dark"].map((mode) => ({ ...layout, mode })),
    ),
  )(
    "fits $columns columns at $viewport.width px in $mode mode with the quest below",
    async ({ viewport, columns, mode }) => {
      applyTheme("parchment", mode);
      await setViewport(viewport);
      await render(inWorkspace(<HomeAtlas latestQuest={LATEST} />));
      expect(destinationLinks()).toEqual(DESTINATIONS);
      const places = page.getByRole("navigation", {
        name: HOME_COPY.placesLabel,
      });
      await Promise.all(
        DESTINATIONS.map(async ({ name }) => {
          const link = places.getByRole("link", { name, exact: true });
          await expect.element(link).toBeVisible();
          const icon = link.element().querySelector("svg");
          expect(icon).not.toBeNull();
          expect(icon?.getAttribute("aria-hidden")).toBe("true");
          expect(icon?.getAttribute("focusable")).toBe("false");
          expect(icon?.getBoundingClientRect().width).toBe(24);
          expect(icon?.getBoundingClientRect().height).toBe(24);
          expect(icon && getComputedStyle(icon).stroke).toBe(
            getComputedStyle(link.element()).color,
          );
        }),
      );
      const boxes = places
        .getByRole("link")
        .all()
        .map((link) => link.element().getBoundingClientRect());
      const first = boxes.at(0);
      expect(first).toBeDefined();
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(viewport.width);
        expect(box.width).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
        expect(box.height).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
      }
      expect(boxes.slice(0, columns).map((box) => box.top)).toEqual(
        Array.from({ length: columns }, () => first?.top),
      );
      for (const box of boxes.slice(columns)) {
        expect(box.top).toBeGreaterThan(first?.top ?? 0);
      }
      const quest = page.getByRole("complementary", {
        name: HOME_COPY.continueLabel(LATEST.project.name),
      });
      expect(
        quest.element().getBoundingClientRect().top,
      ).toBeGreaterThanOrEqual(places.element().getBoundingClientRect().bottom);
      await expect
        .element(page.getByRole("button", { name: "Map", exact: true }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "List", exact: true }))
        .not.toBeInTheDocument();
      await expect
        .element(places.getByRole("link", { name: "Quests", exact: true }))
        .toHaveAccessibleDescription(HOME_COPY.quests);
    },
  );

  test("reaches all destinations before the current quest from the keyboard", async () => {
    await render(inWorkspace(<HomeAtlas latestQuest={LATEST} />));
    const places = page.getByRole("navigation", {
      name: HOME_COPY.placesLabel,
    });
    const [first, ...rest] = DESTINATIONS;
    places
      .getByRole("link", { name: first.name, exact: true })
      .element()
      .focus();
    await rest.reduce(async (previous, { name }) => {
      await previous;
      await tabForward();
      await expect
        .element(places.getByRole("link", { name, exact: true }))
        .toHaveFocus();
    }, Promise.resolve());
    await tabForward();
    await expect
      .element(
        page.getByRole("link", {
          name: HOME_COPY.continueLabel(LATEST.project.name),
          exact: true,
        }),
      )
      .toHaveFocus();
  });

  test("offers Start a quest after the places before the first quest", async () => {
    await render(inWorkspace(<HomeAtlas latestQuest={undefined} />));
    const places = page.getByRole("navigation", {
      name: HOME_COPY.placesLabel,
    });
    places
      .getByRole("link", { name: "Marketplace", exact: true })
      .element()
      .focus();
    await tabForward();
    const start = page.getByRole("link", { name: HOME_COPY.newQuest });
    await expect.element(start).toHaveFocus();
    expect(start.element().getBoundingClientRect().top).toBeGreaterThanOrEqual(
      places.element().getBoundingClientRect().bottom,
    );
  });

  test.each(["light", "dark"])(
    "keeps the shared header above Home at 320 px in %s mode",
    async (mode) => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      await render(
        await inSiteFrame(
          <div className="page-column">
            <HomeAtlas latestQuest={undefined} />
          </div>,
        ),
      );
      const header = page.getByRole("banner");
      await expect
        .element(header.getByRole("button", { name: SITE_MENU_COPY.title }))
        .toBeVisible();
      await expect
        .element(
          header.getByRole("link", { name: QUICK_CAPTURE_COPY.headerLink }),
        )
        .toBeVisible();
      await expect
        .element(header.getByRole("link", { name: SITE_COPY.name }))
        .toBeVisible();
      await expect
        .element(
          header.getByRole("navigation", { name: SITE_MENU_COPY.placesLabel }),
        )
        .not.toBeInTheDocument();
      const title = header.getByRole("link", { name: SITE_COPY.name });
      expect(title.element()).toHaveAttribute("href", "/home");
      const headerBox = header.element().getBoundingClientRect();
      const headingBox = page
        .getByRole("heading", { name: HOME_COPY.heading })
        .element()
        .getBoundingClientRect();
      expect(headerBox.left).toBe(0);
      expect(headerBox.width).toBe(NARROWEST_VIEWPORT.width);
      expect(headingBox.top).toBeGreaterThanOrEqual(headerBox.bottom);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
      title.element().focus();
      await tabForward();
      await expect
        .element(
          header.getByRole("link", { name: QUICK_CAPTURE_COPY.headerLink }),
        )
        .toHaveFocus();
      await tabForward();
      await expect
        .element(header.getByRole("button", { name: SITE_MENU_COPY.title }))
        .toHaveFocus();
    },
  );

  test("opens the Home menu against the viewport", async () => {
    await setViewport(PHONE_VIEWPORT);
    await render(
      await inSiteFrame(
        <div className="page-column">
          <HomeAtlas latestQuest={undefined} />
        </div>,
      ),
    );
    await openMenu();
    const menu = page.getByRole("dialog", { name: SITE_MENU_COPY.title });
    await expect.element(menu).toBeVisible();
    const box = menu.element().getBoundingClientRect();
    expect(box.top).toBe(0);
    expect(box.right).toBe(PHONE_VIEWPORT.width);
    expect(box.height).toBe(PHONE_VIEWPORT.height);
    await menu.getByRole("button", { name: SITE_MENU_COPY.close }).click();
    await expect.element(menu).not.toBeInTheDocument();
  });

  test("names the place a page belongs to in every other page's HUD", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    await render(
      <SiteHeader
        links={await SignedInLinks({ place: PROJECTS_COPY.heading })}
      />,
    );
    const header = page.getByRole("banner");
    await expect
      .element(header.getByRole("link", { name: SITE_COPY.name }))
      .toHaveAttribute("href", "/home");
    await expect
      .element(header.getByText(PROJECTS_COPY.heading, { exact: true }).first())
      .toBeVisible();
  });

  test("restores the page column and header when leaving a cached map", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    const screen = await render(await cachedPages(true));
    const homeBackground = getComputedStyle(document.body).backgroundImage;
    const header = page.getByRole("banner").element();
    const headerBoxOnHome = header.getBoundingClientRect().toJSON();
    const headerBackground = getComputedStyle(header).backgroundColor;
    const headerBorder = getComputedStyle(header).borderBottom;
    const title = page
      .getByRole("banner")
      .getByRole("link", { name: SITE_COPY.name });
    const capture = page.getByRole("heading", {
      name: QUICK_CAPTURE_COPY.heading,
      exact: true,
    });

    await screen.rerender(await cachedPages(false));
    await expect.element(title).toBeVisible();
    await expect.element(capture).toBeVisible();
    expect(header.getBoundingClientRect().toJSON()).toEqual(headerBoxOnHome);
    expect(getComputedStyle(header).backgroundColor).toBe(headerBackground);
    expect(getComputedStyle(header).borderBottom).toBe(headerBorder);
    expect(getComputedStyle(document.body).backgroundImage).not.toBe(
      homeBackground,
    );
    const headingBox = capture.element().getBoundingClientRect();
    const headerBox = page
      .getByRole("banner")
      .element()
      .getBoundingClientRect();
    expect(headingBox.top).toBeGreaterThan(headerBox.bottom);
    expect(headingBox.left).toBeGreaterThan(0);
    expect(headingBox.width).toBeLessThan(LAPTOP_VIEWPORT.width);

    await screen.rerender(await cachedPages(true));
    await expect
      .element(page.getByRole("heading", { name: HOME_COPY.heading }))
      .toBeVisible();
    await expect.element(title).toBeVisible();
    expect(getComputedStyle(document.body).backgroundImage).toBe(
      homeBackground,
    );

    await screen.rerender(await cachedPages(false));
    await expect.element(title).toBeVisible();
    expect(capture.element().getBoundingClientRect().toJSON()).toEqual(
      headingBox.toJSON(),
    );
    await screen.rerender(
      await inSiteFrame(
        <div className="page-column">
          <h1 className="page-heading">{QUICK_CAPTURE_COPY.heading}</h1>
          <p>{QUICK_CAPTURE_COPY.intro}</p>
        </div>,
      ),
    );
    expect(capture.element().getBoundingClientRect().toJSON()).toEqual(
      headingBox.toJSON(),
    );
  });

  test.each(["loading", "atlas"])(
    "dresses the page in the map only while a first-mounted %s is visible",
    async (kind) => {
      await setViewport(LAPTOP_VIEWPORT);
      function cached(mode: "visible" | "hidden"): Promise<JSX.Element> {
        let content = <HomeLoading />;
        if (kind === "atlas") {
          content = <HomeAtlas latestQuest={undefined} />;
        }
        return inSiteFrame(
          <HomeFrame>
            <React.Activity mode={mode}>{content}</React.Activity>
          </HomeFrame>,
        );
      }
      const screen = await render(
        await inSiteFrame(<h1>{QUICK_CAPTURE_COPY.heading}</h1>),
      );
      const paper = getComputedStyle(document.body).backgroundColor;
      const art = getComputedStyle(document.body).backgroundImage;
      await screen.rerender(await cached("hidden"));
      expect(getComputedStyle(document.body).backgroundColor).toBe(paper);
      expect(getComputedStyle(document.body).backgroundImage).toBe(art);
      await screen.rerender(await cached("visible"));
      await expect
        .element(page.getByRole("heading", { name: HOME_COPY.heading }))
        .toBeVisible();
      expect(getComputedStyle(document.body).backgroundImage).not.toBe(art);
      await screen.rerender(await cached("hidden"));
      expect(getComputedStyle(document.body).backgroundColor).toBe(paper);
      expect(getComputedStyle(document.body).backgroundImage).toBe(art);
    },
  );

  test.each(["light", "dark"])(
    "shows the map's artwork while Home loads, unchanged when Home arrives, in %s mode",
    async (mode) => {
      applyTheme("parchment", mode);
      await setViewport(LAPTOP_VIEWPORT);
      const screen = await render(
        await inSiteFrame(
          <HomeFrame>
            <HomeLoading />
          </HomeFrame>,
        ),
      );
      await expect
        .element(page.getByText(HOME_COPY.loading, { exact: true }))
        .toBeInTheDocument();
      const loadingArt = getComputedStyle(document.body).backgroundImage;
      const loadingPaper = getComputedStyle(document.body).backgroundColor;
      expect(loadingArt).toContain("parchment.webp");
      await screen.rerender(
        await inSiteFrame(
          <HomeFrame>
            <HomeAtlas latestQuest={undefined} />
          </HomeFrame>,
        ),
      );
      await expect
        .element(page.getByRole("navigation", { name: HOME_COPY.placesLabel }))
        .toBeVisible();
      expect(getComputedStyle(document.body).backgroundImage).toBe(loadingArt);
      expect(getComputedStyle(document.body).backgroundColor).toBe(
        loadingPaper,
      );
    },
  );

  test("keeps the header rectangle and main origin stable from loading to Home", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    const screen = await render(
      await inSiteFrame(
        <HomeFrame>
          <HomeLoading />
        </HomeFrame>,
      ),
    );
    const headerBox = page
      .getByRole("banner")
      .element()
      .getBoundingClientRect()
      .toJSON();
    const main = page.getByRole("main").element();
    const { x, y, width } = main.getBoundingClientRect();
    const column = main.firstElementChild;
    const columnBefore = column?.getBoundingClientRect();
    expect(columnBefore?.width).toBe(LAPTOP_VIEWPORT.width);
    await screen.rerender(
      await inSiteFrame(
        <HomeFrame>
          <HomeAtlas latestQuest={undefined} />
        </HomeFrame>,
      ),
    );
    expect(
      page.getByRole("banner").element().getBoundingClientRect().toJSON(),
    ).toEqual(headerBox);
    expect(main.getBoundingClientRect()).toMatchObject({ x, y, width });
    expect(column?.getBoundingClientRect()).toMatchObject({
      x: columnBefore?.x,
      y: columnBefore?.y,
      width: columnBefore?.width,
    });
  });

  test.each(["light", "dark"])(
    "keeps the HUD background, border and focus identical on both pages in %s mode",
    async (mode) => {
      await setViewport(LAPTOP_VIEWPORT);
      const screen = await render(await cachedPages(true));
      function hudAppearance(): {
        background: string;
        border: string;
        focus: string;
      } {
        const header = page.getByRole("banner").element();
        const title = page
          .getByRole("link", { name: SITE_COPY.name })
          .element();
        title.focus();
        const style = getComputedStyle(header);
        return {
          background: style.backgroundColor,
          border: style.borderBottom,
          focus: getComputedStyle(title).outline,
        };
      }
      const expected = hudAppearance();
      expect(expected.focus).toContain("3px");
      applyTheme("parchment", mode);
      expect(hudAppearance()).toEqual(expected);
      await screen.rerender(await cachedPages(false));
      expect(hudAppearance()).toEqual(expected);
      await screen.rerender(await cachedPages(true));
      expect(hudAppearance()).toEqual(expected);
    },
  );

  test.each([NARROWEST_VIEWPORT, LAPTOP_VIEWPORT])(
    "updates the map palette and destination text from the menu at $width px",
    async (viewport) => {
      await setViewport(viewport);
      const screen = await render(await cachedPages(true));
      const places = page.getByRole("navigation", {
        name: HOME_COPY.placesLabel,
      });
      const destination = places.getByRole("link", {
        name: "Quests",
        exact: true,
      });
      const lightArt = getComputedStyle(document.body).backgroundImage;
      const lightPaper = getComputedStyle(document.body).backgroundColor;
      await openMenu();
      await choose(THEME_COPY.modeLabel, THEME_COPY.modes.dark);
      await closeMenu();
      const darkPaper = getComputedStyle(document.body).backgroundColor;
      const darkArt = getComputedStyle(document.body).backgroundImage;
      expect(wcagLuminance(darkPaper)).toBeLessThan(wcagLuminance(lightPaper));
      expect(darkArt).not.toBe(lightArt);
      expect(darkArt).toContain("parchment.webp");
      const label = getComputedStyle(destination.element());
      expect(wcagContrast(label.color, darkPaper)).toBeGreaterThanOrEqual(
        TEXT_CONTRAST,
      );
      expect(document.body.scrollWidth).toBeLessThanOrEqual(viewport.width);
      expect(destinationLinks()).toEqual(DESTINATIONS);

      // Explicit Dark wins even when the browser requests Light.
      await commands.emulateColorScheme("light");
      expect(getComputedStyle(document.body).backgroundColor).toBe(darkPaper);
      await screen.rerender(await cachedPages(false));
      await screen.rerender(await cachedPages(true));
      expect(getComputedStyle(document.body).backgroundColor).toBe(darkPaper);

      await openMenu();
      await choose(THEME_COPY.modeLabel, THEME_COPY.modes.system);
      await closeMenu();
      expect(getComputedStyle(document.body).backgroundColor).toBe(lightPaper);
      await commands.emulateColorScheme("dark");
      expect(getComputedStyle(document.body).backgroundColor).toBe(darkPaper);
      expect(getComputedStyle(document.body).backgroundImage).toBe(darkArt);
      await commands.emulateColorScheme("light");
      expect(getComputedStyle(document.body).backgroundColor).toBe(lightPaper);
      await openMenu();
      await choose(THEME_COPY.modeLabel, THEME_COPY.modes.light);
      await closeMenu();
      await commands.emulateColorScheme("dark");
      expect(getComputedStyle(document.body).backgroundColor).toBe(lightPaper);
    },
  );

  test("requires sign-in before reading recent work", async () => {
    signOut();
    await expect(HomePage()).rejects.toThrow(SIGNED_OUT_REDIRECT);
    expect(stores.readHomeSummary).not.toHaveBeenCalled();
  });
});

describe("use_case_today_on_landing", () => {
  test("continues the most recent quest in its conversation, with its next step", async () => {
    stores.readHomeSummary.mockResolvedValue({
      latestQuest: LATEST,
      firstVisit: false,
    });
    await render(inWorkspace(await HomePage()));
    await expect
      .element(page.getByText(LATEST.project.name, { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByText(`${HOME_COPY.nextStep} ${LATEST.nextStep}`))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("link", {
          name: HOME_COPY.continueLabel(LATEST.project.name),
          exact: true,
        }),
      )
      .toHaveAttribute("href", `/projects/${LATEST.project.id}`);
  });

  test("shows no invented next step when memory records none", async () => {
    await render(
      inWorkspace(
        <HomeAtlas latestQuest={{ ...LATEST, nextStep: undefined }} />,
      ),
    );
    await expect
      .element(page.getByText(HOME_COPY.nextStep))
      .not.toBeInTheDocument();
    await expect
      .element(
        page.getByRole("link", {
          name: HOME_COPY.continueLabel(LATEST.project.name),
          exact: true,
        }),
      )
      .toHaveAttribute("href", `/projects/${LATEST.project.id}`);
  });
});
