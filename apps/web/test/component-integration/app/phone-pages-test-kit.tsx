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
import GalleryPage from "@/app/(workspace)/gallery/page.tsx";
import InvitationsPage from "@/app/(workspace)/invitations/page.tsx";
import BookPage from "@/app/(workspace)/library/[book]/page.tsx";
import LibraryPage from "@/app/(workspace)/library/page.tsx";
import ProjectListLayout from "@/app/(workspace)/projects/(list)/layout.tsx";
import ProjectsPage from "@/app/(workspace)/projects/(list)/page.tsx";
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import MemoryPage from "@/app/(workspace)/projects/[projectId]/memory/page.tsx";
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
import { GENERATION_ID } from "@/images/generation-contract.ts";
import { listGeneratedImages } from "@/images/generation-store.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { getProject, listProjects } from "@/projects/store.ts";
import {
  getRetiredDefinition,
  listRetiredDefinitions,
} from "@/retirement/retirement-store.ts";
import { getOwnSpell, listOwnSpells } from "@/spells/spell-store.ts";
import { QUEST_CONVERSATION_COPY } from "@/ui/copy/conversation.ts";
import { LIBRARY_COPY } from "@/ui/copy/library.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import {
  PROJECT_COPY,
  PROJECTS_COPY,
  QUEST_START_COPY,
} from "@/ui/copy/projects.ts";
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
  FOX_CHAT,
  FOX_CONVERSATION,
  FOX_MILESTONES,
  FOX_PROJECT,
  STANDALONE_CHAT,
} from "./(workspace)/page-fixtures.ts";
import {
  ASK_ONE_QUESTION_CLONE,
  BRAINSTORMING_CLONE,
  GOLD_BALANCE,
  LINK_USER,
  MEMORY_HISTORY,
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
  // The names of buttons laid out only once on screen, which the check
  // waits for and then checks it measured.
  readonly laidOutWhenShown?: readonly string[];
  // Opens what the page shows only on request, such as a dialog, once the
  // page has loaded and before the check measures it.
  readonly open?: () => Promise<void>;
}

// A sign-in link's token, in the shape links have.
const LONG_PROJECT_NAME_REPEATS = 40;
const LONG_PROJECT_NAME = "Unbroken".repeat(LONG_PROJECT_NAME_REPEATS);
const LINK_TOKEN = "Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3";
const NO_PARAMS: Promise<Record<string, never>> = Promise.resolve({});
const PROJECT_PARAMS = Promise.resolve({ projectId: FOX_PROJECT.id });

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

// The Projects page, with one project.
const projectsPage = workspacePage(
  () => {
    vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
    vi.mocked(listConstructs).mockResolvedValue([]);
  },
  async () =>
    ProjectListLayout({
      params: NO_PARAMS,
      children: await ProjectsPage({
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
      vi.mocked(getProject).mockResolvedValue({
        ...FOX_PROJECT,
        name: LONG_PROJECT_NAME,
        dailies,
      });
      vi.mocked(readQuestConversation).mockResolvedValue(FOX_CONVERSATION);
      vi.mocked(listMessages).mockResolvedValue([]);
      vi.mocked(listMilestones).mockResolvedValue([...FOX_MILESTONES]);
      vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
      vi.mocked(listOwnActivities).mockResolvedValue([]);
      vi.mocked(listConstructs).mockResolvedValue([]);
    },
    async () => (
      <ProjectLayout params={PROJECT_PARAMS}>
        {
          await ProjectPage({
            params: PROJECT_PARAMS,
            searchParams: Promise.resolve({ section }),
          })
        }
      </ProjectLayout>
    ),
  );
}

const projectPage = projectPageFor();

// A project's memory page, with a history of versions.
function memoryPageFor(section = "journal"): () => Promise<JSX.Element> {
  return workspacePage(
    () => {
      vi.mocked(getProject).mockResolvedValue({
        ...FOX_PROJECT,
        name: LONG_PROJECT_NAME,
      });
      vi.mocked(readMemoryHistory).mockResolvedValue([...MEMORY_HISTORY]);
    },
    () =>
      MemoryPage({
        params: PROJECT_PARAMS,
        searchParams: Promise.resolve({ section }),
      }),
  );
}

const memoryPage = memoryPageFor();

// The Workshop's page on the kind's tab, with one of her own of each kind.
function workshopPage(
  kind: "construct" | "activity" | "spell",
): () => Promise<JSX.Element> {
  return workspacePage(
    () => {
      vi.mocked(listConstructs).mockResolvedValue([VELLUM_CLONE]);
      vi.mocked(listOwnActivities).mockResolvedValue([BRAINSTORMING_CLONE]);
      vi.mocked(listOwnSpells).mockResolvedValue([ASK_ONE_QUESTION_CLONE]);
      vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
    },
    () =>
      WorkshopPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ kind }),
      }),
  );
}

function tabVariants(subject: string, labels: readonly string[]): PhonePage[] {
  return labels.map((label) => ({
    name: `${subject} · ${label}`,
    render: (): Promise<JSX.Element> => {
      const fixture = PHONE_PAGES.find(
        (candidate) => candidate.name === subject,
      );
      if (fixture === undefined) {
        throw new Error(`Unknown phone page: ${subject}`);
      }
      return fixture.render();
    },
    open: async (): Promise<void> => {
      await page.getByRole("tab", { name: label, exact: true }).click();
    },
  }));
}

