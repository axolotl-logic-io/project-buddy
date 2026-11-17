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
import ProfileLayout from "@/app/(workspace)/profile/layout.tsx";
import ProfilePage from "@/app/(workspace)/profile/page.tsx";
import QuestListLayout from "@/app/(workspace)/quests/(list)/layout.tsx";
import QuestsPage from "@/app/(workspace)/quests/(list)/page.tsx";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import RetiredDefinitionPage from "@/app/(workspace)/retirement/[promptId]/page.tsx";
import RetirementPage from "@/app/(workspace)/retirement/page.tsx";
import SettingsLayout from "@/app/(workspace)/settings/layout.tsx";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import SpellbookPage from "@/app/(workspace)/spellbook/page.tsx";
import TimerPage from "@/app/(workspace)/timer/[work]/[break]/[start]/page.tsx";
import TimerLayout from "@/app/(workspace)/timer/layout.tsx";
import TimerSetupPage from "@/app/(workspace)/timer/page.tsx";
import CreditsPage from "@/app/credits/page.tsx";
import SignInLinkPage from "@/app/login/link/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import SignUpPage from "@/app/signup/page.tsx";
import { listMessages } from "@/chats/store.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import { getQuest, listQuests } from "@/quests/store.ts";
import {
  getRetiredDefinition,
  listRetiredDefinitions,
} from "@/retirement/retirement-store.ts";
import {
  findSpell,
  getOwnSpell,
  listOwnSpells,
} from "@/spells/own-spell-store.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { QUEST_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";
import {
  RETIRED_DEFINITIONS,
  RETIRED_SPELL,
} from "../retirement/retirement-fixtures.ts";
import {
  FOX_CONVERSATION,
  FOX_MILESTONES,
  FOX_QUEST,
} from "./(workspace)/page-fixtures.ts";
import { LINK_USER, OWN_SPELL } from "./phone-pages-fixtures.ts";
import { inWorkspace } from "./workspace-test-kit.tsx";

// One page as the phone checks render it.

