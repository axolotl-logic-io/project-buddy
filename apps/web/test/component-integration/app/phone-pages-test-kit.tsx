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
import {
  getOwnActivity,
  listOwnActivities,
} from "@/activities/activity-store.ts";
import AccountLayout from "@/app/(workspace)/account/layout.tsx";
import AccountPage from "@/app/(workspace)/account/page.tsx";
import ActivitiesPage from "@/app/(workspace)/activities/(list)/page.tsx";
import ActivityPage from "@/app/(workspace)/activities/[activityId]/page.tsx";
import QuickCapturePage from "@/app/(workspace)/capture/page.tsx";
import StandaloneChatsLayout from "@/app/(workspace)/chat/layout.tsx";
import StandaloneChatsPage from "@/app/(workspace)/chat/page.tsx";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import NewChatLayout from "@/app/(workspace)/chats/new/layout.tsx";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import ConstructsPage from "@/app/(workspace)/constructs/(list)/page.tsx";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import GalleryPage from "@/app/(workspace)/gallery/page.tsx";
import HomePage from "@/app/(workspace)/home/page.tsx";
import InvitationsPage from "@/app/(workspace)/invitations/page.tsx";
import ListingPage from "@/app/(workspace)/marketplace/[listingId]/page.tsx";
import { buyListingAction } from "@/app/(workspace)/marketplace/actions.ts";
import MarketplacePage from "@/app/(workspace)/marketplace/page.tsx";
import ProjectListLayout from "@/app/(workspace)/projects/(list)/layout.tsx";
import ProjectsPage from "@/app/(workspace)/projects/(list)/page.tsx";
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import MemoryPage from "@/app/(workspace)/projects/[projectId]/memory/page.tsx";
import ProjectInvitationPage from "@/app/(workspace)/projects/invitations/[token]/page.tsx";
import RetiredDefinitionPage from "@/app/(workspace)/retirement/[promptId]/page.tsx";
import RetirementPage from "@/app/(workspace)/retirement/page.tsx";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import SpellbookPage from "@/app/(workspace)/spellbook/(list)/page.tsx";
import SpellPage from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import WorkshopPage from "@/app/(workspace)/workshop/page.tsx";
import CheckInsOffPage from "@/app/check-ins/off/page.tsx";
import CreditsPage from "@/app/credits/page.tsx";
import SignInLinkPage from "@/app/login/link/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import SetupPage from "@/app/setup/page.tsx";
import SignUpPage from "@/app/signup/page.tsx";
import { listAllChats } from "@/chats/all-chats.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import type { CheckInFrequency } from "@/check-ins/check-in-frequency.ts";
import { readCheckInFrequency } from "@/check-ins/check-in-store.ts";
import { readCheckInsOffLink } from "@/check-ins/check-ins-off-link.ts";
import {
  getOwnConstruct,
  listConstructs,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { GENERATION_ID } from "@/images/generation-contract.ts";
import { listGeneratedImages } from "@/images/generation-store.ts";
import {
  getListing,
  listListings,
  listOwnListings,
  readSaleState,
} from "@/marketplace/listing-store.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import { listMilestones } from "@/milestones/milestone-store.ts";
import { NOTE_DAY } from "@/notes/note.ts";
import { readRecentNotes } from "@/notes/note-store.ts";
import { listProjectMembers } from "@/projects/members-store.ts";
import {
  listProjectInvitations,
  listSentProjectInvitations,
  type ProjectInvitation,
  readProjectInvitation,
} from "@/projects/project-invitations.ts";
import { getProject, listProjects } from "@/projects/store.ts";
import {
  getRetiredDefinition,
  listRetiredDefinitions,
} from "@/retirement/retirement-store.ts";
import { getOwnSpell, listOwnSpells } from "@/spells/spell-store.ts";
import { readToday } from "@/today/today-store.ts";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { LISTING_COPY, MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";
import {
  CONSTRUCT_LISTING,
  CONSTRUCT_LISTING_AS_SELLER,
  CONSTRUCT_LISTING_TO_BUY,
  OWN_LISTINGS,
  SPELL_LISTING,
} from "../marketplace/marketplace-fixtures.ts";
import {
  LONG_NAME_INVITATION,
  SENT_INVITATION,
} from "../projects/project-invitations-test-kit.ts";
import {
  RETIRED_CONSTRUCT,
  RETIRED_DEFINITIONS,
} from "../retirement/retirement-fixtures.ts";
import {
  FOX_CHAT,
  FOX_MEMBER,
  FOX_MILESTONES,
  FOX_OWNER,
  FOX_PROJECT,
  FOX_PROJECT_AS_MEMBER,
  FOX_TEAM_PROJECT,
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
// The gold a refused buyer has, short of the listing's price.
const SHORT_GOLD = 12;
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

// The page a check-in email's link to turn check-ins off opens, signed out,
// for a project with a long name whose check-ins are at frequency, or for
// a link that isn't signed when frequency is undefined.
function checkInsOffPage(
  frequency: CheckInFrequency | undefined,
): () => Promise<JSX.Element> {
  return async (): Promise<JSX.Element> => {
    signOut();
    let target: Awaited<ReturnType<typeof readCheckInsOffLink>>;
    if (frequency !== undefined) {
      target = { owner: SIGNED_IN_USER.id, projectId: FOX_PROJECT.id };
    }
    vi.mocked(readCheckInsOffLink).mockResolvedValue(target);
    vi.mocked(getProject).mockResolvedValue({
      ...FOX_PROJECT,
      name: LONG_PROJECT_NAME,
    });
    vi.mocked(readCheckInFrequency).mockResolvedValue(frequency);
    return await CheckInsOffPage({
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

// A listing's page, as the store gives it.
function listingPage(
  listing: Awaited<ReturnType<typeof getListing>>,
): () => Promise<JSX.Element> {
  return workspacePage(
    () => {
      vi.mocked(getListing).mockResolvedValue(listing);
    },
    () =>
      ListingPage({
        params: Promise.resolve({ listingId: CONSTRUCT_LISTING.id }),
        searchParams: NO_PARAMS,
      }),
  );
}

// Her own prompts' pages offer to sell them, the section at its widest.
function sellable(): void {
  vi.mocked(readSaleState).mockResolvedValue({ kind: "listable" });
}

// A chat's page.
function chatPage(): Promise<JSX.Element> {
  return ChatPage({
    params: Promise.resolve({ chatId: FOX_CHAT.id }),
    searchParams: NO_PARAMS,
  });
}

// The Projects page, with one project, and with the invitations and the
// user's own constructs.
function projectsPageOf(
  invitations: readonly ProjectInvitation[],
  ownConstructs: readonly OwnConstruct[] = [],
): () => Promise<JSX.Element> {
  return workspacePage(
    () => {
      vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
      vi.mocked(listConstructs).mockResolvedValue([...ownConstructs]);
      vi.mocked(listProjectInvitations).mockResolvedValue([...invitations]);
    },
    async () => (
      <ProjectListLayout params={NO_PARAMS}>
        {
          await ProjectsPage({
            params: Promise.resolve({}),
            searchParams: Promise.resolve({}),
          })
        }
      </ProjectListLayout>
    ),
  );
}

const projectsPage = projectsPageOf([]);

// The page a project invitation's email opens.
const projectInvitationPage = workspacePage(
  () => {
    vi.mocked(readProjectInvitation).mockResolvedValue(LONG_NAME_INVITATION);
  },
  () =>
    ProjectInvitationPage({
      params: Promise.resolve({ token: LINK_TOKEN }),
      searchParams: NO_PARAMS,
    }),
);

// The Chats page, filtered to a project with a long name.
const allChatsPage = workspacePage(
  () => {
    vi.mocked(listProjects).mockResolvedValue([
      { ...FOX_PROJECT, name: LONG_PROJECT_NAME },
    ]);
    vi.mocked(listAllChats).mockResolvedValue([
      STANDALONE_CHAT,
      {
        ...FOX_CHAT,
        project: { ...FOX_CHAT.project, name: LONG_PROJECT_NAME },
      },
    ]);
    vi.mocked(listConstructs).mockResolvedValue([VELLUM_CLONE]);
  },
  async () => (
    <StandaloneChatsLayout params={NO_PARAMS}>
      {
        await StandaloneChatsPage({
          params: NO_PARAMS,
          searchParams: Promise.resolve({ project: FOX_PROJECT.id }),
        })
      }
    </StandaloneChatsLayout>
  ),
);

// A project's page, its owner's view of a team project.
const projectPage = workspacePage(
  () => {
    vi.mocked(getProject).mockResolvedValue({
      ...FOX_TEAM_PROJECT,
      name: LONG_PROJECT_NAME,
    });
    vi.mocked(listProjectMembers).mockResolvedValue([
      { ...FOX_OWNER, id: SIGNED_IN_USER.id },
      { ...FOX_MEMBER, name: LONG_PROJECT_NAME },
    ]);
    vi.mocked(listChats).mockResolvedValue([FOX_CHAT]);
    vi.mocked(listMilestones).mockResolvedValue([...FOX_MILESTONES]);
    vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
    vi.mocked(listOwnActivities).mockResolvedValue([]);
    vi.mocked(listConstructs).mockResolvedValue([]);
    vi.mocked(readRecentNotes).mockResolvedValue([
      { day: NOTE_DAY.parse("2026-11-02"), text: LONG_PROJECT_NAME },
    ]);
  },
  async () => (
    <ProjectLayout params={PROJECT_PARAMS}>
      {
        await ProjectPage({
          params: PROJECT_PARAMS,
          searchParams: NO_PARAMS,
        })
      }
    </ProjectLayout>
  ),
);

// A project's memory page, with a history of versions.
const memoryPage = workspacePage(
  () => {
    vi.mocked(getProject).mockResolvedValue({
      ...FOX_PROJECT,
      name: LONG_PROJECT_NAME,
    });
    vi.mocked(readMemoryHistory).mockResolvedValue([...MEMORY_HISTORY]);
  },
  () => MemoryPage({ params: PROJECT_PARAMS, searchParams: NO_PARAMS }),
);

const activitiesPage = workspacePage(
  () => {
    vi.mocked(listOwnActivities).mockResolvedValue([BRAINSTORMING_CLONE]);
    vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
    vi.mocked(listConstructs).mockResolvedValue([VELLUM_CLONE]);
  },
  () =>
    ActivitiesPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    }),
);

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

const PHONE_PAGES: readonly PhonePage[] = [
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
  { name: "the turn-off-check-ins page", render: checkInsOffPage("daily") },
  { name: "check-ins turned off", render: checkInsOffPage("off") },
  {
    name: "an unusable turn-off-check-ins link",
    render: checkInsOffPage(undefined),
  },
  { name: "an expired sign-in link's page", render: linkPage(undefined) },
  { name: "the projects list", render: projectsPage },
  {
    name: "the premade quest preview",
    render: projectsPage,
    open: async (): Promise<void> => {
      await page
        .getByRole("button", {
          name: "Explore quest: Start without inspiration",
        })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("textbox", { name: "Starting Journal" })
        .element();
    },
  },
  {
    name: "the projects list with a project invitation",
    render: projectsPageOf([LONG_NAME_INVITATION]),
  },
  { name: "a project invitation's page", render: projectInvitationPage },
  {
    name: "the projects list's New project dialog",
    render: projectsPageOf([]),
    open: async (): Promise<void> => {
      await page
        .getByRole("button", { name: PROJECTS_COPY.newHeading })
        .click();
      await vi.waitFor(() =>
        page
          .getByRole("dialog", { name: PROJECTS_COPY.newHeading })
          .getByRole("textbox", { name: PROJECTS_COPY.motivationLabel })
          .element(),
      );
    },
  },
  { name: "a project", render: projectPage },
  {
    name: "a project's New chat dialog",
    render: projectPage,
    open: async (): Promise<void> => {
      await page
        .getByRole("button", { name: NEW_CHAT_COPY.dialogHeading })
        .click();
      await vi.waitFor(() =>
        page
          .getByRole("dialog", { name: NEW_CHAT_COPY.dialogHeading })
          .element(),
      );
    },
  },
  {
    name: "a team project, as its member",
    render: workspacePage(
      () => {
        vi.mocked(getProject).mockResolvedValue(FOX_PROJECT_AS_MEMBER);
        vi.mocked(listProjectMembers).mockResolvedValue([
          FOX_OWNER,
          { ...FOX_MEMBER, id: SIGNED_IN_USER.id, name: LONG_PROJECT_NAME },
        ]);
        vi.mocked(listChats).mockResolvedValue([FOX_CHAT]);
        vi.mocked(listSentProjectInvitations).mockResolvedValue([
          SENT_INVITATION,
        ]);
        vi.mocked(listMilestones).mockResolvedValue([...FOX_MILESTONES]);
        vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
        vi.mocked(listOwnActivities).mockResolvedValue([]);
        vi.mocked(listConstructs).mockResolvedValue([]);
        vi.mocked(readRecentNotes).mockResolvedValue([
          { day: NOTE_DAY.parse("2026-11-02"), text: LONG_PROJECT_NAME },
        ]);
      },
      async () => (
        <ProjectLayout params={PROJECT_PARAMS}>
          {
            await ProjectPage({
              params: PROJECT_PARAMS,
              searchParams: NO_PARAMS,
            })
          }
        </ProjectLayout>
      ),
    ),
  },
  {
    name: "quick capture",
    render: workspacePage(
      () => {
        vi.mocked(listProjects).mockResolvedValue([
          { ...FOX_PROJECT, name: LONG_PROJECT_NAME },
        ]);
      },
      () => QuickCapturePage({ params: NO_PARAMS, searchParams: NO_PARAMS }),
    ),
  },
  {
    name: "quick capture with no projects",
    render: workspacePage(
      () => {
        vi.mocked(listProjects).mockResolvedValue([]);
      },
      () => QuickCapturePage({ params: NO_PARAMS, searchParams: NO_PARAMS }),
    ),
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
    name: "the atlas before the first quest",
    render: workspacePage(
      () => {
        vi.mocked(readToday).mockResolvedValue({ projects: [], chats: [] });
      },
      () => HomePage(),
    ),
  },
  {
    name: "the atlas with a long quest and next step",
    render: workspacePage(
      () => {
        vi.mocked(readToday).mockResolvedValue({
          projects: [
            {
              project: { id: FOX_PROJECT.id, name: LONG_PROJECT_NAME },
              nextStep: LONG_PROJECT_NAME,
              latestChat: FOX_CHAT.id,
            },
          ],
          chats: [],
        });
      },
      () => HomePage(),
    ),
  },
  {
    name: "the atlas destination list",
    render: workspacePage(
      () => {
        vi.mocked(readToday).mockResolvedValue({ projects: [], chats: [] });
      },
      () => HomePage(),
    ),
    open: async (): Promise<void> => {
      await page.getByRole("button", { name: "List", exact: true }).click();
    },
  },
  {
    name: "the new-chat form",
    render: workspacePage(
      () => {
        vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
        vi.mocked(readToday).mockResolvedValue({ projects: [], chats: [] });
      },
      async () => (
        <NewChatLayout params={NO_PARAMS}>
          {
            await NewChatPage({
              params: NO_PARAMS,
              searchParams: Promise.resolve({ projectId: FOX_PROJECT.id }),
            })
          }
        </NewChatLayout>
      ),
    ),
  },
  {
    name: "the landing page's Today section, with long names",
    render: workspacePage(
      () => {
        vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
        vi.mocked(readToday).mockResolvedValue({
          projects: [
            {
              project: { id: FOX_PROJECT.id, name: LONG_PROJECT_NAME },
              nextStep: LONG_PROJECT_NAME,
              latestChat: FOX_CHAT.id,
            },
          ],
          chats: [
            STANDALONE_CHAT,
            {
              ...FOX_CHAT,
              project: { ...FOX_CHAT.project, name: LONG_PROJECT_NAME },
            },
          ],
        });
      },
      async () => (
        <NewChatLayout params={NO_PARAMS}>
          {
            await NewChatPage({
              params: NO_PARAMS,
              searchParams: Promise.resolve({ projectId: FOX_PROJECT.id }),
            })
          }
        </NewChatLayout>
      ),
    ),
  },
  {
    name: "the Settings page",
    render: workspacePage(noData, () => SettingsPage()),
  },
  {
    name: "the constructs page",
    render: workspacePage(
      () => {
        vi.mocked(listConstructs).mockResolvedValue([VELLUM_CLONE]);
      },
      () =>
        ConstructsPage({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({}),
        }),
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
        sellable();
      },
      () => constructPage(VELLUM_CLONE.id),
    ),
  },
  {
    name: "the activities page",
    render: activitiesPage,
  },
  {
    name: "the activities page's New chat dialog",
    render: activitiesPage,
    open: async (): Promise<void> => {
      await page
        .getByRole("button", {
          name: ACTIVITIES_COPY.startLabel("Brainstorming"),
          exact: true,
        })
        .click();
      await vi.waitFor(() =>
        page
          .getByRole("dialog", { name: NEW_CHAT_COPY.dialogHeading })
          .element(),
      );
    },
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
        sellable();
      },
      () => activityPage(BRAINSTORMING_CLONE.id),
    ),
  },
  {
    name: "the Spellbook",
    render: workspacePage(
      () => {
        vi.mocked(listOwnSpells).mockResolvedValue([ASK_ONE_QUESTION_CLONE]);
      },
      () =>
        SpellbookPage({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({}),
        }),
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
        sellable();
      },
      () => spellPage(ASK_ONE_QUESTION_CLONE.id),
    ),
  },
  {
    name: "the Marketplace",
    render: workspacePage(
      () => {
        vi.mocked(listListings).mockResolvedValue([
          CONSTRUCT_LISTING,
          SPELL_LISTING,
        ]);
        vi.mocked(listOwnListings).mockResolvedValue([...OWN_LISTINGS]);
      },
      () => MarketplacePage({ searchParams: Promise.resolve({}) }),
    ),
  },
  { name: "a listing's page", render: listingPage(CONSTRUCT_LISTING_TO_BUY) },
  {
    name: "a listing's page, as its seller",
    render: listingPage(CONSTRUCT_LISTING_AS_SELLER),
  },
  {
    name: "a listing's page, as its unlisted seller",
    render: listingPage({ ...CONSTRUCT_LISTING_AS_SELLER, listed: false }),
  },
  {
    name: "a listing's page, for a buyer who has a copy",
    render: listingPage({
      ...CONSTRUCT_LISTING_TO_BUY,
      copy: CONSTRUCT_LISTING_AS_SELLER.source,
    }),
  },
  {
    name: "a listing's page, refused for too little gold",
    render: listingPage(CONSTRUCT_LISTING_TO_BUY),
    open: async (): Promise<void> => {
      vi.mocked(buyListingAction).mockResolvedValue({
        kind: "refused",
        message: LISTING_COPY.tooLittleGold(
          CONSTRUCT_LISTING.price,
          SHORT_GOLD,
        ),
        earnGold: true,
      });
      await page
        .getByRole("button", {
          name: LISTING_COPY.buy(CONSTRUCT_LISTING.price),
        })
        .click();
      await vi.waitFor(() =>
        page.getByRole("link", { name: MARKETPLACE_COPY.earnGold }).element(),
      );
    },
  },
  {
    name: "the account page",
    render: workspacePage(
      () => {
        vi.mocked(readGoldBalance).mockResolvedValue(GOLD_BALANCE);
      },
      async () => (
        <AccountLayout params={NO_PARAMS}>{await AccountPage()}</AccountLayout>
      ),
    ),
  },
  {
    name: "a chat",
    render: workspacePage(() => {
      vi.mocked(getChat).mockResolvedValue(FOX_CHAT);
      vi.mocked(listMessages).mockResolvedValue(searchAndMarkdownChat());
    }, chatPage),
    laidOutWhenShown: ["Copy Code", "Download file"],
  },
  {
    name: "the all-chats list with a long project name",
    render: allChatsPage,
  },
  {
    name: "the all-chats list's New chat dialog",
    render: allChatsPage,
    open: async (): Promise<void> => {
      await page
        .getByRole("button", { name: NEW_CHAT_COPY.dialogHeading })
        .click();
      await vi.waitFor(() =>
        page
          .getByRole("dialog", { name: NEW_CHAT_COPY.dialogHeading })
          .element(),
      );
    },
  },
  {
    name: "a standalone conversation",
    render: workspacePage(() => {
      vi.mocked(getChat).mockResolvedValue(STANDALONE_CHAT);
      vi.mocked(listMessages).mockResolvedValue(standaloneChatExchange());
    }, chatPage),
  },
];

export type { PhonePage };
export { PHONE_PAGES };
