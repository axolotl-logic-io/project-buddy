// @vitest-environment node
import type { SQL } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  chatOwnedBy,
  messageOwnedBy,
  projectOwnedBy,
} from "@/accounts/owner-scope.ts";
import { holdsPredicate } from "@/accounts/owner-scope-test-kit.ts";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import type { NewMessage } from "@/chats/chat-rows.ts";
import { createChatWithOpening } from "@/chats/new-chat-store.ts";
import {
  getChat,
  listChats,
  listMessages,
  renameChat,
  saveAutomaticChatName,
  saveMessage,
  saveReply,
} from "@/chats/store.ts";
import { CHAT_COLUMNS, storedRows } from "@/chats/stored-rows.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import {
  chatIdFixture,
  messageIdFixture,
  projectIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  snapshotOf,
} from "@/personas/index.ts";

const OWNER = userIdFixture();
const CHAT_ID = chatIdFixture();
const PROJECT_ID = projectIdFixture();
const MESSAGE_ID = messageIdFixture("m1");
const CHAT_NAME = chatNameFixture("Beveling the donut");
const CREATED_AT = "2026-10-11 09:00:00+00";
const RENAMES_BY_HAND =
  /^update "chats" set "name" = \$1, "renamed_by_hand" = \$2 where \("chats"\."id" = \$3 and /u;
const UNLESS_RENAMED_BY_HAND = /and not "chats"\."renamed_by_hand"\)$/u;
const OPENING: NewMessage = {
  id: messageIdFixture("opening"),
  role: "assistant",
  parts: [{ type: "text", text: "What are we making?" }],
};

// Each store function, called for OWNER, with the predicate that scopes
// its query to OWNER's data.
const calls: [string, () => Promise<unknown>, SQL][] = [
  [
    "listChats",
    (): Promise<unknown> => listChats(OWNER, PROJECT_ID),
    chatOwnedBy(OWNER),
  ],
  [
    "getChat",
    (): Promise<unknown> => getChat(OWNER, CHAT_ID),
    chatOwnedBy(OWNER),
  ],
  [
    "createChatWithOpening",
    (): Promise<unknown> =>
      createChatWithOpening(
        OWNER,
        { projectId: PROJECT_ID, persona: getPersona("hippy") },
        OPENING,
      ),
    projectOwnedBy(OWNER),
  ],
  [
    "listMessages",
    (): Promise<unknown> => listMessages(OWNER, CHAT_ID),
    messageOwnedBy(OWNER),
  ],
  [
    "saveMessage",
    (): Promise<unknown> =>
      saveMessage(OWNER, CHAT_ID, {
        id: MESSAGE_ID,
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
      }),
    chatOwnedBy(OWNER),
  ],
  [
    "saveReply",
    (): Promise<unknown> =>
      saveReply(
        OWNER,
        CHAT_ID,
        { id: "r1", role: "assistant", parts: [{ type: "text", text: "Ho" }] },
        MESSAGE_ID,
      ),
    chatOwnedBy(OWNER),
  ],
  [
    "renameChat",
    (): Promise<unknown> => renameChat(OWNER, CHAT_ID, CHAT_NAME),
    chatOwnedBy(OWNER),
  ],
  [
    "saveAutomaticChatName",
    (): Promise<unknown> => saveAutomaticChatName(OWNER, CHAT_ID, CHAT_NAME),
    chatOwnedBy(OWNER),
  ],
];

const MR_TEE = snapshotOf(getPersona("mr-tee"));

// Chats as `select * from chats` returns them.
function storedChats(
  rows: readonly (readonly (string | null)[])[],
): FakeNeonHttp {
  return storedRows(CHAT_COLUMNS, rows);
}

