import { FOX_QUEST } from "./(workspace)/page-fixtures.ts";
import { LINK_USER } from "./phone-pages-fixtures.ts";
// Every page of the site, as the phone checks render it
// (phone-pages.touch.browser.test.tsx): each page's components, from fixed
// data, in its layouts and the site's frame. A new page gets an entry in
// PHONE_PAGES. The test file mocks the stores and actions these pages read,
// and current-user.ts with current-user-test-kit.ts, so each entry sets the
// stores' answers through vi.mocked and signs in or out.

import type { JSX } from "react";
import { vi } from "vitest";
import { page } from "vitest/browser";
import { readSignInLinkUser } from "@/accounts/sign-in-links.ts";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import RitePage from "@/app/(workspace)/grimoire/[riteId]/page.tsx";
import GrimoirePage from "@/app/(workspace)/grimoire/page.tsx";
import HomePage from "@/app/(workspace)/page.tsx";
import ProfileLayout from "@/app/(workspace)/profile/layout.tsx";
import ProfilePage from "@/app/(workspace)/profile/page.tsx";
import QuestListLayout from "@/app/(workspace)/quests/(list)/layout.tsx";
import QuestsPage from "@/app/(workspace)/quests/(list)/page.tsx";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import SettingsLayout from "@/app/(workspace)/settings/layout.tsx";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";

import TimerPage from "@/app/(workspace)/timer/[work]/[break]/[start]/page.tsx";
import TimerLayout from "@/app/(workspace)/timer/layout.tsx";
import TimerSetupPage from "@/app/(workspace)/timer/page.tsx";
import CreditsPage from "@/app/credits/page.tsx";
import SignInLinkPage from "@/app/login/link/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import SignUpPage from "@/app/signup/page.tsx";

import { readLife, readQuestEntries } from "@/quests/quest-index-store.ts";
import { getQuest, listQuests } from "@/quests/store.ts";
import { BUILT_IN_RITES } from "@/rites/rite.ts";
import { listRites, readRite } from "@/rites/rite-store.ts";
import { readStreakQuests } from "@/streaks/streak-store.ts";
import { readTaskQuests } from "@/tasks/task-store.ts";

