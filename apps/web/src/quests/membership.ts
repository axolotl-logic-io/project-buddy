// What the membership store, its Server Actions, the copy and the browser
// share about quest membership and invitations. The browser imports this
// module, so it imports nothing server-only.

import type { QuestId } from "@/ids.ts";

// How long an invitation's emailed acceptance link works.
const INVITATION_LINK_LIFETIME_DAYS = 7;
// How many invitations one person may send in an hour, across every quest.
const INVITATIONS_PER_HOUR = 20;

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

export type { AnswerInvitation, MembershipResult, QuestSharing };
export { INVITATION_LINK_LIFETIME_DAYS, INVITATIONS_PER_HOUR };
