// @vitest-environment node
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type NewMessage, REPLY_CLAIM_SECONDS } from "@/chats/chat-rows.ts";
import {
  claimReply,
  listMessages,
  releaseReply,
  saveMessage,
  saveReply,
} from "@/chats/store.ts";
import { storedRows } from "@/chats/stored-rows.ts";
import {
  FAKE_DATABASE_URL,
  type FakeNeonHttp,
  fakeNeonHttp,
} from "@/db/fake-neon-http.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";
import {
  chatIdFixture,
  messageIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";

const OWNER = userIdFixture();
const CHAT_ID = chatIdFixture();
const MESSAGE_ID = messageIdFixture("m1");
const SECRET_TEXT = "my private question";
// The created_at a reply is inserted with: the answered message's, one
// microsecond later, or the time of the insert if that message is missing.
const ANSWERED_MESSAGE_TIME =
  /coalesce\(\(\(select "created_at" \+ interval '1 microsecond' from "messages" where \("messages"\."chat_id" = \$\d+ and "messages"\."id" = \$\d+\)\)\), now\(\)\)/u;
// Keeping a message saved already, by its id, only when this chat has it,
// and returning whether the row was inserted now: a row the conflict updated
// has a nonzero xmax.
const SAVED_ALREADY_IN_THIS_CHAT =
  /on conflict \("id"\) do update set "chat_id" = excluded\.chat_id where "messages"\."chat_id" = excluded\.chat_id returning \(xmax = 0\)$/u;
// Claiming only a message with no claim, or one older than a reply can run.
const UNCLAIMED_OR_LAPSED =
  /set "reply_started_at" = now\(\) where .*\("messages"\."reply_started_at" is null or "messages"\."reply_started_at" < now\(\) - make_interval\(secs => \$\d+\)\).* returning "id"$/u;
// Clearing a message's claim.
const CLAIM_CLEARED = /set "reply_started_at" = \$1 where/u;
const HI: NewMessage = {
  id: MESSAGE_ID,
  role: "user",
  parts: [{ type: "text", text: "Hi" }],
};

// The rows saveMessage's insert returns: none, or one saying whether it was
// inserted now, as the text Postgres sends for a boolean ("t" or "f").
function insertReturns(
  rows: readonly (readonly ("t" | "f")[])[],
): FakeNeonHttp {
  const neonHttp = fakeNeonHttp({
    kind: "rows",
    columns: [{ name: "?column?", type: "bool" }],
    rows,
  });
  vi.stubGlobal("fetch", neonHttp.fetch);
  return neonHttp;
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

describe("chat store listMessages", () => {
  test("listMessages returns the stored messages as UI messages", async () => {
    storedMessages([
      ["m1", "user", JSON.stringify([{ type: "text", text: "Hi" }])],
      ["m2", "assistant", JSON.stringify([{ type: "text", text: "Hello" }])],
    ]);

    expect(await listMessages(OWNER, CHAT_ID)).toEqual([
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

    expect(await listMessages(OWNER, CHAT_ID)).toEqual([
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

describe("chat store saving messages", () => {
  test("saveMessage saves a new message and says it inserted it", async () => {
    const neonHttp = insertReturns([["t"]]);
    const log = spyOnErrorLog();

    expect(await saveMessage(OWNER, CHAT_ID, HI)).toBe("inserted");

    const [insert] = neonHttp.queries;
    expect(insert?.query).toMatch(SAVED_ALREADY_IN_THIS_CHAT);
    expect(insert?.query).toContain('now() as "reply_started_at"');
    expect(log).not.toHaveBeenCalled();
  });

  test("saveMessage leaves a message this chat saved already as it is, and says so", async () => {
    insertReturns([["f"]]);

    expect(await saveMessage(OWNER, CHAT_ID, HI)).toBe("already-saved");
  });

  test("saveMessage saves nothing when another chat's message has the id", async () => {
    insertReturns([]);

    expect(await saveMessage(OWNER, CHAT_ID, HI)).toBe("id-taken");
  });

  test("saveReply dates the reply just after the message it answers, on the database's clock", async () => {
    const neonHttp = storedRows([], []);
    const reply: UIMessage = {
      id: "r1",
      role: "assistant",
      parts: [{ type: "text", text: "Hello" }],
    };

    await saveReply(OWNER, CHAT_ID, reply, MESSAGE_ID);

    const [insert] = neonHttp.queries;
    expect(insert?.query).toMatch(ANSWERED_MESSAGE_TIME);
    expect(insert?.params).toEqual(
      expect.arrayContaining(["r1", CHAT_ID, "assistant", MESSAGE_ID, OWNER]),
    );
  });
});

describe("chat store claims on replies", () => {
  test("claimReply claims an unclaimed or lapsed message and says so", async () => {
    const neonHttp = storedRows(["id"], [[MESSAGE_ID]]);

    expect(await claimReply(OWNER, CHAT_ID, MESSAGE_ID)).toBe(true);

    const [update] = neonHttp.queries;
    expect(update?.query).toMatch(UNCLAIMED_OR_LAPSED);
    expect(update?.params).toEqual(
      expect.arrayContaining([
        MESSAGE_ID,
        CHAT_ID,
        OWNER,
        String(REPLY_CLAIM_SECONDS),
      ]),
    );
  });

  test("claimReply says when another request's claim holds", async () => {
    storedRows(["id"], []);

    expect(await claimReply(OWNER, CHAT_ID, MESSAGE_ID)).toBe(false);
  });

  test("releaseReply clears the owner's message's claim", async () => {
    const neonHttp = storedRows([], []);

    await releaseReply(OWNER, CHAT_ID, MESSAGE_ID);

    const [update] = neonHttp.queries;
    expect(update?.query).toMatch(CLAIM_CLEARED);
    expect(update?.params).toEqual(
      expect.arrayContaining([null, MESSAGE_ID, CHAT_ID, OWNER]),
    );
  });
});
