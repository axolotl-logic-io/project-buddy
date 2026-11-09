import React, { type JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import HomePage from "@/app/(workspace)/home/page.tsx";
import { HomeAtlas } from "@/components/home-atlas.tsx";
import { SignedInLinks, SiteHeader } from "@/components/site-header.tsx";
import type { Today, TodayProject } from "@/today/today.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SITE_COPY, SITE_MENU_COPY } from "@/ui/copy/site.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../auth/current-user-test-kit.ts";
import { tabForward } from "../../../components/keyboard-test-kit.ts";
import { openMenu } from "../../../components/site-menu-test-kit.ts";
import { applyTheme } from "../../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../../../viewports-test-kit.ts";
import { inSiteFrame } from "../../site-frame-test-kit.tsx";
import { inWorkspace } from "../../workspace-test-kit.tsx";
import { FOX_CHAT, FOX_PROJECT } from "../page-fixtures.ts";

const stores = vi.hoisted(() => ({ readToday: vi.fn<() => Promise<Today>>() }));
vi.mock("@/today/today-store.ts", () => stores);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);

const TOUCH_TARGET_PX = 44;

const LATEST: TodayProject = {
  project: { id: FOX_PROJECT.id, name: FOX_PROJECT.name },
  latestChat: FOX_CHAT.id,
  nextStep: "Shape the ears",
};
const DESTINATIONS = [
  { name: "Quests", href: "/projects" },
  { name: "Adventures", href: "/chat" },
  { name: "Constructs", href: "/constructs" },
  { name: "Activities", href: "/activities" },
  { name: "Workshop", href: "/workshop" },
  { name: "Marketplace", href: "/marketplace" },
];

beforeEach(() => {
  applyTheme("parchment");
  signInAs(SIGNED_IN_USER);
  stores.readToday.mockResolvedValue({ projects: [], chats: [] });
});
afterEach(() => {
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
  test("offers every place and activity guidance even before the first quest", async () => {
    await render(inWorkspace(await HomePage()));
    await expect
      .element(page.getByRole("heading", { level: 1, name: HOME_COPY.heading }))
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: HOME_COPY.activitiesLink }))
      .toHaveAttribute("href", "/activities");
    await expect.element(page.getByText(HOME_COPY.purpose)).toBeVisible();
    const startLink = page
      .getByRole("link", { name: HOME_COPY.newQuest })
      .element();
    const destination = new URL(
      startLink.getAttribute("href") ?? "",
      "https://example.com",
    );
    expect(destination.pathname).toBe("/chats/new");
    expect(destination.searchParams.get("activity")).toBe("project-breakdown");
    expect(destination.searchParams.get("projectId")).toBe("new");
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
    page
      .getByRole("link", { name: HOME_COPY.activitiesLink })
      .element()
      .focus();
    const places = page.getByRole("navigation", {
      name: HOME_COPY.placesLabel,
    });
    await DESTINATIONS.reduce(async (previous, { name }) => {
      await previous;
      await tabForward();
      await expect
        .element(places.getByRole("link", { name, exact: true }))
        .toHaveFocus();
    }, Promise.resolve());
    await tabForward();
    await expect
      .element(
        page.getByRole("link", { name: LATEST.project.name, exact: true }),
      )
      .toHaveFocus();
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

  test("keeps the site name, Quick Note and menu over the map", async () => {
    await setViewport(LAPTOP_VIEWPORT);
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
  });

  test("opens the Home menu against the viewport rather than the frosted header", async () => {
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

  test("requires sign-in before reading recent work", async () => {
    signOut();
    await expect(HomePage()).rejects.toThrow(SIGNED_OUT_REDIRECT);
    expect(stores.readToday).not.toHaveBeenCalled();
  });
});

describe("use_case_today_on_landing", () => {
  test("continues the most recent quest's real chat and next step", async () => {
    stores.readToday.mockResolvedValue({ projects: [LATEST], chats: [] });
    await render(inWorkspace(await HomePage()));
    await expect
      .element(
        page.getByRole("link", { name: LATEST.project.name, exact: true }),
      )
      .toHaveAttribute("href", `/projects/${LATEST.project.id}`);
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
      .toHaveAttribute("href", `/chats/${LATEST.latestChat}`);
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
      .toHaveAttribute("href", `/chats/${LATEST.latestChat}`);
  });
});
