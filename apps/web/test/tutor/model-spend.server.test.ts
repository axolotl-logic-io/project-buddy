import { streamText } from "ai";
import { expect, test } from "vitest";
import { tutorModel } from "@/tutor/model.ts";
import { quotaGrantFixture } from "../quota/quota-test-kit.ts";
import { spentThisMonth } from "../test-database/spend-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const MOCK_CALL_MICRO_USD = 12;

test("each mock model call charges its owner at the configured model prices", async () => {
  const user = await testUser();
  const before = await spentThisMonth(user);
  await streamText({
    model: tutorModel(quotaGrantFixture(user.id)),
    messages: [{ role: "user", content: "Bevel a donut" }],
  }).consumeStream();
  expect(await spentThisMonth(user)).toBe(before + MOCK_CALL_MICRO_USD);
});
