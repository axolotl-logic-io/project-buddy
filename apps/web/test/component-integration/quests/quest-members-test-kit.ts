// Multi-user quests in a server test, made through the membership store as
// the Members tab and Pending do. The test file mocks the email service and
// passes the mock in, as sign-in-link-test-kit.ts's tests do:
//   const sent = vi.hoisted(() => ({ sendEmail: vi.fn<SendEmail>() }));
//   vi.mock("@/email/send-email.ts", () => sent);

import type { Mock } from "vitest";
import { findUserByEmail, type User } from "@/accounts/users-store.ts";
import type { QuestId } from "@/ids.ts";
import {
  answerInvitation,
  type InviteResult,
  inviteToQuest,
  removeFromQuest,
} from "@/quests/membership-store.ts";
import type { SendEmail } from "../test-database/sign-in-link-test-kit.ts";

const SITE = "http://localhost:3494";
const ACCEPTANCE_LINK = /https?:\/\/\S+\/login\/link\?token=[\w-]+/u;

// Invites the address to the quest as inviter, now.
function invite(
  inviter: User,
  questId: QuestId,
  email: string,
): Promise<InviteResult> {
  return inviteToQuest(
    inviter.id,
    { questId, email, origin: SITE },
    new Date(),
  );
}

// The token of the acceptance link last emailed to the address.
function emailedInvitationToken(
  sendEmail: Mock<SendEmail>,
  email: string,
): string {
  const message = sendEmail.mock.calls
    .map(([sent]) => sent)
    .findLast((sent) => sent.to === email);
  if (message === undefined) {
    throw new Error(`No invitation was emailed to ${email}`);
  }
  const [url = ""] = ACCEPTANCE_LINK.exec(message.text) ?? [];
  return new URL(url).searchParams.get("token") ?? "";
}

// The account the address has, which inviting it made if it had none.
async function accountOf(email: string): Promise<User> {
  const user = await findUserByEmail(email);
  if (user === undefined) {
    throw new Error(`${email} has no account`);
  }
  return user;
}

// Makes user an accepted member of the owner's quest, as inviting them and
// their accepting from Pending does.
async function addMember(
  owner: User,
  questId: QuestId,
  user: User,
): Promise<void> {
  const invited = await invite(owner, questId, user.email);
  if (invited.kind !== "invited") {
    throw new Error(`Inviting a member answered ${invited.kind}`);
  }
  if (!(await answerInvitation(user.id, questId, true))) {
    throw new Error("The member's invitation wasn't accepted");
  }
}

// Leaves user with a pending invitation to the owner's quest.
async function addInvitee(
  owner: User,
  questId: QuestId,
  user: User,
): Promise<void> {
  const invited = await invite(owner, questId, user.email);
  if (invited.kind !== "invited") {
    throw new Error(`Inviting answered ${invited.kind}`);
  }
}

// Makes user a member of the owner's quest, then removes them, as the
// owner's Remove does: a former member.
async function addRemovedMember(
  owner: User,
  questId: QuestId,
  user: User,
): Promise<void> {
  await addMember(owner, questId, user);
  if (!(await removeFromQuest(owner.id, { questId, person: user.id }))) {
    throw new Error("The member wasn't removed");
  }
}

export {
  accountOf,
  addInvitee,
  addMember,
  addRemovedMember,
  emailedInvitationToken,
  invite,
};
