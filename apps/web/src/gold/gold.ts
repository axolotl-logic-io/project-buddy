// Gold, the one balance a user's model calls spend, and what it is worth:
// the rate between gold and model spend lives here and nowhere else. Users
// only ever see whole gold, never dollars or the rate. It reads no storage
// and imports nothing, so the server and the browser can both use it.

// 1 gold is $0.01 of model spend: 10,000 millionths of a US dollar
// (micro-USD), the unit model calls are priced in (src/quota/prices.ts) and
// balances are stored in, so no call's cost rounds away. The rate is not
// secret; it only stays out of the UI.
const MICRO_USD_PER_GOLD = 10_000;

// What every account is given once, when it is made: 100 gold, $1.
const STARTING_GOLD = 100;

// The micro-USD that gold whole gold is worth.
function goldInMicroUsd(gold: number): number {
  return gold * MICRO_USD_PER_GOLD;
}

// The gold that microUsd, a whole number of gold such as a grant or a
// transfer, is worth.
function goldOfMicroUsd(microUsd: number): number {
  return microUsd / MICRO_USD_PER_GOLD;
}

// A balance in micro-USD as users see it: whole gold, rounded down, and 0
// for a balance below 0, which a call that was under way when the balance
// ran out can leave.
function wholeGold(microUsd: number): number {
  return Math.max(0, Math.floor(microUsd / MICRO_USD_PER_GOLD));
}

// Whether a balance in micro-USD shows at least 1 whole gold: what a new
// model call needs, so a user is never refused while the page shows them
// gold, nor let through while it shows 0.
function hasGold(microUsd: number): boolean {
  return wholeGold(microUsd) >= 1;
}

export { goldInMicroUsd, goldOfMicroUsd, hasGold, STARTING_GOLD, wholeGold };
