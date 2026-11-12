// checkGold against the test database: a call is granted while the user has
// at least 1 whole gold, and refused once the balance, as the account page
// shows it, is 0: under 1 gold, at 0 or below it.

import { expect, test } from "vitest";
import { checkGold } from "@/quota/quota.ts";
import {
  spendAllGold,
  spendGold,
} from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

// What leaves exactly 1 gold of the starting 100, and a micro-USD less.
const ALL_BUT_ONE_GOLD = 990_000;
const ALL_BUT_ONE_GOLD_AND_A_MICRO_USD = 990_001;
const PAST_ZERO = 1250;

test("a new account is granted calls", async () => {
  const user = await testUser();

  expect((await checkGold(user.id)).kind).toBe("granted");
});

test("1 whole gold left grants a call", async () => {
  const user = await testUser();
  await spendGold(user, ALL_BUT_ONE_GOLD);

  expect((await checkGold(user.id)).kind).toBe("granted");
});

test("less than 1 whole gold, which the page shows as 0, is out of gold", async () => {
  const user = await testUser();
  await spendGold(user, ALL_BUT_ONE_GOLD_AND_A_MICRO_USD);

  expect((await checkGold(user.id)).kind).toBe("outOfGold");
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
