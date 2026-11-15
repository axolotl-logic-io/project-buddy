// The email that invites someone to a quest, holding its acceptance link,
// in Vellum's voice, as plain text and as simple HTML.
import type { EmailMessage } from "@/email/email-message.ts";
import { linkEmail } from "@/email/link-email.ts";
import { QUEST_INVITATION_EMAIL_COPY } from "@/ui/copy/quest-members.ts";

// The email to `to` inviting them to the quest named questName, from
// invitedBy, holding the acceptance link at url, sent once per
// idempotencyKey. It names the quest's owner when someone else invites,
// and says when an account was set aside for the address, since an
// invitation to an address with no account creates one.
export function questInvitationEmail({
  to,
  url,
  questName,
  invitedBy,
  owner,
  invitedAccount,
  idempotencyKey,
}: {
  readonly to: string;
  readonly url: string;
  readonly questName: string;
  readonly invitedBy: string;
  readonly owner: string | undefined;
  readonly invitedAccount: boolean;
  readonly idempotencyKey: string;
}): EmailMessage {
  const copy = QUEST_INVITATION_EMAIL_COPY;
  const { notExpected: setAside, notExpectedMember } = copy;
  let notExpected: string = notExpectedMember;
  if (invitedAccount) {
    notExpected = setAside;
  }
  return linkEmail({
    to,
    subject: copy.subject(questName),
    before: [copy.greeting, copy.intro({ invitedBy, owner, questName })],
    url,
    linkText: copy.linkText,
    after: [copy.expiry, copy.pending, notExpected],
    signOff: copy.signOff,
    signature: copy.signature,
    idempotencyKey,
  });
}
