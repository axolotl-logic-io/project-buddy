// The one gate to Claude: a model (src/replies/model.ts) is made only from
// a QuotaGrant, and checkGold is the only way to get one, so holding a grant
// means owner's gold was checked and not spent. Every new model call a user
// asks for starts with the check: a message
// (src/replies/conversation-to-answer.ts), a new quest's opening
// (src/conversations/start-quest.ts), a check-in, and any caller added later, since
// without a grant it cannot make a model. Once the balance is under 1
// whole gold, so the account page shows 0, those are refused. A call
// already under way finishes, with the answer-now call and the chat's
// naming it brings, which reuse its grant, so the reply that spends the
// last gold is whole and the balance can fall below 0.
import { hasGold } from "@/gold/gold.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import type { UserId } from "@/ids.ts";
import { grantQuota, type QuotaGrant } from "@/quota/quota-grant.ts";

// Whether owner may start another model call, with the grant to start it.
type GoldCheck =
  | { readonly kind: "granted"; readonly grant: QuotaGrant }
  | { readonly kind: "outOfGold" };

// Checks owner's gold. A storage failure rejects, so nothing is started
// unchecked.
async function checkGold(owner: UserId): Promise<GoldCheck> {
  if (!hasGold(await readGoldBalance(owner))) {
    return { kind: "outOfGold" };
  }
  return { kind: "granted", grant: grantQuota(owner) };
}

export type { QuotaGrant } from "@/quota/quota-grant.ts";
export type { GoldCheck };
export { checkGold };
