// Whom a reply's model calls are charged to: the user who sent the message,
// read from the request's session, and never anyone else.
import { expect, test } from "vitest";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { constructReply } from "../../../test-database/chat-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

// What the mock construct's reply costs at Sonnet's configured prices
// (src/quota/prices.ts), for one input and one output token, rounded up. A
// reply makes no other model call.
const REPLY_MICRO_USD = 12;

test("a reply is charged to the user who sent the message, and no one else", async () => {
  const [sender, other] = await Promise.all([testUser(), testUser()]);
  const data = testData(sender);
  const quest = await data.quest();
  const chat = await data.chat(quest);
  await signIn(sender);
  const [senderBefore, otherBefore] = await Promise.all([
    goldSpent(sender),
    goldSpent(other),
  ]);

  await constructReply(chat.id, "Bevel a donut");

  const [senderAfter, otherAfter] = await Promise.all([
    goldSpent(sender),
    goldSpent(other),
  ]);
  expect(senderAfter - senderBefore).toBe(REPLY_MICRO_USD);
  expect(otherAfter).toBe(otherBefore);
});
