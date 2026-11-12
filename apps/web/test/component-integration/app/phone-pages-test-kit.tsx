// Every page of the site, as the phone checks render it
// (phone-pages.touch.browser.test.tsx): each page's components, from fixed
// data, in its layouts and the site's frame. A new page gets an entry in
// PHONE_PAGES. The test file mocks the stores and actions these pages read,
// and current-user.ts with current-user-test-kit.ts, so each entry sets the
// stores' answers through vi.mocked and signs in or out.

import type { JSX } from "react";
import { vi } from "vitest";
import { page } from "vitest/browser";
import { readInvitation } from "@/accounts/invitations.ts";
import { readSignInLinkUser } from "@/accounts/sign-in-links.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import {
  getOwnActivity,
  listOwnActivities,
} from "@/activities/activity-store.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import ActivityPage from "@/app/(workspace)/activities/[activityId]/page.tsx";
import StandaloneChatLayout from "@/app/(workspace)/chat/layout.tsx";
import StandaloneChatPage from "@/app/(workspace)/chat/page.tsx";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import InvitationsPage from "@/app/(workspace)/invitations/page.tsx";
import BookPage from "@/app/(workspace)/library/[book]/page.tsx";
import LibraryPage from "@/app/(workspace)/library/page.tsx";
import QuestListLayout from "@/app/(workspace)/quests/(list)/layout.tsx";
import QuestsPage from "@/app/(workspace)/quests/(list)/page.tsx";
import QuestLayout from "@/app/(workspace)/quests/[questId]/(overview)/layout.tsx";
import QuestPage from "@/app/(workspace)/quests/[questId]/(overview)/page.tsx";
import RetiredDefinitionPage from "@/app/(workspace)/retirement/[promptId]/page.tsx";
import RetirementPage from "@/app/(workspace)/retirement/page.tsx";
import SettingsLayout from "@/app/(workspace)/settings/layout.tsx";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import WorkshopPage from "@/app/(workspace)/workshop/page.tsx";
import CreditsPage from "@/app/credits/page.tsx";
import SignInLinkPage from "@/app/login/link/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import SetupPage from "@/app/setup/page.tsx";
import SignUpPage from "@/app/signup/page.tsx";
import { listMessages } from "@/chats/store.ts";
import {
  getOwnConstruct,
  listConstructs,
} from "@/constructs/construct-store.ts";
import type { Conversation } from "@/conversations/conversation-store.ts";
import { privateChat } from "@/conversations/private-chat.ts";
import { readQuestConversation } from "@/conversations/start-quest.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import { getQuest, listQuests } from "@/quests/store.ts";
import {
  getRetiredDefinition,
  listRetiredDefinitions,
} from "@/retirement/retirement-store.ts";
import { getOwnSpell, listOwnSpells } from "@/spells/spell-store.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { LIBRARY_COPY } from "@/ui/copy/library.ts";
import { QUEST_COPY, QUESTS_COPY } from "@/ui/copy/quests.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { QUEST_FROM_CHAT_COPY } from "@/ui/copy/start-work.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";
import {
  RETIRED_CONSTRUCT,
  RETIRED_DEFINITIONS,
} from "../retirement/retirement-fixtures.ts";
import {
  FOX_CONVERSATION,
  FOX_MILESTONES,
  FOX_QUEST,
  STANDALONE_CHAT,
} from "./(workspace)/page-fixtures.ts";
import {
  ASK_ONE_QUESTION_CLONE,
  BRAINSTORMING_CLONE,
  GOLD_BALANCE,
  LINK_USER,
  searchAndMarkdownChat,
  standaloneChatExchange,
  VELLUM_CLONE,
} from "./phone-pages-fixtures.ts";
import { inWorkspace } from "./workspace-test-kit.tsx";

// Her Chat, as privateChat reads it.
const STANDALONE_CONVERSATION: Conversation = {
  ...STANDALONE_CHAT,
  activity: builtInActivity(DEFAULT_ACTIVITY_ID),
};

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

