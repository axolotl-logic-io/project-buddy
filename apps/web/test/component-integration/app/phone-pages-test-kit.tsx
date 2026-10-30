// Every page of the site, as the phone checks render it
// (phone-pages.touch.browser.test.tsx): each page's components, from fixed
// data, in its layouts and the site's frame. A new page gets an entry in
// PHONE_PAGES. The test file mocks the stores and actions these pages read,
// and current-user.ts with current-user-test-kit.ts, so each entry sets the
// stores' answers through vi.mocked and signs in or out.
import type { JSX } from "react";
import { vi } from "vitest";
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
import BuddiesPage from "@/app/(workspace)/buddies/(list)/page.tsx";
import BuddyPage from "@/app/(workspace)/buddies/[buddyId]/page.tsx";
import StandaloneChatsLayout from "@/app/(workspace)/chat/layout.tsx";
import StandaloneChatsPage from "@/app/(workspace)/chat/page.tsx";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import NewChatLayout from "@/app/(workspace)/chats/new/layout.tsx";
import NewChatPage from "@/app/(workspace)/chats/new/page.tsx";
import InvitationsPage from "@/app/(workspace)/invitations/page.tsx";
import ProjectListLayout from "@/app/(workspace)/projects/(list)/layout.tsx";
import ProjectsPage from "@/app/(workspace)/projects/(list)/page.tsx";
import ProjectLayout from "@/app/(workspace)/projects/[projectId]/(overview)/layout.tsx";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import MemoryPage from "@/app/(workspace)/projects/[projectId]/memory/page.tsx";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import CreditsPage from "@/app/credits/page.tsx";
import SignInLinkPage from "@/app/login/link/page.tsx";
import LoginPage from "@/app/login/page.tsx";
import Home from "@/app/page.tsx";
import SetupPage from "@/app/setup/page.tsx";
import SignUpPage from "@/app/signup/page.tsx";
import { getOwnBuddy, listBuddies } from "@/buddies/buddy-store.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { getChat, listChats, listMessages } from "@/chats/store.ts";
import { readMemoryHistory } from "@/memory/memory-store.ts";
import { getProject, listProjects } from "@/projects/store.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../auth/current-user-test-kit.ts";
import {
  FOX_CHAT,
  FOX_PROJECT,
  STANDALONE_CHAT,
} from "./(workspace)/page-fixtures.ts";
import {
  BRAINSTORMING_CLONE,
  HIPPY_CLONE,
  LINK_USER,
  MEMORY_HISTORY,
  MONTHLY_USAGE,
  searchAndMarkdownChat,
  standaloneChatExchange,
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

// The buddy page of buddyId.
function buddyPage(buddyId: string): Promise<JSX.Element> {
  return BuddyPage({
    params: Promise.resolve({ buddyId }),
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

// A chat's page.
function chatPage(): Promise<JSX.Element> {
  return ChatPage({
    params: Promise.resolve({ chatId: FOX_CHAT.id }),
    searchParams: NO_PARAMS,
  });
}

const PHONE_PAGES: readonly PhonePage[] = [
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
  {
    name: "the home page",
    render: (): Promise<JSX.Element> => {
      signInAs(SIGNED_IN_USER);
      return Promise.resolve(<Home />);
    },
  },
  {
    name: "the projects list",
    render: workspacePage(
      () => {
        vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
        vi.mocked(listBuddies).mockResolvedValue([]);
      },
      async () => (
        <ProjectListLayout params={NO_PARAMS}>
          {await ProjectsPage()}
        </ProjectListLayout>
      ),
    ),
  },
  {
    name: "a project",
    render: workspacePage(
      () => {
        vi.mocked(getProject).mockResolvedValue(FOX_PROJECT);
        vi.mocked(listChats).mockResolvedValue([FOX_CHAT]);
        vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
        vi.mocked(listOwnActivities).mockResolvedValue([]);
        vi.mocked(listBuddies).mockResolvedValue([]);
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
    name: "a project's memory",
    render: workspacePage(
      () => {
        vi.mocked(getProject).mockResolvedValue(FOX_PROJECT);
        vi.mocked(readMemoryHistory).mockResolvedValue([...MEMORY_HISTORY]);
      },
      () => MemoryPage({ params: PROJECT_PARAMS, searchParams: NO_PARAMS }),
    ),
  },
  {
    name: "the new-chat form",
    render: workspacePage(
      () => {
        vi.mocked(listProjects).mockResolvedValue([FOX_PROJECT]);
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
    render: workspacePage(noData, () => Promise.resolve(<SettingsPage />)),
  },
  {
    name: "the buddies page",
    render: workspacePage(() => {
      vi.mocked(listBuddies).mockResolvedValue([HIPPY_CLONE]);
    }, BuddiesPage),
  },
  {
    name: "a built-in buddy's page",
    render: workspacePage(noData, () => buddyPage("hippy")),
  },
  {
    name: "her own buddy's page",
    render: workspacePage(
      () => {
        vi.mocked(getOwnBuddy).mockResolvedValue(HIPPY_CLONE);
      },
      () => buddyPage(HIPPY_CLONE.id),
    ),
  },
  {
    name: "the activities page",
    render: workspacePage(() => {
      vi.mocked(listOwnActivities).mockResolvedValue([BRAINSTORMING_CLONE]);
    }, ActivitiesPage),
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
  {
    name: "the account page",
    render: workspacePage(
      () => {
        vi.mocked(readMonthlyUsage).mockResolvedValue(MONTHLY_USAGE);
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
    render: workspacePage(
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
        vi.mocked(listBuddies).mockResolvedValue([HIPPY_CLONE]);
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
    ),
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
