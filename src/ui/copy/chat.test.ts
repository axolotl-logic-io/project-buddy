import { describe, expect, test } from "vitest";
import { userMessage } from "@/errors/app-error.ts";
import { quotaResetsOn } from "@/quota/quota-terms.ts";
import { QUOTA_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";

// The last second of October 2026 in UTC, which is already November 1st
// east of UTC and still October 31st west of it.
const LAST_SECOND_OF_OCTOBER = new Date("2026-10-31T23:59:59.999Z");

describe("quotaUsedUpMessage", () => {
  test("says the quota is used up and names the reset day in UTC", () => {
    expect(quotaUsedUpMessage(quotaResetsOn(LAST_SECOND_OF_OCTOBER))).toBe(
      `${userMessage("quota-used-up")} ${QUOTA_COPY.resetsOn("November 1, 2026")}`,
    );
  });
});
