// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { DEFAULT_BUDDY_ID, getBuddy, snapshotOf } from "@/buddies/index.ts";
import { createCentralChat, listCentralChats } from "@/chats/central-chat.ts";
import { getChat, listChats } from "@/chats/store.ts";
import { AppError } from "@/errors/app-error.ts";
import { holdsPredicate } from "../accounts/owner-scope-test-kit.ts";
import { FAKE_DATABASE_URL, type FakeNeonHttp } from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import {
  chatIdFixture,
  projectIdFixture,
  userIdFixture,
} from "../id-fixtures.ts";
import { CHAT_COLUMNS, storedRows } from "./stored-rows.ts";

const OWNER = userIdFixture();
const CHAT_ID = chatIdFixture();
const CREATED_AT = "2026-10-11 09:00:00+00";
const DEFAULT_BUDDY = snapshotOf(getBuddy(DEFAULT_BUDDY_ID));
const INSERTS_CHAT = /^insert into "chats" /u;

// The owner's central chat as `select * from chats` returns it: no project,
// and the owner in user_id.
const CENTRAL_ROW: readonly (string | null)[] = [
  CHAT_ID,
  null,
  DEFAULT_BUDDY_ID,
  DEFAULT_BUDDY.name,
  JSON.stringify(DEFAULT_BUDDY.parts),
  null,
  "f",
  CREATED_AT,
  OWNER,
];

// Chats as `select * from chats` returns them.
function storedChats(
  rows: readonly (readonly (string | null)[])[],
): FakeNeonHttp {
  return storedRows([...CHAT_COLUMNS, "user_id"], rows);
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("standalone chat store", () => {
  test("creates a new chat with the chosen buddy snapshot", async () => {
    const neonHttp = storedChats([CENTRAL_ROW]);
    const chat = await createCentralChat(OWNER);
    expect(chat).toMatchObject({
      kind: "central",
      id: CHAT_ID,
      buddy: DEFAULT_BUDDY,
    });
    const [insert] = neonHttp.queries;
    expect(insert?.query).toMatch(INSERTS_CHAT);
    expect(insert?.query).not.toContain("on conflict");
    expect(insert?.params).toEqual([
      DEFAULT_BUDDY_ID,
      DEFAULT_BUDDY.name,
      JSON.stringify(DEFAULT_BUDDY.parts),
      OWNER,
    ]);
    expect(neonHttp.queries).toHaveLength(1);
  });

  test("lists only the owner's standalone chats without inserting any", async () => {
    const neonHttp = storedChats([CENTRAL_ROW]);
    expect(await listCentralChats(OWNER)).toHaveLength(1);
    const [select] = neonHttp.queries;
    expect(holdsPredicate(select, chatOwnedBy(OWNER))).toBe(true);
    expect(neonHttp.queries).toHaveLength(1);
    expect(select?.query).toContain('order by "chats"."created_at" desc');
  });

  test("rejects with not found when an insert returns no chat", async () => {
    storedChats([]);
    spyOnErrorLog();
    const error = await createCentralChat(OWNER).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error).toHaveProperty("errorCase", "not-found");
  });
});

describe("central chat in the chat store", () => {
  test("getChat finds the owner's central chat, with no project", async () => {
    storedRows(
      [...CHAT_COLUMNS, "project_name", "project_interview_chat_id", "user_id"],
      [[...CENTRAL_ROW.slice(0, -1), null, null, OWNER]],
    );

    expect(await getChat(OWNER, CHAT_ID)).toEqual({
      kind: "central",
      id: CHAT_ID,
      buddy: DEFAULT_BUDDY,
      name: undefined,
      renamedByHand: false,
      createdAt: new Date(CREATED_AT),
    });
  });

  test("listChats leaves a central chat out of a project's chats", async () => {
    storedChats([CENTRAL_ROW]);

    expect(await listChats(OWNER, projectIdFixture())).toEqual([]);
  });
});
