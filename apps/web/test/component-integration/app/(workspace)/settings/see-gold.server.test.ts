import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
// "use_case_see_gold" in use-cases/accounts.md: Settings states her
// batteries, in whole batteries rounded down, as a number under its
// "Batteries" label, and her balance falls as the construct replies.
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import { HTTP_STATUS } from "@/http-status.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import {
  spendAllGold,
  spendGold,
} from "../../../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { sendChatMessage } from "../../../test-database/chat-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

// The balance Settings shows: the number under its "Batteries" label.
const BALANCE = /Batteries<\/h2><p[^>]*>(?<amount>[^<]*)<\/p>/u;

// 13 gold, in micro-USD, of the starting 100, leaving exactly 87.
const THIRTEEN_GOLD = 130_000;
const PAST_ZERO = 1250;
const MESSAGE = "Bevel a donut";

afterEach(() => {
  vi.unstubAllEnvs();
});

// The number markup shows under Settings's "Batteries" label.
function balanceIn(markup: string): string | undefined {
  const { amount } = BALANCE.exec(markup)?.groups ?? {};
  return amount;
}

// The number Settings Batteries section shows.
async function balanceShown(): Promise<string | undefined> {
  return balanceIn(renderToStaticMarkup(await SettingsPage()));
}

test("use_case_see_gold", async () => {
  const user = await testUser();
  const data = testData(user);
  const chat = await data.chat(await data.quest());

  await signIn(user);
  expect(await balanceShown()).toBe("100");

  await spendGold(user, THIRTEEN_GOLD);
  expect(await balanceShown()).toBe("87");

  const { status } = await sendChatMessage(chat.id, MESSAGE);

  expect(status).toBe(HTTP_STATUS.ok);
  // Local replies leave the balance unchanged.
  expect(await balanceShown()).toBe("87");
});

test("a balance below 0 shows as 0", async () => {
  const user = await testUser();
  await spendAllGold(user);
  await spendGold(user, PAST_ZERO);

  await signIn(user);

  expect(await balanceShown()).toBe("0");
});

test.each(["disabled", "production", "malformed"])(
  "Settings remains usable with %s Checkout",
  async (configuration) => {
    const user = await testUser();
    await signIn(user);
    vi.stubEnv("STRIPE_TEST_SECRET_KEY", "");
    if (configuration !== "disabled") {
      vi.stubEnv("STRIPE_TEST_SECRET_KEY", "sk_test_fixture");
      vi.stubEnv("STRIPE_TEST_WEBHOOK_SECRET", "whsec_fixture");
      vi.stubEnv("STRIPE_TEST_RETURN_ORIGIN", "http://localhost");
      vi.stubEnv("BATTERY_TEST_CATALOG", "invalid JSON");
    }
    if (configuration === "production") {
      vi.stubEnv("VERCEL_ENV", "production");
    }
    const markup = renderToStaticMarkup(await SettingsPage());
    expect(balanceIn(markup)).toBe("100");
    expect(markup).not.toContain('id="buy-batteries"');
  },
);

test.each([{ battery: "success" }, { section: "batteries" }])(
  "purchase navigation keeps Batteries and security visible (%o)",
  async (query) => {
    const user = await testUser();
    await signIn(user);
    const html = renderToStaticMarkup(
      await SettingsPage({
        searchParams: Promise.resolve(query),
      }),
    );
    expect(balanceIn(html)).toBe("100");
    expect(html).toContain('id="batteries"');
    expect(html).toContain('id="security"');
    expect(html).not.toContain('role="tab"');
  },
);
