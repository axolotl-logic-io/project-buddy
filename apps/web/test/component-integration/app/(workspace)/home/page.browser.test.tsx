import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import HomePage from "@/app/(workspace)/home/page.tsx";
import { HomeAtlas } from "@/components/home-atlas.tsx";
import type { Today, TodayProject } from "@/today/today.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../auth/current-user-test-kit.ts";
import { tabForward } from "../../../components/keyboard-test-kit.ts";
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
  { name: "Chats", href: "/chat" },
  { name: "Guild", href: "/guild" },
  { name: "Activities", href: "/activities" },
  { name: "Spellbook", href: "/spellbook" },
  { name: "Image gallery", href: "/gallery" },
  { name: "Marketplace", href: "/marketplace" },
];

beforeEach(() => {
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
