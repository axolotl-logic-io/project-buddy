// The monthly Claude quota, checked before every new model call a user asks
// for: a message (src/tutor/conversation-to-answer.ts), a new chat and a new
// project (src/chats/start-chat.ts). Once the month's spend reaches the
// quota, those are refused until the month ends. A call already under way
// finishes, with the answer-now call and the chat's naming it brings, so the
// reply that crosses the quota is whole and the spend can pass it.
import type { UserId } from "@/ids.ts";
import { readMonthlyUsage } from "@/quota/spend-store.ts";

// Whether owner may start another model call, or until when they may not.
type QuotaCheck =
  | { readonly kind: "withinQuota" }
  | { readonly kind: "usedUp"; readonly resetsOn: Date };

const WITHIN_QUOTA: QuotaCheck = { kind: "withinQuota" };

// Checks owner's spend this month (UTC) against the quota. A storage failure
// rejects, so nothing is started unchecked.
async function checkQuota(owner: UserId): Promise<QuotaCheck> {
  const usage = await readMonthlyUsage(owner, new Date());
  if (usage.spentMicroUsd >= usage.limitMicroUsd) {
    return { kind: "usedUp", resetsOn: usage.resetsOn };
  }
  return WITHIN_QUOTA;
}

export type { QuotaCheck };
export { checkQuota };
