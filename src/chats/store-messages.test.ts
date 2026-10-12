// @vitest-environment node
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { NewMessage } from "@/chats/chat-rows.ts";
import { listMessages, saveMessage, saveReply } from "@/chats/store.ts";
import { storedRows } from "@/chats/stored-rows.ts";
import { FAKE_DATABASE_URL, type FakeNeonHttp } from "@/db/fake-neon-http.ts";
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
// Keeping a message saved already, by its id, only when this chat has it.
const SAVED_ALREADY_IN_THIS_CHAT =
  /on conflict \("id"\) do update set "chat_id" = excluded\.chat_id where "messages"\."chat_id" = excluded\.chat_id returning "id"$/u;
const HI: NewMessage = {
  id: MESSAGE_ID,
  role: "user",
  parts: [{ type: "text", text: "Hi" }],
};

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
  test("saveMessage saves a message, or leaves one this chat saved already as it is", async () => {
    const neonHttp = storedRows(["id"], [[MESSAGE_ID]]);
    const log = spyOnErrorLog();

    expect(await saveMessage(OWNER, CHAT_ID, HI)).toBe("saved");

    const [insert] = neonHttp.queries;
    expect(insert?.query).toMatch(SAVED_ALREADY_IN_THIS_CHAT);
    expect(log).not.toHaveBeenCalled();
  });

  test("saveMessage saves nothing when another chat's message has the id", async () => {
    storedRows(["id"], []);

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
