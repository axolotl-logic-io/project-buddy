import type { SessionUser } from "@/auth/session-token.ts";
import type { QuestId } from "@/ids.ts";
import { acceptInvitationLink } from "@/quests/membership-store.ts";
import { ensureLife } from "@/quests/store.ts";
import { readSignInLinkUser } from "./sign-in-links.ts";
import { confirmSignUp, readSignUpEmail } from "./sign-up-links.ts";
import { checkUserName } from "./user-name.ts";
import { completeSignUp, type SignUpDetails } from "./users-store.ts";

type LinkAuthentication =
  | { readonly kind: "invalid" | "needs-name" }
  | {
      readonly kind: "authenticated";
      readonly user: SessionUser;
      readonly questId?: QuestId;
    };

// Who holds an unexpired emailed link. A quest invitation also opens its
// quest, and sign-up completes only with a valid name. A time zone Postgres
// doesn't know saves as UTC.
async function authenticateLink(
  token: string,
  details: SignUpDetails,
  now: Date,
): Promise<LinkAuthentication> {
  const invitation = await acceptInvitationLink(token, now, details);
  if (invitation.kind === "needs-name") {
    return { kind: "needs-name" };
  }
  if (invitation.kind === "accepted") {
    return {
      kind: "authenticated",
      user: invitation.user,
      questId: invitation.questId,
    };
  }
  const linked = await readSignInLinkUser(token, now);
  if (linked !== undefined) {
    if (linked.needsName && !(await completeSignUp(linked.id, details))) {
      return { kind: "needs-name" };
    }
    return { kind: "authenticated", user: linked };
  }
  if ((await readSignUpEmail(token, now)) === undefined) {
    return { kind: "invalid" };
  }
  if (checkUserName(details.name).kind !== "valid") {
    return { kind: "needs-name" };
  }
  const signedUp = await confirmSignUp(token, now, details);
  if (signedUp === undefined) {
    return { kind: "invalid" };
  }
  return { kind: "authenticated", user: signedUp };
}

// Authenticates the holder of an unexpired emailed link, as
// authenticateLink, and makes their Life unless they have one, so every
// signed-in user has a Life before any page reads it.
async function authenticateEmailedLink(
  token: string,
  details: SignUpDetails,
  now: Date,
): Promise<LinkAuthentication> {
  const authentication = await authenticateLink(token, details, now);
  if (authentication.kind === "authenticated") {
    await ensureLife(authentication.user.id);
  }
  return authentication;
}

export { authenticateEmailedLink };
