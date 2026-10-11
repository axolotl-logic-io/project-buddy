// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { chatIdFixture } from "@/chats/chat-fixtures.ts";
import {
  createChat,
  getChat,
  listChats,
  listMessages,
  saveMessage,
} from "@/chats/store.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
  type NeonHttpAnswer,
} from "@/db/fake-neon-http.ts";
import { AppError } from "@/errors/app-error.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import { projectIdFixture } from "@/projects/project-fixtures.ts";

const CHAT_ID = chatIdFixture();
const PROJECT_ID = projectIdFixture();
const CREATED_AT = "2026-10-11 09:00:00+00";
const SECRET_TEXT = "my private question";

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
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
      }),
  ],
];

// The database answers every query with these rows of text columns.
function storedRows(
  columns: readonly string[],
  rows: readonly (readonly string[])[],
): FakeNeonHttp {
  const answer: NeonHttpAnswer = {
    kind: "rows",
    columns: columns.map((name) => {
      if (name === "created_at") {
        return { name, type: "timestamptz" };
      }
      return { name, type: "text" };
    }),
    rows,
  };
  const neonHttp = fakeNeonHttp(answer);
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
}

// Chats as `select * from chats` returns them.
function storedChats(rows: readonly (readonly string[])[]): FakeNeonHttp {
  return storedRows(["id", "project_id", "persona_id", "created_at"], rows);
}

// Chats joined with their project's name, as getChat reads them.
function storedChatsWithProject(
  rows: readonly (readonly string[])[],
): FakeNeonHttp {
  return storedRows(
    ["id", "project_id", "persona_id", "created_at", "name"],
    rows,
  );
}

// Messages as listMessages reads them, with the parts as JSON text.
function storedMessages(rows: readonly (readonly string[])[]): FakeNeonHttp {
  return storedRows(["id", "role", "parts"], rows);
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
      personaId: "mr-t",
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
      [CHAT_ID, PROJECT_ID, "mr-t", CREATED_AT, "Fox"],
    ]);

    expect(await getChat(CHAT_ID.toUpperCase())).toEqual({
      id: CHAT_ID,
      projectId: PROJECT_ID,
      personaId: "mr-t",
      createdAt: new Date(CREATED_AT),
      projectName: "Fox",
    });
    expect(neonHttp.queries[0]?.params).toEqual([CHAT_ID]);
  });

  test("getChat reads a persona that no longer exists as the default persona", async () => {
    storedChatsWithProject([
      [CHAT_ID, PROJECT_ID, "retired-persona", CREATED_AT, "Fox"],
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
      ["not-a-uuid", PROJECT_ID, "hippy", CREATED_AT],
      [CHAT_ID, PROJECT_ID, "retired-persona", CREATED_AT],
    ]);

    expect(await listChats(PROJECT_ID)).toEqual([
      {
        id: CHAT_ID,
        projectId: PROJECT_ID,
        personaId: DEFAULT_PERSONA_ID,
        createdAt: new Date(CREATED_AT),
      },
    ]);
  });

  test("createChat returns the inserted chat", async () => {
    storedChats([[CHAT_ID, PROJECT_ID, "mr-t", CREATED_AT]]);

    expect(
      await createChat({ projectId: PROJECT_ID, personaId: "mr-t" }),
    ).toEqual({
      id: CHAT_ID,
      projectId: PROJECT_ID,
      personaId: "mr-t",
      createdAt: new Date(CREATED_AT),
    });
  });
});

describe("chat store messages", () => {
  test("listMessages returns the stored messages as UI messages", async () => {
    storedMessages([
      ["m1", "user", JSON.stringify([{ type: "text", text: "Hi" }])],
      ["m2", "assistant", JSON.stringify([{ type: "text", text: "Hello" }])],
    ]);

    expect(await listMessages(CHAT_ID)).toEqual([
      { id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "Hello" }] },
    ]);
  });

  test("listMessages drops and logs a message whose role or parts are invalid, without its text", async () => {
    storedMessages([
      ["m1", "narrator", JSON.stringify([{ type: "text", text: SECRET_TEXT }])],
      ["m2", "user", JSON.stringify([{ type: "text", body: SECRET_TEXT }])],
      ["m3", "user", JSON.stringify([{ type: "text", text: "Hi" }])],
    ]);
    const log = spyOnErrorLog();

    expect(await listMessages(CHAT_ID)).toEqual([
      { id: "m3", role: "user", parts: [{ type: "text", text: "Hi" }] },
    ]);
    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(
      "[app-error] unknown in listMessages",
      expect.stringContaining("m1"),
    );
    expect(log).toHaveBeenCalledWith(
      "[app-error] unknown in listMessages",
      expect.stringContaining("m2"),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(SECRET_TEXT);
  });
});
