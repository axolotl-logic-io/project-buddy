// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { holdsPredicate } from "@/accounts/owner-scope-test-kit.ts";
import { getBuddy, snapshotOf } from "@/buddies/index.ts";
import type { Chat, NewMessage } from "@/chats/chat-rows.ts";
import {
  createChat,
  createChatWithOpening,
  createProjectWithChat,
} from "@/chats/new-chat-store.ts";
import { CHAT_COLUMNS, storedRows } from "@/chats/stored-rows.ts";
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
const SETS_INTERVIEW_CHAT =
  /^update "projects" set "interview_chat_id" = \$1 where/u;
const MR_TEE = getBuddy("mr-tee");
const STARTED_CHAT: Chat = {
  id: CHAT_ID,
  projectId: PROJECT_ID,
  buddy: snapshotOf(MR_TEE),
  name: undefined,
  renamedByHand: false,
  createdAt: new Date(CREATED_AT),
};

// Chats as an insert returns them.
function storedChats(rows: readonly (readonly string[])[]): FakeNeonHttp {
  return storedRows(
    CHAT_COLUMNS,
    rows.map(([id = "", projectId = ""]) => [
      id,
      projectId,
      MR_TEE.id,
      MR_TEE.name,
      JSON.stringify(MR_TEE.parts),
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
      await createChat(OWNER, { projectId: PROJECT_ID, buddy: MR_TEE }),
    ).toEqual(STARTED_CHAT);

    expect(neonHttp.queries).toHaveLength(1);
    expect(holdsPredicate(neonHttp.queries[0], projectOwnedBy(OWNER))).toBe(
      true,
    );
    expect(neonHttp.queries[0]?.params).toEqual(
      expect.arrayContaining([
        MR_TEE.id,
        MR_TEE.name,
        JSON.stringify(MR_TEE.parts),
      ]),
    );
  });

  test("rejects with the not-found case, unlogged, for a foreign project", async () => {
    storedChats([]);
    const log = spyOnErrorLog();

    const error = await createChat(OWNER, {
      projectId: PROJECT_ID,
      buddy: MR_TEE,
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
        { projectId: PROJECT_ID, buddy: MR_TEE },
        OPENING,
      ),
    ).toEqual(STARTED_CHAT);

    expect(neonHttp.batches).toHaveLength(1);
    const [chat, opening] = neonHttp.batches[0] ?? [];
    expect(holdsPredicate(chat, projectOwnedBy(OWNER))).toBe(true);
    expect(chat?.params).toEqual(
      expect.arrayContaining([MR_TEE.name, JSON.stringify(MR_TEE.parts)]),
    );
    expect(opening?.query).toMatch(INSERTS_MESSAGE);
    expect(opening?.params).toEqual(expect.arrayContaining([OPENING.id]));
  });

  test("rejects with the not-found case, unlogged, for a foreign project", async () => {
    storedChats([]);
    const log = spyOnErrorLog();

    const error = await createChatWithOpening(
      OWNER,
      { projectId: PROJECT_ID, buddy: MR_TEE },
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
        buddy: MR_TEE,
        opening: OPENING,
      }),
    ).toEqual(STARTED_CHAT);

    expect(neonHttp.batches).toHaveLength(1);
    const [project, chat, opening] = neonHttp.batches[0] ?? [];
    expect(chat?.params).toEqual(
      expect.arrayContaining([
        MR_TEE.id,
        MR_TEE.name,
        JSON.stringify(MR_TEE.parts),
      ]),
    );
    expect(project?.query).toMatch(INSERTS_PROJECT);
    expect(project?.params).toEqual(
      expect.arrayContaining([OWNER, "Low-poly fox"]),
    );
    const projectId = project?.params[0];
    expect(chat?.params).toEqual(expect.arrayContaining([projectId]));
    expect(opening?.params).toEqual(expect.arrayContaining([OPENING.id]));
  });

  test("makes the new chat the project's interview chat, in the same batch", async () => {
    const neonHttp = storedChats([[CHAT_ID, PROJECT_ID]]);

    await createProjectWithChat(OWNER, "Low-poly fox", {
      buddy: MR_TEE,
      opening: OPENING,
    });

    const [project, chat, , interview] = neonHttp.batches[0] ?? [];
    const [projectId] = project?.params ?? [];
    const [chatId] = chat?.params ?? [];
    expect(interview?.query).toMatch(SETS_INTERVIEW_CHAT);
    expect(interview?.params).toEqual([chatId, projectId, OWNER]);
    expect(holdsPredicate(interview, projectOwnedBy(OWNER))).toBe(true);
  });
});
