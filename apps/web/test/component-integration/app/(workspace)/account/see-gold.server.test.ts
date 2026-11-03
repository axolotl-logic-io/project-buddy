import { renderToStaticMarkup } from "react-dom/server";
// "use_case_see_gold" in use-cases/accounts.md: her account page states her
// gold, in whole gold rounded down, and her balance falls as the buddy
// replies. The extra that hides it is checked in hide-extras.browser.test.tsx.
import { expect, test } from "vitest";
import AccountPage from "@/app/(workspace)/account/page.tsx";
import { HTTP_STATUS } from "@/http-status.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import {
  spendAllGold,
  spendGold,
} from "../../../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { sendChatMessage } from "../../../test-database/chat-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

// 13 gold, in micro-USD, of the starting 100, leaving exactly 87.
const THIRTEEN_GOLD = 130_000;
const PAST_ZERO = 1250;
const MESSAGE = "Bevel a donut";

test("use_case_see_gold", async () => {
  const user = await testUser();
  const data = testData(user);
  const chat = await data.chat(await data.project());

  await signIn(user);
  expect(renderToStaticMarkup(await AccountPage())).toContain("Gold: 100");

  await spendGold(user, THIRTEEN_GOLD);
  expect(renderToStaticMarkup(await AccountPage())).toContain("Gold: 87");

  const { status } = await sendChatMessage(chat.id, MESSAGE);

  expect(status).toBe(HTTP_STATUS.ok);
  // A reply from the mock buddy costs a fraction of a gold, which the page
  // rounds down.
  expect(renderToStaticMarkup(await AccountPage())).toContain("Gold: 86");
});

test("a balance below 0 shows as 0", async () => {
  const user = await testUser();
  await spendAllGold(user);
  await spendGold(user, PAST_ZERO);

  await signIn(user);

  expect(renderToStaticMarkup(await AccountPage())).toContain("Gold: 0");
});
