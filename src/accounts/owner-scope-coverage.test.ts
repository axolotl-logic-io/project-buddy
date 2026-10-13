// @vitest-environment node
// Every export of every module that reads or writes user data is checked
// for an owner filter. The list comes from each module's own exports, so a
// new export fails here until it is either called below, where each query
// it sends must be scoped to the owner's data, or allowed without an owner,
// with the reason. The sign-up code check and the sign-in rate limits are
// not here: they count attempts by address or client, never by a user.
import { eq, type SQL } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  chatOwnedBy,
  memoryVersionOwnedBy,
  messageOwnedBy,
  monthlySpendOwnedBy,
  ownsProject,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import {
  exportCoverage,
  queriesNotOwnedBy,
} from "@/accounts/owner-scope-test-kit.ts";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { NewMessage } from "@/chats/chat-rows.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "@/db/fake-neon-http.ts";
import { loginLinks, users } from "@/db/tables/users.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import {
  chatIdFixture,
  messageIdFixture,
  projectIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";
import type { ProjectId } from "@/ids.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { DEFAULT_PERSONA_ID, type PersonaId } from "@/personas/index.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const CHAT_ID = chatIdFixture();
const NEW_CHAT: {
  readonly projectId: ProjectId;
  readonly personaId: PersonaId;
} = { projectId: PROJECT_ID, personaId: DEFAULT_PERSONA_ID };
const MESSAGE: NewMessage = {
  id: messageIdFixture("m1"),
  role: "user",
  parts: [{ type: "text", text: "How do I bevel?" }],
};
const REPLY: NewMessage = {
  id: messageIdFixture("r1"),
  role: "assistant",
  parts: [{ type: "text", text: "Press Ctrl+B." }],
};
const CHAT_NAME = chatNameFixture("Beveling the donut");
const VERSION = MEMORY_VERSION_NUMBER.parse(1);
const BASED_ON = MEMORY_VERSION_NUMBER.parse(2);
const SPEND_MICRO_USD = 1200;
const NOW = new Date("2026-10-12T09:00:00Z");

// The predicates that scope a query to the owner's projects, chats,
// messages, memory and spend.
const OWNER_SCOPE: readonly SQL[] = [
  projectOwnedBy(OWNER),
  chatOwnedBy(OWNER),
  messageOwnedBy(OWNER),
  memoryVersionOwnedBy(OWNER),
  ownsProject(OWNER, PROJECT_ID),
  monthlySpendOwnedBy(OWNER),
];

// An account's own rows: the user's, and the sign-in links sent to them.
const OWN_ACCOUNT: readonly SQL[] = [
  eq(users.id, OWNER),
  eq(loginLinks.userId, OWNER),
];

// An export that takes no owner on purpose, and why. It is the export
// itself rather than its name, so one renamed or removed fails to compile.
type Unscoped = readonly [allowed: unknown, reason: string];

// A module that reads or writes user data, and how each export is checked.
interface DataModule {
  readonly path: string;
  readonly exports: Readonly<Record<string, unknown>>;
  // What scopes a query of this module to OWNER's data.
  readonly ownerPredicates: readonly SQL[];
  // Each export that must keep to OWNER's data, called for OWNER.
  readonly scoped: Readonly<Record<string, () => Promise<unknown>>>;
  // Each export that takes no owner on purpose, and why.
  readonly unscoped: readonly Unscoped[];
}

// Each module as the object of its exports, so the test reads its export
// list.
const chatStore: typeof import("@/chats/store.ts") = await import(
  "@/chats/store.ts"
);
const newChatStore: typeof import("@/chats/new-chat-store.ts") = await import(
  "@/chats/new-chat-store.ts"
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
          personaId: DEFAULT_PERSONA_ID,
          opening: REPLY,
        }),
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
    },
    unscoped: [
      [usersStore.findOrCreateUser, BEFORE_SIGN_IN],
      [usersStore.findUserByEmail, BEFORE_SIGN_IN],
      [
        usersStore.normalizeEmail,
        "reads nothing: it only normalizes an address",
      ],
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
      [loginLinkStore.hashToken, "reads nothing: it only hashes a token"],
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