interface PhonePage {
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
function spellPage(spellId: string): Promise<JSX.Element> {
  return SpellPage({
    params: Promise.resolve({ spellId }),
    searchParams: NO_PARAMS,
  });
}

// The Quests page, with one quest, which it offers to continue under a
// long name.
const projectsPage = workspacePage(
  () => {
    vi.mocked(listQuests).mockResolvedValue([FOX_QUEST]);
    vi.mocked(readCurrentQuest).mockResolvedValue({
      quest: { id: FOX_QUEST.id, name: LONG_QUEST_NAME },
      sharing: { kind: "joined", owner: "Rowan Hollingsworth-Abernathy" },
      nextTask: "Sketch the fox's ears from three angles",
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
function projectPageFor(
  section = "conversation",
  dailies = false,
): () => Promise<JSX.Element> {
  return workspacePage(
    () => {
      vi.mocked(getQuest).mockResolvedValue({
        ...FOX_QUEST,
        name: LONG_QUEST_NAME,
        dailies,
      });
      vi.mocked(readQuestConversation).mockResolvedValue(FOX_CONVERSATION);
      vi.mocked(listMessages).mockResolvedValue([]);
      vi.mocked(listMilestones).mockResolvedValue([...FOX_MILESTONES]);
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

const projectPage = projectPageFor();

const PHONE_PAGES: readonly PhonePage[] = [
  {
    name: "Retirement",
    path: ["retirement"],
    render: workspacePage(
      () => {
        vi.mocked(listRetiredDefinitions).mockResolvedValue([
          ...RETIRED_DEFINITIONS,
        ]);
      },
      () => RetirementPage({ params: NO_PARAMS, searchParams: NO_PARAMS }),
    ),
  },
  {
    name: "a retired definition",
    path: ["retirement", RETIRED_SPELL.id],
    render: workspacePage(
      () => {
        vi.mocked(getRetiredDefinition).mockResolvedValue(RETIRED_SPELL);
      },
      () =>
        RetiredDefinitionPage({
          params: Promise.resolve({ promptId: RETIRED_SPELL.id }),
          searchParams: NO_PARAMS,
        }),
    ),
  },
  {
    name: "Delete forever confirmation",
    path: ["retirement"],
    render: workspacePage(
      () => {
        vi.mocked(listRetiredDefinitions).mockResolvedValue([
          ...RETIRED_DEFINITIONS,
        ]);
      },
      () => RetirementPage({ params: NO_PARAMS, searchParams: NO_PARAMS }),
    ),
    open: async (): Promise<void> => {
      await page
        .getByRole("button", {
          name: RETIREMENT_COPY.deleteLabel(RETIRED_SPELL.name),
        })
        .click();
    },
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
  { name: "the projects list", path: QUESTS_PATH, render: projectsPage },
  {
    name: "the projects list's Make a thing dialog",
    path: QUESTS_PATH,
    render: projectsPage,
    open: async (): Promise<void> => {
      await page
        .getByRole("button", { name: "Make a thing", exact: true })
        .click();
      await vi.waitFor(() =>
        page
          .getByRole("dialog", { name: "Make a thing" })
          .getByRole("textbox", { name: QUESTS_COPY.motivationLabel })
          .element(),
      );
    },
  },
  { name: "a project", path: QUEST_PATH, render: projectPage },
  {
    name: "the Dailies quest, with Start Day",
    path: QUEST_PATH,
    render: projectPageFor("actions", true),
    open: async (): Promise<void> => {
      await vi.waitFor(() =>
        page
          .getByRole("button", { name: QUEST_CONVERSATION_COPY.startDay })
          .element(),
      );
    },
  },
  {
    name: "a quest with its title editor open",
    path: QUEST_PATH,
    render: projectPage,
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
    name: "the quest's Quick Notes composer",
    path: QUEST_PATH,
    render: projectPageFor("notes"),
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
  {
    name: "the searchable Spellbook",
    path: ["spellbook"],
    render: workspacePage(
      () => {
        vi.mocked(listOwnSpells).mockResolvedValue([
          { ...OWN_SPELL, name: LONG_QUEST_NAME },
        ]);
      },
      () => SpellbookPage({ params: NO_PARAMS, searchParams: NO_PARAMS }),
    ),
  },
  {
    name: "a built-in spell's page",
    path: ["spellbook", "tasks"],
    render: workspacePage(noData, () => spellPage("tasks")),
  },
  {
    name: "an own spell editor",
    path: ["spellbook", OWN_SPELL.id],
    render: workspacePage(
      () => {
        vi.mocked(getOwnSpell).mockResolvedValue(OWN_SPELL);
        vi.mocked(findSpell).mockResolvedValue(OWN_SPELL);
      },
      () => spellPage(OWN_SPELL.id),
    ),
  },
  {
    name: "Brainstorm spell",
    path: ["spellbook", "brainstorm"],
    render: workspacePage(noData, () => spellPage("brainstorm")),
  },
  {
    name: "a quest's Ideas",
    path: QUEST_PATH,
    render: projectPageFor("ideas"),
  },
  {
    name: "a quest's Tasks",
    path: QUEST_PATH,
    render: projectPageFor("tasks"),
  },
  {
    name: "a quest's Progress",
    path: QUEST_PATH,
    render: projectPageFor("progress"),
  },
];

vi.mock("@/app/(workspace)/spellbook/actions.ts", () => ({
  newSpellAction: vi.fn(),
  cloneSpellAction: vi.fn(),
  saveSpellAction: vi.fn(),
  retireSpellAction: vi.fn(),
}));
vi.mock("@/spells/own-spell-store.ts", () => ({
  getOwnSpell: vi.fn(),
  findSpell: vi.fn().mockResolvedValue(undefined),
  listOwnSpells: vi.fn().mockResolvedValue([]),
}));

export type { PhonePage };
export { PHONE_PAGES };
