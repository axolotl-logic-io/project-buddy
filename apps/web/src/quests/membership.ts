// What the membership store, its Server Actions, the copy and the browser
// share about quest membership and invitations. The browser imports this
// module, so it imports nothing server-only.

import type { QuestId, UserId } from "@/ids.ts";

// How long an invitation's emailed acceptance link works.
const INVITATION_LINK_LIFETIME_DAYS = 7;

// The invite form's state: as first shown; after an invitation, with what
// came of it, which may be a problem the inviter can act on; or when the
// address isn't one.
type InviteState =
  | { readonly kind: "idle" }
  | { readonly kind: "done" | "problem"; readonly message: string }
  | { readonly kind: "invalid"; readonly message: string };

// What a removal or an answer to an invitation did: done, or nothing,
// because whoever or whatever it named was already gone.
interface MembershipResult {
  readonly kind: "done" | "failed";
}

// Answers the signed-in user's invitation to one quest.
type AnswerInvitation = (request: {
  readonly questId: QuestId;
  readonly accept: boolean;
}) => Promise<MembershipResult>;

// Takes someone out of a quest: a member, the user themselves, or a
// pending invitee.
type RemoveFromQuest = (request: {
  readonly questId: QuestId;
  readonly person: UserId;
}) => Promise<MembershipResult>;

export type {
  AnswerInvitation,
  InviteState,
  MembershipResult,
  RemoveFromQuest,
};
export { INVITATION_LINK_LIFETIME_DAYS };
