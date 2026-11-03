// checkGold against the test database: a call is granted while the user has
// any gold, and refused once the balance is at or below 0.
import { expect, test } from "vitest";
import { checkGold } from "@/quota/quota.ts";
import {
  spendAllGold,
  spendGold,
} from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

// 100 gold, in micro-USD, and what leaves the least gold above 0.
const STARTING_BALANCE = 1_000_000;
const ALL_BUT_ONE_MICRO_USD: number = STARTING_BALANCE - 1;
const PAST_ZERO = 1250;

test("a new account is granted calls", async () => {
  const user = await testUser();

  expect((await checkGold(user.id)).kind).toBe("granted");
});

test("any gold left grants a call", async () => {
  const user = await testUser();
  await spendGold(user, ALL_BUT_ONE_MICRO_USD);

  expect((await checkGold(user.id)).kind).toBe("granted");
});

test("a balance of 0 is out of gold", async () => {
  const user = await testUser();
  await spendAllGold(user);

  expect((await checkGold(user.id)).kind).toBe("outOfGold");
});

test("a balance below 0 is out of gold", async () => {
  const user = await testUser();
  await spendAllGold(user);
  await spendGold(user, PAST_ZERO);

  expect((await checkGold(user.id)).kind).toBe("outOfGold");
});
