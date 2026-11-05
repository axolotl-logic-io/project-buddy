import React, { type JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
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
import { applyTheme } from "../../../themes/theme-test-kit.ts";
import { LAPTOP_VIEWPORT, setViewport } from "../../../viewports-test-kit.ts";
import { inSiteFrame } from "../../site-frame-test-kit.tsx";
import { inWorkspace } from "../../workspace-test-kit.tsx";
import { FOX_CHAT, FOX_PROJECT } from "../page-fixtures.ts";

const stores = vi.hoisted(() => ({ readToday: vi.fn<() => Promise<Today>>() }));
vi.mock("@/today/today-store.ts", () => stores);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);

const LATEST: TodayProject = {
  project: { id: FOX_PROJECT.id, name: FOX_PROJECT.name },
  latestChat: FOX_CHAT.id,
  nextStep: "Shape the ears",
};
const DESTINATIONS = [
  { name: "Quests", href: "/projects" },
  { name: "Adventures", href: "/chat" },
  { name: "Guild", href: "/guild" },
  { name: "Activities", href: "/activities" },
  { name: "Spellbook", href: "/spellbook" },
  { name: "Workshop", href: "/workshop" },
  { name: "Image gallery", href: "/gallery" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Settings", href: "/settings" },
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
    await expect
      .element(page.getByRole("link", { name: HOME_COPY.newQuest }))
      .toHaveAttribute("href", "/chats/new?activity=interview");
    expect(destinationLinks()).toEqual(DESTINATIONS);
    await expect
      .element(page.getByText("Next step:", { exact: true }))
      .not.toBeInTheDocument();
  });

  test("changes presentation from the keyboard without changing destinations", async () => {
    await render(inWorkspace(<HomeAtlas latestQuest={undefined} />));
    const map = page.getByRole("button", { name: HOME_COPY.map, exact: true });
    const list = page.getByRole("button", {
      name: HOME_COPY.list,
      exact: true,
    });
    map.element().focus();
    await tabForward();
    await expect.element(list).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(list).toHaveAttribute("aria-pressed", "true");
    await expect.element(map).toHaveAttribute("aria-pressed", "false");
    expect(destinationLinks()).toEqual(DESTINATIONS);
    await expect.element(page.getByText(HOME_COPY.quests)).toBeVisible();
    await map.click();
    await expect.element(map).toHaveAttribute("aria-pressed", "true");
    expect(destinationLinks()).toEqual(DESTINATIONS);
  });

  test("leaves the header's bar off the map but keeps its buttons", async () => {
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
      .not.toBeInTheDocument();
    await expect
      .element(
        header.getByRole("navigation", { name: SITE_MENU_COPY.placesLabel }),
      )
      .not.toBeInTheDocument();
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
    await expect.element(title).not.toBeInTheDocument();

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
