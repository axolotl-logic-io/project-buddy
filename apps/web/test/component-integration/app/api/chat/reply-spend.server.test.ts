// Whom a reply's model calls are charged to: the user who sent the message,
// read from the request's session, and never anyone the chat or its project
// names. Members who share a project (#626) each pay for their own
// messages; until then the sender is the chat's owner, and the other user
// stands for everyone who didn't send it.
import { expect, test } from "vitest";
import { spentThisMonth } from "../../../../support/test-database/spend-test-kit.ts";
import { buddyReply } from "../../../test-database/chat-test-kit.ts";
import { twoUsers } from "../../../test-database/two-users-test-kit.ts";

test("a reply, and the chat's naming after it, is charged to the user who sent the message", async () => {
  const { her, herData, other } = await twoUsers();
  const chat = await herData.chat(await herData.project());
  const [herBefore, otherBefore] = await Promise.all([
    spentThisMonth(her),
    spentThisMonth(other),
  ]);

  await buddyReply(chat.id, "Bevel a donut");

  const [herAfter, otherAfter] = await Promise.all([
    spentThisMonth(her),
    spentThisMonth(other),
  ]);
  expect(herAfter).toBeGreaterThan(herBefore);
  expect(otherAfter).toBe(otherBefore);
});
