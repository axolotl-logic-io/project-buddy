// @vitest-environment node
// The real Neon driver against a fake HTTP response: no database is used.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { DEFAULT_BUDDY_ID, getBuddy, snapshotOf } from "@/buddies/index.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { holdsPredicate } from "../accounts/owner-scope-test-kit.ts";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import {
  chatIdFixture,
  projectIdFixture,
  userIdFixture,
} from "../id-fixtures.ts";
import { CHAT_COLUMNS, storedRows } from "./stored-rows.ts";

const OWNER = userIdFixture();
const PROJECT_ID = projectIdFixture();
const PROJECT_CHAT_ID = chatIdFixture();
const CENTRAL_CHAT_ID = chatIdFixture();
const CREATED_AT = "2026-01-02 00:00:00+00";
const FOUND_CHAT_COLUMNS: readonly string[] = [
  ...CHAT_COLUMNS,
  "user_id",
  "project_name",
  "project_interview_chat_id",
];

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("converts project and standalone rows to the existing found-chat union", async () => {
  storedRows(FOUND_CHAT_COLUMNS, [
    [
      PROJECT_CHAT_ID,
      PROJECT_ID,
      "hippy",
      null,
      null,
      "Donut details",
      "t",
      CREATED_AT,
      null,
      "Donut",
      PROJECT_CHAT_ID,
    ],
    [
      CENTRAL_CHAT_ID,
      null,
      "mr-tee",
      null,
      null,
      null,
      "f",
      CREATED_AT,
      OWNER,
      null,
      null,
    ],
  ]);

  expect(await listAllChats(OWNER)).toEqual([
    {
      kind: "project",
      id: PROJECT_CHAT_ID,
      projectId: PROJECT_ID,
      projectName: "Donut",
      isInterviewChat: true,
      name: "Donut details",
      renamedByHand: true,
      buddy: snapshotOf(getBuddy(DEFAULT_BUDDY_ID)),
      createdAt: new Date(CREATED_AT),
    },
    {
      kind: "central",
      id: CENTRAL_CHAT_ID,
      name: undefined,
      renamedByHand: false,
      buddy: snapshotOf(getBuddy("mr-tee")),
      createdAt: new Date(CREATED_AT),
    },
  ]);
});

test.each([
  {
    projectId: PROJECT_ID,
    userId: null,
    projectName: "Donut",
    kind: "project",
  },
  { projectId: null, userId: OWNER, projectName: null, kind: "central" },
])(
  "keeps the stored custom buddy snapshot for a $kind chat",
  async ({ projectId, userId, projectName, kind }) => {
    const buddy = {
      name: "Stored custom buddy",
      parts: { ...getBuddy("hippy").parts, voice: "A stored custom voice" },
    };
    storedRows(FOUND_CHAT_COLUMNS, [
      [
        PROJECT_CHAT_ID,
        projectId,
        "hippy",
        buddy.name,
        JSON.stringify(buddy.parts),
        "Renamed conversation",
        "t",
        CREATED_AT,
        userId,
        projectName,
        null,
      ],
    ]);

    const found = await listAllChats(OWNER);

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      kind,
      buddy,
      name: "Renamed conversation",
      renamedByHand: true,
    });
    expect(found[0]).not.toHaveProperty("userId");
    expect(found[0]).not.toHaveProperty("projectInterviewChatId");
  },
);

test.each([
  { projectId: undefined, params: [OWNER, OWNER] },
  { projectId: PROJECT_ID, params: [OWNER, OWNER, PROJECT_ID] },
])(
  "scopes and orders by descending creation time and id, with project filter $projectId",
  async ({ projectId, params }) => {
    const neonHttp = storedRows(FOUND_CHAT_COLUMNS, []);

    expect(await listAllChats(OWNER, projectId)).toEqual([]);

    expect(neonHttp.queries).toHaveLength(1);
    const [query] = neonHttp.queries;
    expect(holdsPredicate(query, chatOwnedBy(OWNER))).toBe(true);
    expect(query?.query).toContain(
      'order by "chats"."created_at" desc, "chats"."id" desc',
    );
    expect(query?.params).toEqual(params);
  },
);

test("adds the supplied project id as a chat filter", async () => {
  const neonHttp = storedRows(FOUND_CHAT_COLUMNS, []);

  await listAllChats(OWNER, PROJECT_ID);

  expect(neonHttp.queries[0]?.query).toContain('"chats"."project_id" = $3');
  expect(neonHttp.queries[0]?.params).toEqual([OWNER, OWNER, PROJECT_ID]);
});

test("classifies and logs an unreachable database through app errors", async () => {
  vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
  const log = spyOnErrorLog();

  const error = await listAllChats(OWNER).catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(AppError);
  expect(error).toHaveProperty("errorCase", "database-unreachable");
  expect(log).toHaveBeenCalledWith(
    "[app-error] database-unreachable in listAllChats",
    expect.any(String),
  );
});
