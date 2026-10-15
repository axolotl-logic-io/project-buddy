// @vitest-environment node
// A chat's buddy is the snapshot saved with it: editing the buddy later
// changes no chat, and a chat saved before snapshots reads as its built-in
// buddy.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { updateBuddy } from "@/buddies/buddy-store.ts";
import {
  type BuddyParts,
  type BuddySnapshot,
  DEFAULT_BUDDY_ID,
  getBuddy,
  snapshotOf,
} from "@/buddies/index.ts";
import { storedBuddies } from "@/buddies/stored-buddies.ts";
import type { NewMessage } from "@/chats/chat-rows.ts";
import { createChatWithOpening } from "@/chats/new-chat-store.ts";
import { getChat } from "@/chats/store.ts";
import { CHAT_COLUMNS, storedRows } from "@/chats/stored-rows.ts";
import { FAKE_DATABASE_URL, type FakeNeonHttp } from "@/db/fake-neon-http.ts";
import {
  chatIdFixture,
  messageIdFixture,
  projectIdFixture,
  userBuddyIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";

const OWNER = userIdFixture();
const CHAT_ID = chatIdFixture();
const PROJECT_ID = projectIdFixture();
const BUDDY_ID = userBuddyIdFixture();
const CREATED_AT = "2026-10-11 09:00:00+00";
const OPENING: NewMessage = {
  id: messageIdFixture("opening"),
  role: "assistant",
  parts: [{ type: "text", text: "What are we making?" }],
};
// The user's own buddy as the chat started with it, and as edited later.
const OWN_BUDDY: BuddySnapshot = {
  name: "Professor Bevel",
  parts: { ...getBuddy("mr-tee").parts, voice: "## Voice\n\nPrecise." },
};
const EDITED_PARTS: BuddyParts = {
  ...OWN_BUDDY.parts,
  voice: "## Voice\n\nLoud.",
};
// "personas" is the SQL table name from before the buddy rename (#116);
// renaming it would need a migration.
const READS_BUDDIES = /"personas"/u;
const UPDATES_BUDDY = /^update "personas" set /u;

// Chats joined with their project's name, as getChat reads them: one with
// these buddy columns.
function storedChat(
  buddyId: string,
  buddyName: string | null,
  buddyParts: string | null,
): FakeNeonHttp {
  return storedRows(
    [...CHAT_COLUMNS, "project_name"],
    [
      [
        CHAT_ID,
        PROJECT_ID,
        buddyId,
        buddyName,
        buddyParts,
        null,
        "f",
        CREATED_AT,
        "Fox",
      ],
    ],
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

describe("a chat's buddy snapshot", () => {
  test("a chat keeps its snapshot after the user buddy it came from is edited", async () => {
    const started = storedChat(DEFAULT_BUDDY_ID, null, null);
    await createChatWithOpening(
      OWNER,
      {
        projectId: PROJECT_ID,
        buddy: { id: DEFAULT_BUDDY_ID, ...OWN_BUDDY },
      },
      OPENING,
    );
    expect(started.batches[0]?.[0]?.params).toEqual(
      expect.arrayContaining([OWN_BUDDY.name, JSON.stringify(OWN_BUDDY.parts)]),
    );

    const edit = storedBuddies([]);
    await updateBuddy(OWNER, BUDDY_ID, { parts: EDITED_PARTS });
    expect(edit.queries.map(({ query }) => query)).toEqual([
      expect.stringMatching(UPDATES_BUDDY),
    ]);

    const read = storedChat(
      DEFAULT_BUDDY_ID,
      OWN_BUDDY.name,
      JSON.stringify(OWN_BUDDY.parts),
    );
    expect(await getChat(OWNER, CHAT_ID)).toHaveProperty("buddy", OWN_BUDDY);
    expect(read.queries[0]?.query).not.toMatch(READS_BUDDIES);
  });
});

describe("a chat's buddy read", () => {
  test("a chat saved before snapshots reads as its built-in buddy", async () => {
    storedChat("mr-tee", null, null);

    expect(await getChat(OWNER, CHAT_ID)).toHaveProperty(
      "buddy",
      snapshotOf(getBuddy("mr-tee")),
    );
  });

  test("a chat saved before snapshots, in a retired buddy, reads as the default buddy", async () => {
    storedChat("retired-buddy", null, null);

    expect(await getChat(OWNER, CHAT_ID)).toHaveProperty(
      "buddy",
      snapshotOf(getBuddy(DEFAULT_BUDDY_ID)),
    );
  });

  test("a snapshot missing a part reads as the chat's built-in buddy", async () => {
    const { voice: _voice, ...withoutVoice } = OWN_BUDDY.parts;
    storedChat("mr-tee", OWN_BUDDY.name, JSON.stringify(withoutVoice));

    expect(await getChat(OWNER, CHAT_ID)).toHaveProperty(
      "buddy",
      snapshotOf(getBuddy("mr-tee")),
    );
  });
});
