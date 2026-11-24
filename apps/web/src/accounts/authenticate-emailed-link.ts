import type { SessionUser } from "@/auth/session-token.ts";
import type { QuestId } from "@/ids.ts";
import { acceptInvitationLink } from "@/quests/membership-store.ts";
import { readSignInLinkUser } from "./sign-in-links.ts";
import { confirmSignUp, readSignUpEmail } from "./sign-up-links.ts";
import { checkUserName } from "./user-name.ts";
import { completeSignUp } from "./users-store.ts";

type LinkAuthentication =
  | { readonly kind: "invalid" | "needs-name" }
  | {
      readonly kind: "authenticated";
      readonly user: SessionUser;
      readonly questId?: QuestId;
    };

// Authenticates the holder of an unexpired emailed link. A quest invitation
// also opens its quest, and sign-up completes only with a valid name.
async function authenticateEmailedLink(
  token: string,
  name: string,
  now: Date,
): Promise<LinkAuthentication> {
  const invitation = await acceptInvitationLink(token, now, name);
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
    if (linked.needsName && !(await completeSignUp(linked.id, name))) {
      return { kind: "needs-name" };
    }
    return { kind: "authenticated", user: linked };
  }
  if ((await readSignUpEmail(token, now)) === undefined) {
    return { kind: "invalid" };
  }
  if (checkUserName(name).kind !== "valid") {
    return { kind: "needs-name" };
  }
  const signedUp = await confirmSignUp(token, now, name);
  if (signedUp === undefined) {
    return { kind: "invalid" };
  }
  return { kind: "authenticated", user: signedUp };
}

export { authenticateEmailedLink };
