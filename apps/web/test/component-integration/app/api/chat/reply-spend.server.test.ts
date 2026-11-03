// Whom a reply's model calls are charged to: the user who sent the message,
// read from the request's session, and never the project's owner or anyone
// else the chat or its project names. Members can't share a project until
// #626, so a stand-in gives the sender the owner's access: the access
// predicates in owner-scope.ts read the sender as the project's owner. The
// spend and quota predicates are left as they are, so each user's spend is
// still their own. #626 replaces the stand-in with addProjectMember.
import { expect, onTestFinished, test, vi } from "vitest";
import type { ProjectId, UserId } from "@/ids.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { spentThisMonth } from "../../../../support/test-database/spend-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";

// What the mock buddy's calls cost at the configured prices
// (src/quota/prices.ts), for one input and one output token each: the
// reply at Sonnet's and the chat's naming at Haiku's, rounded up.
const REPLY_MICRO_USD = 12;
const NAMING_MICRO_USD = 1;

// Each user given another's access, mapped to the user whose access they get.
const sharedAccess = vi.hoisted(() => new Map<UserId, UserId>());

vi.mock("@/accounts/owner-scope.ts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/accounts/owner-scope.ts")>();
  function accessOf(user: UserId): UserId {
    return sharedAccess.get(user) ?? user;
  }
  return {
    ...actual,
    activitySessionOwnedBy: (user: UserId) =>
      actual.activitySessionOwnedBy(accessOf(user)),
    chatOwnedBy: (user: UserId) => actual.chatOwnedBy(accessOf(user)),
    imageOwnedBy: (user: UserId) => actual.imageOwnedBy(accessOf(user)),
    memoryVersionOwnedBy: (user: UserId) =>
      actual.memoryVersionOwnedBy(accessOf(user)),
    messageOwnedBy: (user: UserId) => actual.messageOwnedBy(accessOf(user)),
    milestoneOwnedBy: (user: UserId) => actual.milestoneOwnedBy(accessOf(user)),
    ownsProject: (user: UserId, projectId: ProjectId) =>
      actual.ownsProject(accessOf(user), projectId),
    projectOwnedBy: (user: UserId) => actual.projectOwnedBy(accessOf(user)),
  };
});

test("a reply, and the chat's naming after it, is charged to the user who sent the message, not the project's owner", async () => {
  const [owner, sender] = await Promise.all([testUser(), testUser()]);
  const ownerData = testData(owner);
  // The setup file loaded the stores with the real predicates; the reply's
  // modules are loaded again, after the stand-in.
  vi.resetModules();
  const [{ buddyReply }, { signIn }, { getChat }] = await Promise.all([
    import("../../../test-database/chat-test-kit.ts"),
    import("../../../test-database/session-test-kit.ts"),
    import("@/chats/store.ts"),
  ]);
  const chat = await ownerData.chat(await ownerData.project());
  sharedAccess.set(sender.id, owner.id);
  onTestFinished(() => {
    sharedAccess.clear();
  });
  await signIn(sender);
  const [senderBefore, ownerBefore] = await Promise.all([
    spentThisMonth(sender),
    spentThisMonth(owner),
  ]);

  await buddyReply(chat.id, "Bevel a donut");

  const [senderAfter, ownerAfter, named] = await Promise.all([
    spentThisMonth(sender),
    spentThisMonth(owner),
    getChat(owner.id, chat.id),
  ]);
  expect(named?.name).toBeDefined();
  expect(senderAfter - senderBefore).toBe(REPLY_MICRO_USD + NAMING_MICRO_USD);
  expect(ownerAfter).toBe(ownerBefore);
});
