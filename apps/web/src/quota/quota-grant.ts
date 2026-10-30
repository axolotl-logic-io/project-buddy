// The quota grant: proof that a user's monthly quota was checked and not used
// up, which every model is made from (src/replies/model.ts). Its key is a
// symbol no other module can name, so no other module can make one. Only
// quota.ts, whose checkQuota grants a call, and quota-test-kit.ts, which
// stands in for that check in unit tests, may import grantQuota;
// quota-grant.test.ts holds every other module to that.
import type { UserId } from "@/ids.ts";

const QUOTA_GRANT: unique symbol = Symbol("QuotaGrant");

// The grant of owner's model calls, charged to owner.
interface QuotaGrant {
  readonly owner: UserId;
  readonly [QUOTA_GRANT]: true;
}

// A grant of owner's model calls. Call it only once owner's quota is checked.
function grantQuota(owner: UserId): QuotaGrant {
  return { owner, [QUOTA_GRANT]: true };
}

export type { QuotaGrant };
export { grantQuota };
