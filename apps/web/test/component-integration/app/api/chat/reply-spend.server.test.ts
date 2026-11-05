// Whom a reply's model calls are charged to: the user who sent the message,
// read from the request's session, and never the project's owner or anyone
// else the chat or its project names. The sender is a member of the owner's
// team project, so the chat is open to both, while each user's spend stays
// their own.
import { expect, test } from "vitest";
import { getChat } from "@/chats/store.ts";
import { addProjectMember } from "@/projects/members-store.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { goldSpent } from "../../../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { constructReply } from "../../../test-database/chat-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

// What the mock construct's calls cost at the configured prices
// (src/quota/prices.ts), for one input and one output token each: the
// reply at Sonnet's and the chat's naming at Haiku's, rounded up.
const REPLY_MICRO_USD = 12;
const NAMING_MICRO_USD = 1;

test("a reply, and the chat's naming after it, is charged to the user who sent the message, not the project's owner", async () => {
  const [owner, sender] = await Promise.all([testUser(), testUser()]);
  const ownerData = testData(owner);
  const project = await ownerData.project();
  const chat = await ownerData.chat(project);
  expect(await addProjectMember(sender.id, project.id)).toBe(true);
  await signIn(sender);
  const [senderBefore, ownerBefore] = await Promise.all([
    goldSpent(sender),
    goldSpent(owner),
  ]);

  await constructReply(chat.id, "Bevel a donut");

  const [senderAfter, ownerAfter, named] = await Promise.all([
    goldSpent(sender),
    goldSpent(owner),
    getChat(owner.id, chat.id),
  ]);
  expect(named?.name).toBeDefined();
  expect(senderAfter - senderBefore).toBe(REPLY_MICRO_USD + NAMING_MICRO_USD);
  expect(ownerAfter).toBe(ownerBefore);
});
