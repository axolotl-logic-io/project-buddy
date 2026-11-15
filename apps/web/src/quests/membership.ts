// What the membership store, its Server Actions, the copy and the browser
// share about quest membership and invitations. The browser imports this
// module, so it imports nothing server-only.

import type { QuestId, UserId } from "@/ids.ts";

// How long an invitation's emailed acceptance link works.
const INVITATION_LINK_LIFETIME_DAYS = 7;
// How many invitations one person may send in an hour, across every quest.
const INVITATIONS_PER_HOUR = 20;

// The invite form's state: as first shown; after an invitation, with what
// came of it, which may be a problem the inviter can act on; or when the
// address isn't one. When no invitation went out, email is the address
// that was submitted, so the form can keep it.
type InviteState =
  | { readonly kind: "idle" }
  | { readonly kind: "done"; readonly message: string }
  | {
      readonly kind: "problem" | "invalid" | "refused";
      readonly message: string;
      readonly email: string;
    };

// How a quest is shared, as the user it is open to sees it: their own,
// with no members; their own, with members; or someone else's, which they
// are a member of, named by its owner's display name.
type QuestSharing =
  | { readonly kind: "personal" | "shared" }
  | { readonly kind: "joined"; readonly owner: string };

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
  QuestSharing,
  RemoveFromQuest,
};
export { INVITATION_LINK_LIFETIME_DAYS, INVITATIONS_PER_HOUR };
