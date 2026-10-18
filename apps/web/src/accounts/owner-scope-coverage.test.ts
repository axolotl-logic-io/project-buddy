// @vitest-environment node
// Every export of every module that reads or writes user data is checked
// for an owner filter. The list comes from each module's own exports, so a
// new export fails here until it is either called below, where each query
// it sends must be scoped to the owner's data, or allowed without an owner,
// with the reason. The sign-up code check and the sign-in rate limits are
// not here: they count attempts by address or client, never by a user.
// Each export is called once with no rows, so this checks the queries only.
// The server tests of use_case_private_data check real rows of two users:
// src/accounts/private-data-stores.server.test.ts restore and spend,
// private-data-buddies.server.test.ts buddies,
// private-data-central-chat.server.test.ts and
// private-data-chats.server.test.ts the chats, and
// private-data.server.test.ts and private-data-actions.server.test.ts the
// pages and Server Actions.
import { eq, type SQL } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  buddyOwnedBy,
  chatOwnedBy,
  memoryVersionOwnedBy,
  messageOwnedBy,
  monthlySpendOwnedBy,
  ownsProject,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import {
  BASED_ON,
  BUDDY,
  CHAT_ID,
  CHAT_NAME,
  MESSAGE,
  NEW_CHAT,
  NOW,
  OWNER,
  PROJECT_ID,
  REPLY,
  SPEND_MICRO_USD,
  USER_BUDDY_ID,
  VERSION,
} from "@/accounts/owner-scope-coverage-fixtures.ts";
import {
  type DataModule,
  exportCoverage,
  queriesNotOwnedBy,
} from "@/accounts/owner-scope-test-kit.ts";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "@/db/fake-neon-http.ts";
import { loginLinks, users } from "@/db/tables/users.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";

// The predicates that scope a query to the owner's projects, chats,
// messages, memory, spend and buddies.
const OWNER_SCOPE: readonly SQL[] = [
  projectOwnedBy(OWNER),
  chatOwnedBy(OWNER),
  messageOwnedBy(OWNER),
  memoryVersionOwnedBy(OWNER),
  ownsProject(OWNER, PROJECT_ID),
  monthlySpendOwnedBy(OWNER),
  buddyOwnedBy(OWNER),
];

// An account's own rows: the user's, and the sign-in links sent to them.
const OWN_ACCOUNT: readonly SQL[] = [
  eq(users.id, OWNER),
  eq(loginLinks.userId, OWNER),
];

// Each module as the object of its exports, so the test reads its export
// list.
const chatStore: typeof import("@/chats/store.ts") = await import(
  "@/chats/store.ts"
);
const newChatStore: typeof import("@/chats/new-chat-store.ts") = await import(
  "@/chats/new-chat-store.ts"
);
const centralChat: typeof import("@/chats/central-chat.ts") = await import(
  "@/chats/central-chat.ts"
);
const projectStore: typeof import("@/projects/store.ts") = await import(
  "@/projects/store.ts"
);
const memoryStore: typeof import("@/memory/memory-store.ts") = await import(
  "@/memory/memory-store.ts"
);
const spendStore: typeof import("@/quota/spend-store.ts") = await import(
  "@/quota/spend-store.ts"
);
const buddyStore: typeof import("@/buddies/buddy-store.ts") = await import(
  "@/buddies/buddy-store.ts"
);
const usersStore: typeof import("@/accounts/users-store.ts") = await import(
  "@/accounts/users-store.ts"
);
const loginLinkStore: typeof import("@/accounts/login-links.ts") = await import(
  "@/accounts/login-links.ts"
);

const BEFORE_SIGN_IN =
  "signs in: finds the account by its address or a link's token, before anyone is signed in";