function setupPage(email: string | undefined): () => Promise<JSX.Element> {
  return async (): Promise<JSX.Element> => {
    signOut();
    vi.mocked(readInvitation).mockResolvedValue(email);
    return await SetupPage({
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
function activityPage(activityId: string): Promise<JSX.Element> {
  return ActivityPage({
    params: Promise.resolve({ activityId }),
    searchParams: NO_PARAMS,
  });
}

// The spell page of spellId.
function spellPage(spellId: string): Promise<JSX.Element> {
  return SpellPage({
    params: Promise.resolve({ spellId }),
    searchParams: NO_PARAMS,
  });
}

// Chat, her private conversation.
async function chatPage(): Promise<JSX.Element> {
  vi.mocked(listConstructs).mockResolvedValue([]);
  return (
    <StandaloneChatLayout params={NO_PARAMS}>
      {await StandaloneChatPage()}
    </StandaloneChatLayout>
  );
}

// The Quests page, with one quest, which it offers to continue under a
// long name.
const projectsPage = workspacePage(
  () => {
    vi.mocked(listQuests).mockResolvedValue([FOX_QUEST]);
    vi.mocked(readCurrentQuest).mockResolvedValue({
      quest: { id: FOX_QUEST.id, name: LONG_QUEST_NAME },
      nextStep: "Sketch the fox's ears from three angles",
    });
    vi.mocked(listConstructs).mockResolvedValue([]);
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
      vi.mocked(listOwnActivities).mockResolvedValue([]);
      vi.mocked(listConstructs).mockResolvedValue([]);
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

// The Workshop's page on the kind's tab, with one of her own of each kind.
function workshopPage(
  kind: "construct" | "activity" | "spell",
): () => Promise<JSX.Element> {
  return workspacePage(
    () => {
      vi.mocked(listConstructs).mockResolvedValue([VELLUM_CLONE]);
      vi.mocked(listOwnActivities).mockResolvedValue([BRAINSTORMING_CLONE]);
      vi.mocked(listOwnSpells).mockResolvedValue([ASK_ONE_QUESTION_CLONE]);
      vi.mocked(listQuests).mockResolvedValue([FOX_QUEST]);
    },
    () =>
      WorkshopPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ kind }),
      }),
  );
}

const PHONE_PAGES: readonly PhonePage[] = [
  {
    name: "Library",
    path: ["library"],
    render: workspacePage(
      () => {
        /* Reading needs no store fixtures. */
      },
      () => LibraryPage(),
    ),
  },
  ...LIBRARY_COPY.books.map((book) => ({
    name: `Library: ${book.title}`,
    path: ["library", book.id],
    render: workspacePage(
      () => {
        /* Reading needs no store fixtures. */
      },
      () => BookPage({ params: Promise.resolve({ book: book.id }) }),
    ),
  })),
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
    path: ["retirement", RETIRED_CONSTRUCT.id],
    render: workspacePage(
      () => {
        vi.mocked(getRetiredDefinition).mockResolvedValue(RETIRED_CONSTRUCT);
      },
      () =>
        RetiredDefinitionPage({
          params: Promise.resolve({ promptId: RETIRED_CONSTRUCT.id }),
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
          name: RETIREMENT_COPY.deleteLabel(RETIRED_CONSTRUCT.name),
        })
        .click();
    },
  },

  { name: "the Credits page", render: signedOut(CreditsPage) },
  { name: "the sign-in page", render: signedOut(LoginPage) },
  { name: "the sign-up page", render: signedOut(SignUpPage) },
  {
    name: "the invitation page",
    path: ["invitations"],
    render: async (): Promise<JSX.Element> => {
      signInAs({ ...SIGNED_IN_USER, role: "admin" });
      return inWorkspace(await InvitationsPage());
    },
  },
  { name: "the setup page", render: setupPage("learner@example.com") },
  { name: "an unusable setup link", render: setupPage(undefined) },
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
    name: "the Dailies quest, with Start the day",
    path: QUEST_PATH,
    render: projectPageFor("conversation", true),
    open: async (): Promise<void> => {
      await vi.waitFor(() =>
        page
          .getByRole("button", { name: QUEST_CONVERSATION_COPY.startTheDay })
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
    name: "the Settings page",
    path: ["settings"],
    render: workspacePage(
      () => {
        vi.mocked(listConstructs).mockResolvedValue([]);
        vi.mocked(readGoldBalance).mockResolvedValue(GOLD_BALANCE);
      },
      async () => SettingsLayout({ children: await SettingsPage() }),
    ),
  },

  {
    name: "a built-in construct's page",
    path: ["constructs", "vellum"],
    render: workspacePage(noData, () => constructPage("vellum")),
  },
  {
    name: "her own construct's page",
    path: ["constructs", VELLUM_CLONE.id],
    render: workspacePage(
      () => {
        vi.mocked(getOwnConstruct).mockResolvedValue(VELLUM_CLONE);
      },
      () => constructPage(VELLUM_CLONE.id),
    ),
  },
  {
    name: "the discovery activity's page",
    path: ["activities", "find-something-to-make"],
    render: workspacePage(noData, () => activityPage("find-something-to-make")),
  },
  {
    name: "a built-in activity's page",
    path: ["activities", "brainstorming"],
    render: workspacePage(noData, () => activityPage("brainstorming")),
  },
  {
    name: "her own activity's page",
    path: ["activities", BRAINSTORMING_CLONE.id],
    render: workspacePage(
      () => {
        vi.mocked(getOwnActivity).mockResolvedValue(BRAINSTORMING_CLONE);
      },
      () => activityPage(BRAINSTORMING_CLONE.id),
    ),
  },

  {
    name: "the Workshop's Constructs tab",
    path: ["workshop"],
    render: workshopPage("construct"),
  },
  {
    name: "the Workshop's Activities tab",
    path: ["workshop"],
    render: workshopPage("activity"),
  },
  {
    name: "the Workshop's Spells tab",
    path: ["workshop"],
    render: workshopPage("spell"),
  },
  {
    name: "a built-in spell's page",
    path: ["spellbook", "ask-one-question"],
    render: workspacePage(noData, () => spellPage("ask-one-question")),
  },
  {
    name: "her own spell's page",
    path: ["spellbook", ASK_ONE_QUESTION_CLONE.id],
    render: workspacePage(
      () => {
        vi.mocked(getOwnSpell).mockResolvedValue(ASK_ONE_QUESTION_CLONE);
      },
      () => spellPage(ASK_ONE_QUESTION_CLONE.id),
    ),
  },
  {
    name: "Chat, with a search and Markdown",
    path: ["chat"],
    render: workspacePage(() => {
      vi.mocked(privateChat).mockResolvedValue(STANDALONE_CONVERSATION);
      vi.mocked(listMessages).mockResolvedValue(searchAndMarkdownChat());
    }, chatPage),
    laidOutWhenShown: ["Copy Code", "Download file"],
  },
  {
    name: "Chat",
    path: ["chat"],
    render: workspacePage(() => {
      vi.mocked(privateChat).mockResolvedValue(STANDALONE_CONVERSATION);
      vi.mocked(listMessages).mockResolvedValue(standaloneChatExchange());
    }, chatPage),
  },
  {
    name: "Chat's Turn Chat into a quest",
    path: ["chat"],
    render: workspacePage(() => {
      vi.mocked(privateChat).mockResolvedValue(STANDALONE_CONVERSATION);
      vi.mocked(listMessages).mockResolvedValue(standaloneChatExchange());
    }, chatPage),
    open: async (): Promise<void> => {
      await page
        .getByRole("button", { name: QUEST_FROM_CHAT_COPY.open })
        .click();
      await vi.waitFor(() =>
        page
          .getByRole("dialog", { name: QUEST_FROM_CHAT_COPY.heading })
          .element(),
      );
    },
  },
  {
    name: "a quest's Ideas",
    path: QUEST_PATH,
    render: projectPageFor("ideas"),
  },
  { name: "a quest's Plan", path: QUEST_PATH, render: projectPageFor("plan") },
  {
    name: "a quest's Progress",
    path: QUEST_PATH,
    render: projectPageFor("progress"),
  },
];

vi.mock("@/batteries/catalog.ts", () => ({
  availableBatteryCatalog: () => [],
}));
vi.mock("@/batteries/purchases.ts", () => ({
  readBatteryPurchases: async () => [],
}));
vi.mock("@/app/(workspace)/settings/battery-actions.ts", () => ({
  buyBatteries: vi.fn(),
  refreshBatteryPayments: vi.fn(),
}));

export type { PhonePage };
export { PHONE_PAGES };