const PHONE_PAGES: readonly PhonePage[] = [
  {
    name: "Library",
    render: workspacePage(
      () => {
        /* Reading needs no store fixtures. */
      },
      () => LibraryPage(),
    ),
  },
  ...LIBRARY_COPY.books.map((book) => ({
    name: `Library: ${book.title}`,
    render: workspacePage(
      () => {
        /* Reading needs no store fixtures. */
      },
      () => BookPage({ params: Promise.resolve({ book: book.id }) }),
    ),
  })),
  {
    name: "Retirement",
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

  {
    name: "the image gallery",
    render: workspacePage(
      () => {
        vi.mocked(listGeneratedImages).mockResolvedValue([
          {
            id: GENERATION_ID.parse("f98716fc-7406-450a-b83b-f96abb73a654"),
            chatId: FOX_CHAT.id,
            prompt: LONG_PROJECT_NAME,
            imageUrl: "/api/images/private",
            status: "generated",
            createdAt: new Date(0),
          },
        ]);
      },
      () => GalleryPage({ searchParams: Promise.resolve({}) }),
    ),
  },
  { name: "the Credits page", render: signedOut(CreditsPage) },
  { name: "the sign-in page", render: signedOut(LoginPage) },
  { name: "the sign-up page", render: signedOut(SignUpPage) },
  {
    name: "the invitation page",
    render: async (): Promise<JSX.Element> => {
      signInAs({ ...SIGNED_IN_USER, role: "admin" });
      return inWorkspace(await InvitationsPage());
    },
  },
  { name: "the setup page", render: setupPage("learner@example.com") },
  { name: "an unusable setup link", render: setupPage(undefined) },
  { name: "a sign-in link's page", render: linkPage(LINK_USER) },
  { name: "an expired sign-in link's page", render: linkPage(undefined) },
  { name: "the projects list", render: projectsPage },
  {
    name: "the projects list's Make a thing details",
    render: projectsPage,
    open: async (): Promise<void> => {
      await page
        .getByRole("button", {
          name: QUEST_START_COPY.chooseLabel("Make a thing"),
        })
        .click();
      await vi.waitFor(() =>
        page
          .getByRole("region", { name: "Make a thing" })
          .getByRole("textbox", { name: PROJECTS_COPY.nameLabel })
          .element(),
      );
    },
  },
  { name: "a project", render: projectPage },
  {
    name: "the Dailies quest, with Start the day",
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
    render: projectPage,
    open: async (): Promise<void> => {
      await page.getByRole("button", { name: PROJECT_COPY.rename }).click();
      await vi.waitFor(() =>
        page.getByRole("textbox", { name: PROJECT_COPY.titleLabel }).element(),
      );
    },
  },
  {
    name: "a project's memory",
    render: memoryPage,
  },
  {
    name: "a project's memory, open in the editor",
    render: memoryPage,
    open: async (): Promise<void> => {
      await page.getByRole("button", { name: MEMORY_COPY.edit }).click();
      await vi.waitFor(() =>
        page.getByRole("textbox", { name: MEMORY_COPY.textLabel }).element(),
      );
    },
  },
  {
    name: "the Settings page",
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
    render: workspacePage(noData, () => constructPage("vellum")),
  },
  {
    name: "her own construct's page",
    render: workspacePage(
      () => {
        vi.mocked(getOwnConstruct).mockResolvedValue(VELLUM_CLONE);
      },
      () => constructPage(VELLUM_CLONE.id),
    ),
  },
  {
    name: "the discovery activity's page",
    render: workspacePage(noData, () => activityPage("find-something-to-make")),
  },
  {
    name: "a built-in activity's page",
    render: workspacePage(noData, () => activityPage("brainstorming")),
  },
  {
    name: "her own activity's page",
    render: workspacePage(
      () => {
        vi.mocked(getOwnActivity).mockResolvedValue(BRAINSTORMING_CLONE);
      },
      () => activityPage(BRAINSTORMING_CLONE.id),
    ),
  },

  { name: "the Workshop's Constructs tab", render: workshopPage("construct") },
  { name: "the Workshop's Activities tab", render: workshopPage("activity") },
  { name: "the Workshop's Spells tab", render: workshopPage("spell") },
  {
    name: "a built-in spell's page",
    render: workspacePage(noData, () => spellPage("ask-one-question")),
  },
  {
    name: "her own spell's page",
    render: workspacePage(
      () => {
        vi.mocked(getOwnSpell).mockResolvedValue(ASK_ONE_QUESTION_CLONE);
      },
      () => spellPage(ASK_ONE_QUESTION_CLONE.id),
    ),
  },
  {
    name: "Chat, with a search and Markdown",
    render: workspacePage(() => {
      vi.mocked(privateChat).mockResolvedValue(STANDALONE_CONVERSATION);
      vi.mocked(listMessages).mockResolvedValue(searchAndMarkdownChat());
    }, chatPage),
    laidOutWhenShown: ["Copy Code", "Download file"],
  },
  {
    name: "Chat",
    render: workspacePage(() => {
      vi.mocked(privateChat).mockResolvedValue(STANDALONE_CONVERSATION);
      vi.mocked(listMessages).mockResolvedValue(standaloneChatExchange());
    }, chatPage),
  },
  {
    name: "Chat's Turn Chat into a quest",
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
  { name: "a quest's Plan", render: projectPageFor("plan") },
  { name: "a quest's Progress", render: projectPageFor("progress") },
  { name: "a quest's Journal versions", render: memoryPageFor("versions") },
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
