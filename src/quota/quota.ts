// The monthly Claude quota, and the one gate to Claude: a model
// (src/tutor/model.ts) is made only from a QuotaGrant, and checkQuota is the
// only way to get one, so holding a grant means owner's quota was checked and
// not used up. Every new model call a user asks for starts with the check: a
// message (src/tutor/conversation-to-answer.ts), a new chat and a new project
// (src/chats/start-chat.ts), and any caller added later, since without a grant
// it cannot make a model. Once the month's spend reaches the quota, those are
// refused until the month ends. A call already under way finishes, with the
// answer-now call and the chat's naming it brings, which reuse its grant, so
// the reply that crosses the quota is whole and the spend can pass it.
import type { UserId } from "@/ids.ts";
import { grantQuota, type QuotaGrant } from "@/quota/quota-grant.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";

// Whether owner may start another model call, with the grant to start it, or
// until when they may not.
type QuotaCheck =
  | { readonly kind: "withinQuota"; readonly grant: QuotaGrant }
  | { readonly kind: "usedUp"; readonly resetsOn: Date };

// Checks owner's spend this month (UTC) against the quota. A storage failure
// rejects, so nothing is started unchecked.
async function checkQuota(owner: UserId): Promise<QuotaCheck> {
  const usage = await readMonthlyUsage(owner, new Date());
  if (usage.spentMicroUsd >= usage.limitMicroUsd) {
    return { kind: "usedUp", resetsOn: usage.resetsOn };
  }
  return { kind: "withinQuota", grant: grantQuota(owner) };
}

export type { QuotaGrant } from "@/quota/quota-grant.ts";
export type { QuotaCheck };
export { checkQuota };