import { NEW_QUEST_COPY, QUEST_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";

import { TIMER_COPY } from "@/ui/copy/timer.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";

import { STREAK_QUEST } from "../streaks/streak-quest-fixtures.ts";
import { inWorkspace } from "./workspace-test-kit.tsx";

// One page as the phone checks render it.

interface PhonePage {
  readonly wrappedTabRowsAt320?: readonly string[];
  readonly name: string;
  // Sets the page's data, signs in or out, and returns the page in its
  // layouts, without the site's frame.
  readonly render: () => Promise<JSX.Element>;
  // The page's path, which the header slot builds its trail band from, for
  // a signed-in page with a place in the site.
  readonly path?: readonly string[];
  // The names of buttons laid out only once on screen, which the check
  // waits for and then checks it measured.
  readonly laidOutWhenShown?: readonly string[];
  // Opens what the page shows only on request, such as a dialog, once the
  // page has loaded and before the check measures it.
  readonly open?: () => Promise<void>;
}

// A sign-in link's token, in the shape links have.
const LONG_QUEST_NAME_REPEATS = 40;
const LONG_QUEST_NAME = "Unbroken".repeat(LONG_QUEST_NAME_REPEATS);
const LINK_TOKEN = "Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3";
const NO_PARAMS: Promise<Record<string, never>> = Promise.resolve({});
const QUEST_PARAMS = Promise.resolve({ questId: FOX_QUEST.id });
const QUESTS_PATH = ["quests"] as const;
const QUEST_PATH = ["quests", FOX_QUEST.id] as const;

// A page signed out, as a visitor sees it.
function signedOut(content: () => JSX.Element): () => Promise<JSX.Element> {
  return (): Promise<JSX.Element> => {
    signOut();
    return Promise.resolve(content());
  };
}

// A sign-in link's page, for a link that readSignInLinkUser finds or not.
function linkPage(
  user: typeof LINK_USER | undefined,
): () => Promise<JSX.Element> {
  return async (): Promise<JSX.Element> => {
    signOut();
    vi.mocked(readSignInLinkUser).mockResolvedValue(user);
    return await SignInLinkPage({
      params: NO_PARAMS,
      searchParams: Promise.resolve({ token: LINK_TOKEN }),
    });
  };
}

// A workspace page, signed in, once the stores answer as setUp makes them.
function workspacePage(
  setUp: () => void,
  content: () => Promise<JSX.Element>,
): () => Promise<JSX.Element> {
  return async (): Promise<JSX.Element> => {
    signInAs(SIGNED_IN_USER);
    setUp();
    return inWorkspace(await content());
  };
}

// Leaves the stores as they are.
function noData(): void {
  // Nothing to set up.
}

// The construct page of constructId.
function constructPage(constructId: string): Promise<JSX.Element> {
  return ConstructPage({
    params: Promise.resolve({ constructId }),
    searchParams: NO_PARAMS,
  });
}

// The activity page of activityId.

// The Quests page, with Life suggesting a long task and one shared quest
// under a long name, with a rite running in it.
const questsPage = workspacePage(
  () => {
    vi.mocked(readQuestEntries).mockResolvedValue([
      {
        quest: {
          ...FOX_QUEST,
          name: LONG_QUEST_NAME,
          sharing: { kind: "joined", owner: "Rowan Hollingsworth-Abernathy" },
        },
        lastActive: FOX_QUEST.createdAt,
        openTasks: 12,
        runningRite: "Focused work",
      },
    ]);
    const [task] = STREAK_QUEST.tasks;
    if (task === undefined) {
      throw new Error("No streak task");
    }
    const suggestion = {
      id: task.id,
      listId: task.listId,
      text: LONG_QUEST_NAME,
      streak: 12,
    };
    vi.mocked(readLife).mockResolvedValue({
      quest: { id: FOX_QUEST.id, name: "Life" },
      recurring: 5,
      doneToday: 3,
      waiting: [suggestion],
      suggestion,
    });
  },
  async () =>
    QuestListLayout({
      params: NO_PARAMS,
      children: await QuestsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    }),
);

// A quest's page, as its owner sees it.
function questPageFor(section = "overview"): () => Promise<JSX.Element> {
  return workspacePage(
    () => {
      vi.mocked(getQuest).mockResolvedValue({
        ...FOX_QUEST,
        name: LONG_QUEST_NAME,
      });
      vi.mocked(listQuests).mockResolvedValue([FOX_QUEST]);
    },
    async () => (
      <QuestLayout params={QUEST_PARAMS}>
        {
          await QuestPage({
            params: QUEST_PARAMS,
            searchParams: Promise.resolve({ section }),
          })
        }
      </QuestLayout>
    ),
  );
}

const questPage = questPageFor();

const PHONE_PAGES: readonly PhonePage[] = [
  {
    name: "Home, with a quest's streaks and tasks",
    path: [],
    render: workspacePage(
      () => {
        vi.mocked(readStreakQuests).mockResolvedValue([
          {
            ...STREAK_QUEST,
            quest: { ...STREAK_QUEST.quest, name: LONG_QUEST_NAME },
          },
        ]);
        vi.mocked(readTaskQuests).mockResolvedValue([
          {
            quest: { ...STREAK_QUEST.quest, name: LONG_QUEST_NAME },
            tasks: STREAK_QUEST.tasks.map(({ id, listId, text, done }) => ({
              id,
              listId,
              text,
              done,
            })),
          },
        ]);
      },
      () => HomePage(),
    ),
  },
  {
    name: "the Grimoire",
    path: ["grimoire"],
    render: workspacePage(
      () => {
        vi.mocked(listRites).mockResolvedValue([...BUILT_IN_RITES]);
      },
      () => GrimoirePage({ params: NO_PARAMS, searchParams: NO_PARAMS }),
    ),
  },
  {
    name: "a built-in rite",
    path: ["grimoire", "capture"],
    render: workspacePage(
      () => {
        vi.mocked(readRite).mockResolvedValue(BUILT_IN_RITES[0]);
      },
      () =>
        RitePage({
          params: Promise.resolve({ riteId: "capture" }),
          searchParams: NO_PARAMS,
        }),
    ),
  },

  { name: "the Credits page", render: signedOut(CreditsPage) },
  {
    name: "the sign-in page",
    render: async (): Promise<JSX.Element> => {
      signOut();
      return await LoginPage({
        params: NO_PARAMS,
        searchParams: NO_PARAMS,
      });
    },
  },
  { name: "the sign-up page", render: signedOut(SignUpPage) },
  { name: "a sign-in link's page", render: linkPage(LINK_USER) },
  { name: "an expired sign-in link's page", render: linkPage(undefined) },
  { name: "the Quests page", path: QUESTS_PATH, render: questsPage },
  {
    name: "the Quests page's New quest dialog",
    path: QUESTS_PATH,
    render: questsPage,
    open: async (): Promise<void> => {
      await page
        .getByRole("button", { name: NEW_QUEST_COPY.open, exact: true })
        .click();
      await vi.waitFor(() =>
        page
          .getByRole("dialog", { name: NEW_QUEST_COPY.title })
          .getByRole("textbox", { name: QUESTS_COPY.motivationLabel })
          .element(),
      );
    },
  },
  { name: "a quest", path: QUEST_PATH, render: questPage },
  {
    name: "a quest with the Timer drawer open",
    path: QUEST_PATH,
    render: questPage,
    open: async (): Promise<void> => {
      await page.getByRole("button", { name: TIMER_COPY.panel.expand }).click();
      await page
        .getByRole("button", { name: TIMER_COPY.start, exact: true })
        .click();
    },
  },
  {
    name: "a quest's Day grid",
    path: QUEST_PATH,
    render: questPageFor("days"),
  },
  {
    name: "a quest with its title editor open",
    path: QUEST_PATH,
    render: questPage,
    open: async (): Promise<void> => {
      await page.getByRole("button", { name: QUEST_COPY.rename }).click();
      await vi.waitFor(() =>
        page.getByRole("textbox", { name: QUEST_COPY.titleLabel }).element(),
      );
    },
  },
  {
    name: "the Timer's setup",
    path: ["timer"],
    render: workspacePage(noData, async () =>
      TimerLayout({ children: await TimerSetupPage() }),
    ),
  },
  {
    name: "a running timer",
    path: ["timer", "120", "60", "0"],
    render: workspacePage(noData, async () =>
      TimerLayout({
        children: await TimerPage({
          params: Promise.resolve({ work: "120", break: "60", start: "0" }),
          searchParams: NO_PARAMS,
        }),
      }),
    ),
    open: async (): Promise<void> => {
      await vi.waitFor(() =>
        page.getByRole("timer", { name: TIMER_COPY.remainingLabel }).element(),
      );
    },
  },

  {
    name: "the Profile page",
    path: ["profile"],
    render: workspacePage(noData, async () =>
      ProfileLayout({ children: await ProfilePage() }),
    ),
  },
  {
    name: "the Settings page",
    path: ["settings"],
    render: workspacePage(noData, () =>
      Promise.resolve(SettingsLayout({ children: SettingsPage() })),
    ),
  },

  {
    name: "a built-in construct's page",
    path: ["constructs", "vellum"],
    render: workspacePage(noData, () => constructPage("vellum")),
  },
];

export type { PhonePage };
export { PHONE_PAGES };
