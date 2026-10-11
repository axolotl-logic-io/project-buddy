// @vitest-environment node
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { chatIdFixture, messageIdFixture } from "@/chats/chat-fixtures.ts";
import { listMessages, saveMessage, saveReply } from "@/chats/store.ts";
import { storedRows } from "@/chats/stored-rows.ts";
import { FAKE_DATABASE_URL, type FakeNeonHttp } from "@/db/fake-neon-http.ts";
import { spyOnErrorLog } from "@/errors/error-log-spy.ts";

const CHAT_ID = chatIdFixture();
const MESSAGE_ID = messageIdFixture("m1");
const SECRET_TEXT = "my private question";
// The created_at a reply is inserted with: the answered message's, one
// microsecond later, or the time of the insert if that message is missing.
const ANSWERED_MESSAGE_TIME =
  /coalesce\(\(\(select "created_at" \+ interval '1 microsecond' from "messages" where \("messages"\."chat_id" = \$\d+ and "messages"\."id" = \$\d+\)\)\), now\(\)\)/u;
// Ignoring a message saved already, by its id.
const SAVED_ALREADY = /on conflict \("id"\) do nothing$/u;

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

describe("chat store saving messages", () => {
  test("saveMessage leaves a message saved already as it is, so a resend succeeds", async () => {
    const neonHttp = storedRows([], []);
    const log = spyOnErrorLog();

    await saveMessage(CHAT_ID, {
      id: MESSAGE_ID,
      role: "user",
      parts: [{ type: "text", text: "Hi" }],
    });

    const [insert] = neonHttp.queries;
    expect(insert?.query).toMatch(SAVED_ALREADY);
    expect(log).not.toHaveBeenCalled();
  });

  test("saveReply dates the reply just after the message it answers, on the database's clock", async () => {
    const neonHttp = storedRows([], []);
    const reply: UIMessage = {
      id: "r1",
      role: "assistant",
      parts: [{ type: "text", text: "Hello" }],
    };

    await saveReply(CHAT_ID, reply, MESSAGE_ID);

    const [insert] = neonHttp.queries;
    expect(insert?.query).toMatch(ANSWERED_MESSAGE_TIME);
    expect(insert?.params).toEqual(
      expect.arrayContaining(["r1", CHAT_ID, "assistant", MESSAGE_ID]),
    );
  });
});
