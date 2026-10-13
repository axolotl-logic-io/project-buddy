// A quota grant for unit tests that fake checkQuota or make a model directly.
// Besides quota.ts, this is the only module that may make a grant
// (quota-grant.test.ts).
import type { UserId } from "@/ids.ts";
import { grantQuota, type QuotaGrant } from "@/quota/quota-grant.ts";

// The grant checkQuota gives owner when their quota isn't used up, standing
// in for the check, which tests fake.
function quotaGrantFixture(owner: UserId): QuotaGrant {
  return grantQuota(owner);
}

export { quotaGrantFixture };