// Chats joined with their project's name, as getChat reads them.
function storedChatsWithProject(
  rows: readonly (readonly (string | null)[])[],
): FakeNeonHttp {
  return storedRows(
    [...CHAT_COLUMNS, "project_name", "project_interview_chat_id"],
    rows,
  );
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("chat store ownership", () => {
  test.each(calls)(
    "%s reads or writes only the owner's data",
    async (_operation, call, predicate) => {
      const neonHttp = storedChats([]);

      await call().catch(() => undefined);

      expect(neonHttp.queries.length).toBeGreaterThan(0);
      expect(holdsPredicate(neonHttp.queries[0], predicate)).toBe(true);
    },
  );

  test.each(calls)(
    "%s rejects with a logged AppError when the database is unreachable",
    async (operation, call) => {
      vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
      const log = spyOnErrorLog();

      const error = await call().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toHaveProperty("errorCase", "database-unreachable");
      expect(log).toHaveBeenCalledWith(
        `[app-error] database-unreachable in ${operation}`,
        expect.any(String),
      );
    },
  );
});

describe("chat store getChat", () => {
  test("getChat finds a malformed id nowhere, without a query", async () => {
    const neonHttp = storedChatsWithProject([]);

    expect(await getChat(OWNER, "chat-1")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });

  test("getChat looks up the lowercase id and returns the chat and its project's name", async () => {
    const neonHttp = storedChatsWithProject([
      [
        CHAT_ID,
        PROJECT_ID,
        "mr-tee",
        MR_TEE.name,
        JSON.stringify(MR_TEE.parts),
        CHAT_NAME,
        "t",
        CREATED_AT,
        "Fox",
        null,
      ],
    ]);

    expect(await getChat(OWNER, CHAT_ID.toUpperCase())).toEqual({
      id: CHAT_ID,
      projectId: PROJECT_ID,
      persona: MR_TEE,
      name: CHAT_NAME,
      renamedByHand: true,
      createdAt: new Date(CREATED_AT),
      projectName: "Fox",
      isInterviewChat: false,
    });
    expect(neonHttp.queries[0]?.params).toEqual([CHAT_ID, OWNER]);
  });

  test("getChat finds an unknown or foreign chat nowhere", async () => {
    storedChatsWithProject([]);

    expect(await getChat(OWNER, CHAT_ID)).toBeUndefined();
  });
});

describe("chat store listChats", () => {
  test("listChats returns the project's chats and skips a row whose id is not a UUID", async () => {
    storedChats([
      ["not-a-uuid", PROJECT_ID, "hippy", null, null, null, "f", CREATED_AT],
      [
        CHAT_ID,
        PROJECT_ID,
        "retired-persona",
        null,
        null,
        CHAT_NAME,
        "f",
        CREATED_AT,
      ],
    ]);

    expect(await listChats(OWNER, PROJECT_ID)).toEqual([
      {
        id: CHAT_ID,
        projectId: PROJECT_ID,
        persona: snapshotOf(getPersona(DEFAULT_PERSONA_ID)),
        name: CHAT_NAME,
        renamedByHand: false,
        createdAt: new Date(CREATED_AT),
      },
    ]);
  });

  test("listChats reads a stored name that is no chat name as no name", async () => {
    storedChats([
      [
        CHAT_ID,
        PROJECT_ID,
        "mr-tee",
        null,
        null,
        "Two\nlines",
        "f",
        CREATED_AT,
      ],
    ]);

    expect(await listChats(OWNER, PROJECT_ID)).toEqual([
      expect.objectContaining({ id: CHAT_ID, name: undefined }),
    ]);
  });
});

describe("chat store names", () => {
  test("renameChat saves her name, marks the chat renamed by hand, and finds it", async () => {
    const neonHttp = storedRows(["id"], [[CHAT_ID]]);

    expect(await renameChat(OWNER, CHAT_ID, CHAT_NAME)).toBe(true);

    const [update] = neonHttp.queries;
    expect(update?.query).toMatch(RENAMES_BY_HAND);
    expect(update?.params).toEqual([CHAT_NAME, "true", CHAT_ID, OWNER]);
  });

  test("renameChat finds an unknown or foreign chat nowhere", async () => {
    storedRows(["id"], []);

    expect(await renameChat(OWNER, CHAT_ID, CHAT_NAME)).toBe(false);
  });

  test("saveAutomaticChatName names only a chat she hasn't renamed by hand", async () => {
    const neonHttp = storedRows([], []);

    await saveAutomaticChatName(OWNER, CHAT_ID, CHAT_NAME);

    const [update] = neonHttp.queries;
    expect(update?.query).toMatch(UNLESS_RENAMED_BY_HAND);
    expect(update?.params).toEqual([CHAT_NAME, CHAT_ID, OWNER]);
  });
});
