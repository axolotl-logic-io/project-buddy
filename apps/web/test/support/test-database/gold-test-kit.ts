// Gold for tests of what model calls spend and of running out: the server
// tests' and the e2e tests' one copy. Every test user starts with the
// starting grant (user-test-kit.ts), so what they have spent is that grant
// less their balance.
import type { User } from "@/accounts/users-store.ts";
import { goldInMicroUsd, STARTING_GOLD } from "@/gold/gold.ts";
import { chargeGold, readGoldBalance } from "@/gold/gold-store.ts";

// Takes microUsd from user's gold, as their model calls would.
async function spendGold(user: User, microUsd: number): Promise<void> {
  await chargeGold(user.id, microUsd);
}

// Spends all of user's gold, leaving exactly 0, so their next model call is
// refused.
async function spendAllGold(user: User): Promise<void> {
  await chargeGold(user.id, await readGoldBalance(user.id));
}

// What user's model calls have spent since their account was made, in
// micro-USD.
async function goldSpent(user: User): Promise<number> {
  return goldInMicroUsd(STARTING_GOLD) - (await readGoldBalance(user.id));
}

export { goldSpent, spendAllGold, spendGold };
