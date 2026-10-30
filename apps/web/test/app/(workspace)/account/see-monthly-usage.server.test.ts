import { renderToStaticMarkup } from "react-dom/server";
// "use_case_see_monthly_usage" in use-cases/accounts.md: her account page
// states this month's spend out of the $5 quota, and the day it resets. The
// page reads the usage and states it as usage-amounts.ts does; the meter and
// the sign-out buttons are checked in usage-meter.test.tsx and
// layout.test.tsx.
import { expect, test } from "vitest";
import AccountPage from "@/app/(workspace)/account/page.tsx";
import { HTTP_STATUS } from "@/http-status.ts";
import { sendChatMessage } from "../../../test-database/chat-test-kit.ts";
import { testData } from "../../../test-database/data-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";
import {
  resetDaysSince,
  spend,
} from "../../../test-database/spend-test-kit.ts";
import { testUser } from "../../../test-database/user-test-kit.ts";

const DOLLAR_AND_A_QUARTER = 1_250_000;
const MESSAGE = "Bevel a donut";

test("use_case_see_monthly_usage", async () => {
  const user = await testUser();
  const data = testData(user);
  const chat = await data.chat(await data.project());
  const since = new Date();
  await spend(user, DOLLAR_AND_A_QUARTER);

  await signIn(user);
  const before = renderToStaticMarkup(await AccountPage());

  expect(before).toContain("$1.25 of $5.00");
  expect(resetDaysSince(since).some((day) => before.includes(day))).toBe(true);

  await signIn(user);
  const { status } = await sendChatMessage(chat.id, MESSAGE);

  expect(status).toBe(HTTP_STATUS.ok);
  const after = renderToStaticMarkup(await AccountPage());
  // A reply from the mock buddy costs a fraction of a cent, which the page
  // rounds up.
  expect(after).toContain("$1.26 of $5.00");
  expect(resetDaysSince(since).some((day) => after.includes(day))).toBe(true);
});