const DATA_MODULES: readonly DataModule[] = [
  {
    path: "src/chats/store.ts",
    exports: chatStore,
    ownerPredicates: OWNER_SCOPE,
    scoped: {
      listChats: () => chatStore.listChats(OWNER, PROJECT_ID),
      getChat: () => chatStore.getChat(OWNER, CHAT_ID),
      listMessages: () => chatStore.listMessages(OWNER, CHAT_ID),
      saveMessage: () => chatStore.saveMessage(OWNER, CHAT_ID, MESSAGE),
      saveReply: () => chatStore.saveReply(OWNER, CHAT_ID, REPLY, MESSAGE.id),
      claimReply: () => chatStore.claimReply(OWNER, CHAT_ID, MESSAGE.id),
      releaseReply: () => chatStore.releaseReply(OWNER, CHAT_ID, MESSAGE.id),
      renameChat: () => chatStore.renameChat(OWNER, CHAT_ID, CHAT_NAME),
      saveAutomaticChatName: () =>
        chatStore.saveAutomaticChatName(OWNER, CHAT_ID, CHAT_NAME),
    },
    unscoped: [],
  },
  {
    path: "src/chats/new-chat-store.ts",
    exports: newChatStore,
    ownerPredicates: OWNER_SCOPE,
    scoped: {
      createChat: () => newChatStore.createChat(OWNER, NEW_CHAT),
      createChatWithOpening: () =>
        newChatStore.createChatWithOpening(OWNER, NEW_CHAT, REPLY),
      createProjectWithChat: () =>
        newChatStore.createProjectWithChat(OWNER, "Donut", {
          buddy: BUDDY,
          opening: REPLY,
        }),
    },
    unscoped: [],
  },
  {
    path: "src/chats/central-chat.ts",
    exports: centralChat,
    ownerPredicates: OWNER_SCOPE,
    scoped: {
      getOrCreateCentralChat: () => centralChat.getOrCreateCentralChat(OWNER),
    },
    unscoped: [],
  },
  {
    path: "src/projects/store.ts",
    exports: projectStore,
    ownerPredicates: OWNER_SCOPE,
    scoped: {
      listProjects: () => projectStore.listProjects(OWNER),
      getProject: () => projectStore.getProject(OWNER, PROJECT_ID),
      createProject: () => projectStore.createProject(OWNER, "Donut"),
    },
    unscoped: [],
  },
  {
    path: "src/memory/memory-store.ts",
    exports: memoryStore,
    ownerPredicates: OWNER_SCOPE,
    scoped: {
      readMemory: () => memoryStore.readMemory(OWNER, PROJECT_ID),
      readMemoryHistory: () => memoryStore.readMemoryHistory(OWNER, PROJECT_ID),
      saveMemory: () =>
        memoryStore.saveMemory(OWNER, {
          projectId: PROJECT_ID,
          text: "Mine",
          basedOn: BASED_ON,
          author: "user",
        }),
      restoreMemoryVersion: () =>
        memoryStore.restoreMemoryVersion(OWNER, {
          projectId: PROJECT_ID,
          version: VERSION,
          basedOn: BASED_ON,
          author: "user",
        }),
      editMemory: () =>
        memoryStore.editMemory(OWNER, {
          projectId: PROJECT_ID,
          edit: { oldText: "", newText: "Prefers shortcuts." },
          author: "tutor",
        }),
    },
    unscoped: [],
  },
  {
    path: "src/buddies/buddy-store.ts",
    exports: buddyStore,
    ownerPredicates: OWNER_SCOPE,
    scoped: {
      listBuddies: () => buddyStore.listBuddies(OWNER),
      getUserBuddy: () => buddyStore.getUserBuddy(OWNER, USER_BUDDY_ID),
      cloneBuddy: () => buddyStore.cloneBuddy(OWNER, DEFAULT_BUDDY_ID),
      updateBuddy: () =>
        buddyStore.updateBuddy(OWNER, USER_BUDDY_ID, { name: "Mine" }),
      deleteBuddy: () => buddyStore.deleteBuddy(OWNER, USER_BUDDY_ID),
    },
    unscoped: [],
  },
  {
    path: "src/quota/spend-store.ts",
    exports: spendStore,
    ownerPredicates: OWNER_SCOPE,
    scoped: {
      recordSpend: () => spendStore.recordSpend(OWNER, SPEND_MICRO_USD, NOW),
      readMonthlyUsage: () => spendStore.readMonthlyUsage(OWNER, NOW),
    },
    unscoped: [],
  },
  {
    path: "src/accounts/users-store.ts",
    exports: usersStore,
    ownerPredicates: OWN_ACCOUNT,
    scoped: {
      readSessionUser: () => usersStore.readSessionUser(OWNER, 1),
      endEverySession: () => usersStore.endEverySession(OWNER),
      saveHiddenExtras: () => usersStore.saveHiddenExtras(OWNER, ["memory"]),
      saveUserName: () => usersStore.saveUserName(OWNER, "Mabel"),
      readUserName: () => usersStore.readUserName(OWNER),
    },
    unscoped: [
      [usersStore.findOrCreateUser, BEFORE_SIGN_IN],
      [usersStore.findUserByEmail, BEFORE_SIGN_IN],
      [usersStore.normalizeEmail, "reads nothing: normalizes an address"],
    ],
  },
  {
    path: "src/accounts/login-links.ts",
    exports: loginLinkStore,
    ownerPredicates: OWN_ACCOUNT,
    scoped: {},
    unscoped: [
      [loginLinkStore.readLoginLinkUser, BEFORE_SIGN_IN],
      [loginLinkStore.requestLoginLink, BEFORE_SIGN_IN],
      [loginLinkStore.LOGIN_LINK_LIFETIME_MINUTES, "a constant"],
    ],
  },
];

// The neon-http database, answering every query with no rows: nothing is
// found, so each call goes on to every query it can send.
let neonHttp: FakeNeonHttp = fakeNeonHttp({
  kind: "rows",
  columns: [],
  rows: [],
});

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  neonHttp = fakeNeonHttp({ kind: "rows", columns: [], rows: [] });
  vi.stubGlobal("fetch", neonHttp.fetch);
  spyOnErrorLog();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each(DATA_MODULES)("$path", (dataModule) => {
  test("every export is checked for an owner filter, or allowed without one", () => {
    const { exports, scoped, unscoped } = dataModule;
    expect(
      exportCoverage(
        exports,
        Object.keys(scoped),
        unscoped.map(([allowed]) => allowed),
      ),
    ).toEqual({
      unchecked: [],
      twice: [],
      stale: [],
    });
  });

  test.each(Object.entries(dataModule.scoped))(
    "%s reads and writes only the owner's data",
    async (_name, call) => {
      await call().catch(() => undefined);

      expect(neonHttp.queries.length).toBeGreaterThan(0);
      expect(
        queriesNotOwnedBy(OWNER, dataModule.ownerPredicates, neonHttp.queries),
      ).toEqual([]);
    },
  );
});
