import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import ChatsLayout from "@/app/(workspace)/chat/layout.tsx";
import ChatsPage from "@/app/(workspace)/chat/page.tsx";
import WorkspaceLayout from "@/app/(workspace)/layout.tsx";
import type { ProjectId } from "@/ids.ts";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import {
  installThemeFonts,
  loadFonts,
} from "../../../themes/theme-fonts-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../../../touch-targets-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
} from "../../../viewports-test-kit.ts";
import { CENTRAL_CHAT, FOX_CHAT, FOX_PROJECT } from "../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);
vi.mock("@/projects/store.ts", () => ({
  listProjects: () => Promise.resolve([{ ...FOX_PROJECT, name: LONG_NAME }]),
}));
vi.mock("@/chats/all-chats.ts", () => ({
  listAllChats: () =>
    Promise.resolve([
      CENTRAL_CHAT,
      { ...FOX_CHAT, project: { ...FOX_CHAT.project, name: LONG_NAME } },
    ]),
}));
vi.mock("@/buddies/own-buddy-choices.ts", () => ({
  ownBuddyChoices: () => Promise.resolve([]),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(),
}));

vi.mock(
  "@/activities/activity-choices.ts",
  () => import("../../../activities/activity-choices-test-kit.ts"),
);
const LONG_NAME_REPEATS = 40;
const LONG_NAME = "Unbroken".repeat(LONG_NAME_REPEATS);
const TARGET_HEIGHT = 44;
const MODES = ["light", "dark"];
const NO_PARAMS = Promise.resolve({});
const PROJECT_CHOICES: readonly {
  choice: string;
  project: ProjectId | undefined;
  firstBuddy: string;
}[] = [
  { choice: "All", project: undefined, firstBuddy: CENTRAL_CHAT.buddy.name },
  {
    choice: "owned project",
    project: FOX_PROJECT.id,
    firstBuddy: FOX_CHAT.buddy.name,
  },
];

beforeAll(() => {
  installThemeFonts();
  signInAs(SIGNED_IN_USER);
});

afterEach(async () => {
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
});

async function renderChats(project: ProjectId | undefined): Promise<void> {
  const content = await ChatsPage({
    params: NO_PARAMS,
    searchParams: Promise.resolve({ project }),
  });
  await render(
    <WorkspaceLayout header={null} params={NO_PARAMS}>
      <ChatsLayout params={NO_PARAMS}>{content}</ChatsLayout>
    </WorkspaceLayout>,
  );
}

describe("all-chats composition on phones", () => {
  test("a saved project filter retains the complete list for local selection changes", async () => {
    await renderChats(FOX_PROJECT.id);
    const select = page.getByRole("combobox", {
      name: STANDALONE_CHATS_COPY.projectFilterLabel,
    });
    expect(page.getByRole("listitem").elements()).toHaveLength(1);
    await select.selectOptions("");
    expect(page.getByRole("listitem").elements()).toHaveLength(2);
    await expect
      .element(page.getByRole("listitem").first().getByRole("link"))
      .toHaveAccessibleName(CENTRAL_CHAT.buddy.name);
    await select.selectOptions(FOX_PROJECT.id);
    expect(page.getByRole("listitem").elements()).toHaveLength(1);
    await expect
      .element(page.getByRole("listitem").getByRole("link"))
      .toHaveAccessibleName(FOX_CHAT.buddy.name);
  });

  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    for (const theme of THEME_IDS) {
      for (const mode of MODES) {
        test.each(PROJECT_CHOICES)(
          `long unbroken project name with $choice selected at ${viewport.width}px in ${theme} ${mode}`,
          async ({ project, firstBuddy }) => {
            document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
            document.documentElement.setAttribute(MODE_ATTRIBUTE, mode);
            await page.viewport(viewport.width, viewport.height);
            await renderChats(project);
            await loadFonts();
            await expect.poll(() => window.innerWidth).toBe(viewport.width);
            expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
            expect(smallTargets(await measureTargets())).toEqual([]);
            const select = page.getByRole("combobox", {
              name: STANDALONE_CHATS_COPY.projectFilterLabel,
            });
            await expect.element(select).toHaveValue(project ?? "");
            for (const control of [select]) {
              const element = control.element();
              const box = element.getBoundingClientRect();
              expect(element.checkVisibility()).toBe(true);
              expect(box.height).toBeGreaterThanOrEqual(TARGET_HEIGHT);
              expect(box.left).toBeGreaterThanOrEqual(0);
              expect(box.right).toBeLessThanOrEqual(viewport.width);
            }
            const card = page.getByRole("listitem").last();
            const badgeElement = card
              .getByText(LONG_NAME, { exact: true })
              .element();
            expect(badgeElement.scrollWidth).toBeGreaterThan(
              badgeElement.clientWidth,
            );
            expect(getComputedStyle(badgeElement).textOverflow).toBe(
              "ellipsis",
            );
            expect(
              badgeElement.getBoundingClientRect().right,
            ).toBeLessThanOrEqual(viewport.width);
            await expect
              .element(card.getByRole("link"))
              .toHaveAccessibleName(FOX_CHAT.buddy.name);
            await expect
              .element(page.getByRole("listitem").first().getByRole("link"))
              .toHaveAccessibleName(firstBuddy);
            expect(matchMedia("(pointer: coarse)").matches).toBe(true);
          },
        );
      }
    }
  }
});
