// "use_case_leave_during_reply" in use-cases/: a message is answered, and
// charged, once. What the chat store promises for it, on the test
// database's own Postgres: saving one message twice at once inserts it
// exactly once, which is what lets two simultaneous first sends refuse the
// one that didn't save it (conversation-to-answer.test.ts proves that
// refusal), and of two claims at once on its reply, at most one succeeds.
// What /api/chat answers is route-resend.server.test.ts's.
import { eq, sql } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { type Chat, REPLY_CLAIM_SECONDS } from "@/chats/chat-rows.ts";
import {
  claimReply,
  listMessages,
  releaseReply,
  saveMessage,
} from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { messages } from "@/db/tables/projects-and-chats.ts";
import type { MessageId } from "@/ids.ts";
import { question, userWithChat } from "../test-database/chat-test-kit.ts";
import { testData } from "../test-database/data-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const QUESTION = "How do I bevel an edge?";

// Claims the reply to the owner's message twice at once, and says which
// claims succeeded, failures first.
async function claimTwiceAtOnce(
  user: User,
  chat: Chat,
  id: MessageId,
): Promise<boolean[]> {
  const claims = await Promise.all([
    claimReply(user.id, chat.id, id),
    claimReply(user.id, chat.id, id),
  ]);
  return claims.toSorted();
}

describe("use_case_leave_during_reply", () => {
  test("saving one message twice at once inserts it exactly once", async () => {
    const user = await testUser();
    const data = testData(user);
    const project = await data.project();
    const chat = await data.chat(project);
    const otherChat = await data.chat(project);
    const message = question(QUESTION);

    const both = await Promise.all([
      saveMessage(user.id, chat.id, message),
      saveMessage(user.id, chat.id, message),
    ]);

    expect(both.toSorted()).toEqual(["already-saved", "inserted"]);
    expect(await saveMessage(user.id, chat.id, message)).toBe("already-saved");
    expect(await saveMessage(user.id, otherChat.id, message)).toBe("id-taken");
    const fresh = question(QUESTION);
    expect(await saveMessage(user.id, chat.id, fresh)).toBe("inserted");
    expect((await listMessages(user.id, chat.id)).map(({ id }) => id)).toEqual([
      message.id,
      fresh.id,
    ]);
  });

  test("of two claims at once on a message's reply, exactly one succeeds, and only once the last is released or has lapsed", async () => {
    const { user, chat } = await userWithChat();
    const { id } = question(QUESTION);

    expect(await saveMessage(user.id, chat.id, question(QUESTION, id))).toBe(
      "inserted",
    );
    expect(await claimTwiceAtOnce(user, chat, id)).toEqual([false, false]);

    await releaseReply(user.id, chat.id, id);
    expect(await claimTwiceAtOnce(user, chat, id)).toEqual([false, true]);

    await getDb()
      .update(messages)
      .set({
        replyStartedAt: sql`now() - make_interval(secs => ${REPLY_CLAIM_SECONDS + 1})`,
      })
      .where(eq(messages.id, id));
    expect(await claimTwiceAtOnce(user, chat, id)).toEqual([false, true]);
  });
});
