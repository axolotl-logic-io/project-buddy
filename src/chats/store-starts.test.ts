// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { holdsPredicate } from "@/accounts/owner-scope-test-kit.ts";
import type { Chat, NewMessage } from "@/chats/chat-rows.ts";
import {
  createChat,
  createChatWithOpening,
  createProjectWithChat,
} from "@/chats/new-chat-store.ts";
import { storedRows } from "@/chats/stored-rows.ts";
import { FAKE_DATABASE_URL, type FakeNeonHttp } from "@/db/fake-neon-http.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import {
  chatIdFixture,
  messageIdFixture,
  projectIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";

const OWNER = userIdFixture();
const CHAT_ID = chatIdFixture();
const PROJECT_ID = projectIdFixture();
const CREATED_AT = "2026-10-11 09:00:00+00";
const OPENING: NewMessage = {
  id: messageIdFixture("opening"),
  role: "assistant",
  parts: [{ type: "text", text: "What are we making?" }],
};
const INSERTS_MESSAGE = /^insert into "messages"/u;
const INSERTS_PROJECT = /^insert into "projects"/u;
const STARTED_CHAT: Chat = {
  id: CHAT_ID,
  projectId: PROJECT_ID,
  personaId: "mr-tee",
  name: undefined,
  renamedByHand: false,
  createdAt: new Date(CREATED_AT),
};

// Chats as an insert returns them.
function storedChats(rows: readonly (readonly string[])[]): FakeNeonHttp {
  return storedRows(
    ["id", "project_id", "persona_id", "name", "renamed_by_hand", "created_at"],
    rows.map(([id = "", projectId = ""]) => [
      id,
      projectId,
      "mr-tee",
      null,
      "f",
      CREATED_AT,
    ]),
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

describe("chat store createChat", () => {
  test("saves an empty chat in the owner's project", async () => {
    const neonHttp = storedChats([[CHAT_ID, PROJECT_ID]]);

    expect(
      await createChat(OWNER, { projectId: PROJECT_ID, personaId: "mr-tee" }),
    ).toEqual(STARTED_CHAT);

    expect(neonHttp.queries).toHaveLength(1);
    expect(holdsPredicate(neonHttp.queries[0], projectOwnedBy(OWNER))).toBe(
      true,
    );
  });

  test("rejects with the not-found case, unlogged, for a foreign project", async () => {
    storedChats([]);
    const log = spyOnErrorLog();

    const error = await createChat(OWNER, {
      projectId: PROJECT_ID,
      personaId: "mr-tee",
    }).catch((caught: unknown) => caught);

    expect(error).toHaveProperty("errorCase", "not-found");
    expect(log).not.toHaveBeenCalled();
  });
});

describe("chat store createChatWithOpening", () => {
  test("saves the chat and its opening in one batch, in the owner's project", async () => {
    const neonHttp = storedChats([[CHAT_ID, PROJECT_ID]]);

    expect(
      await createChatWithOpening(
        OWNER,
        { projectId: PROJECT_ID, personaId: "mr-tee" },
        OPENING,
      ),
    ).toEqual(STARTED_CHAT);

    expect(neonHttp.batches).toHaveLength(1);
    const [chat, opening] = neonHttp.batches[0] ?? [];
    expect(holdsPredicate(chat, projectOwnedBy(OWNER))).toBe(true);
    expect(opening?.query).toMatch(INSERTS_MESSAGE);
    expect(opening?.params).toEqual(expect.arrayContaining([OPENING.id]));
  });

  test("rejects with the not-found case, unlogged, for a foreign project", async () => {
    storedChats([]);
    const log = spyOnErrorLog();

    const error = await createChatWithOpening(
      OWNER,
      { projectId: PROJECT_ID, personaId: "mr-tee" },
      OPENING,
    ).catch((caught: unknown) => caught);

    expect(error).toHaveProperty("errorCase", "not-found");
    expect(log).not.toHaveBeenCalled();
  });
});

describe("chat store createProjectWithChat", () => {
  test("saves the owner's project, its chat and the opening in one batch", async () => {
    const neonHttp = storedChats([[CHAT_ID, PROJECT_ID]]);

    expect(
      await createProjectWithChat(OWNER, "Low-poly fox", {
        personaId: "mr-tee",
        opening: OPENING,
      }),
    ).toEqual(STARTED_CHAT);

    expect(neonHttp.batches).toHaveLength(1);
    const [project, chat, opening] = neonHttp.batches[0] ?? [];
    expect(project?.query).toMatch(INSERTS_PROJECT);
    expect(project?.params).toEqual(
      expect.arrayContaining([OWNER, "Low-poly fox"]),
    );
    const projectId = project?.params[0];
    expect(chat?.params).toEqual(expect.arrayContaining([projectId]));
    expect(opening?.params).toEqual(expect.arrayContaining([OPENING.id]));
  });
});
