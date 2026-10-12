// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import {
  createChat,
  getChat,
  listChats,
  listMessages,
  renameChat,
  saveAutomaticChatName,
  saveMessage,
  saveReply,
} from "@/chats/store.ts";
import { storedRows } from "@/chats/stored-rows.ts";
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
} from "@/id-fixtures.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";

const CHAT_ID = chatIdFixture();
const PROJECT_ID = projectIdFixture();
const MESSAGE_ID = messageIdFixture("m1");
const CHAT_NAME = chatNameFixture("Beveling the donut");
const CREATED_AT = "2026-10-11 09:00:00+00";

const calls: [string, () => Promise<unknown>][] = [
  ["listChats", (): Promise<unknown> => listChats(PROJECT_ID)],
  ["getChat", (): Promise<unknown> => getChat(CHAT_ID)],
  [
    "createChat",
    (): Promise<unknown> =>
      createChat({ projectId: PROJECT_ID, personaId: "hippy" }),
  ],
  ["listMessages", (): Promise<unknown> => listMessages(CHAT_ID)],
  [
    "saveMessage",
    (): Promise<unknown> =>
      saveMessage(CHAT_ID, {
        id: MESSAGE_ID,
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
      }),
  ],
  [
    "saveReply",
    (): Promise<unknown> =>
      saveReply(
        CHAT_ID,
        { id: "r1", role: "assistant", parts: [{ type: "text", text: "Ho" }] },
        MESSAGE_ID,
      ),
  ],
  ["renameChat", (): Promise<unknown> => renameChat(CHAT_ID, CHAT_NAME)],
  [
    "saveAutomaticChatName",
    (): Promise<unknown> => saveAutomaticChatName(CHAT_ID, CHAT_NAME),
  ],
];

// Chats as `select * from chats` returns them.
function storedChats(
  rows: readonly (readonly (string | null)[])[],
): FakeNeonHttp {
  return storedRows(
    ["id", "project_id", "persona_id", "name", "renamed_by_hand", "created_at"],
    rows,
  );
}

// Chats joined with their project's name, as getChat reads them.
function storedChatsWithProject(
  rows: readonly (readonly (string | null)[])[],
): FakeNeonHttp {
  return storedRows(
    [
      "id",
      "project_id",
      "persona_id",
      "name",
      "renamed_by_hand",
      "created_at",
      "project_name",
    ],
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

describe("chat store failures", () => {
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

  test("createChat rejects with a logged AppError when no chat comes back", async () => {
    storedChats([]);
    const log = spyOnErrorLog();

    const error = await createChat({
      projectId: PROJECT_ID,
      personaId: "mr-tee",
    }).catch((caught: unknown) => caught);

    expect(error).toHaveProperty("errorCase", "unknown");
    expect(log).toHaveBeenCalledWith(
      "[app-error] unknown in createChat",
      expect.any(String),
    );
  });
});

describe("chat store getChat", () => {
  test("getChat finds a malformed id nowhere, without a query", async () => {
    const neonHttp = storedChatsWithProject([]);

    expect(await getChat("chat-1")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });

  test("getChat looks up the lowercase id and returns the chat and its project's name", async () => {
    const neonHttp = storedChatsWithProject([
      [CHAT_ID, PROJECT_ID, "mr-tee", CHAT_NAME, "t", CREATED_AT, "Fox"],
    ]);

    expect(await getChat(CHAT_ID.toUpperCase())).toEqual({
      id: CHAT_ID,
      projectId: PROJECT_ID,
      personaId: "mr-tee",
      name: CHAT_NAME,
      renamedByHand: true,
      createdAt: new Date(CREATED_AT),
      projectName: "Fox",
    });
    expect(neonHttp.queries[0]?.params).toEqual([CHAT_ID]);
  });

  test("getChat reads a persona that no longer exists as the default persona", async () => {
    storedChatsWithProject([
      [CHAT_ID, PROJECT_ID, "retired-persona", null, "f", CREATED_AT, "Fox"],
    ]);

    expect(await getChat(CHAT_ID)).toHaveProperty(
      "personaId",
      DEFAULT_PERSONA_ID,
    );
  });
});

describe("chat store listChats and createChat", () => {
  test("listChats returns the project's chats and skips a row whose id is not a UUID", async () => {
    storedChats([
      ["not-a-uuid", PROJECT_ID, "hippy", null, "f", CREATED_AT],
      [CHAT_ID, PROJECT_ID, "retired-persona", CHAT_NAME, "f", CREATED_AT],
    ]);

    expect(await listChats(PROJECT_ID)).toEqual([
      {
        id: CHAT_ID,
        projectId: PROJECT_ID,
        personaId: DEFAULT_PERSONA_ID,
        name: CHAT_NAME,
        renamedByHand: false,
        createdAt: new Date(CREATED_AT),
      },
    ]);
  });

  test("listChats reads a stored name that is no chat name as no name", async () => {
    storedChats([
      [CHAT_ID, PROJECT_ID, "mr-tee", "Two\nlines", "f", CREATED_AT],
    ]);

    expect(await listChats(PROJECT_ID)).toEqual([
      expect.objectContaining({ id: CHAT_ID, name: undefined }),
    ]);
  });

  test("createChat returns the inserted chat, with no name yet", async () => {
    storedChats([[CHAT_ID, PROJECT_ID, "mr-tee", null, "f", CREATED_AT]]);

    expect(
      await createChat({ projectId: PROJECT_ID, personaId: "mr-tee" }),
    ).toEqual({
      id: CHAT_ID,
      projectId: PROJECT_ID,
      personaId: "mr-tee",
      name: undefined,
      renamedByHand: false,
      createdAt: new Date(CREATED_AT),
    });
  });
});

describe("chat store names", () => {
  test("renameChat saves her name and marks the chat renamed by hand", async () => {
    const neonHttp = storedRows([], []);

    await renameChat(CHAT_ID, CHAT_NAME);

    const [update] = neonHttp.queries;
    expect(update?.query).toBe(
      'update "chats" set "name" = $1, "renamed_by_hand" = $2 where "chats"."id" = $3',
    );
    expect(update?.params).toEqual([CHAT_NAME, "true", CHAT_ID]);
  });

  test("saveAutomaticChatName names only a chat she hasn't renamed by hand", async () => {
    const neonHttp = storedRows([], []);

    await saveAutomaticChatName(CHAT_ID, CHAT_NAME);

    const [update] = neonHttp.queries;
    expect(update?.query).toBe(
      'update "chats" set "name" = $1 where ("chats"."id" = $2 and not "chats"."renamed_by_hand")',
    );
    expect(update?.params).toEqual([CHAT_NAME, CHAT_ID]);
  });
});
