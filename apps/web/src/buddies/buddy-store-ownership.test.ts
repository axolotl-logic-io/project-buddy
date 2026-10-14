// @vitest-environment node
// Two users: user B cannot list, read, clone, update or delete user A's
// buddy. The database holds only A's buddy and answers B's queries as
// Postgres would: each is scoped to B's buddies, so it finds nothing.
import type { SQL } from "drizzle-orm";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { buddyOwnedBy } from "@/accounts/owner-scope.ts";
import { holdsPredicate } from "@/accounts/owner-scope-test-kit.ts";
import {
  cloneBuddy,
  deleteBuddy,
  getUserBuddy,
  listBuddies,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import { type StoredBuddy, storedBuddies } from "@/buddies/stored-buddies.ts";
import { FAKE_DATABASE_URL } from "@/db/fake-neon-http.ts";
import { userBuddyIdFixture, userIdFixture } from "@/id-fixtures.ts";

const USER_A = userIdFixture();
const USER_B = userIdFixture();
const A_BUDDY_ID = userBuddyIdFixture();
const A_BUDDY: StoredBuddy = {
  id: A_BUDDY_ID,
  userId: USER_A,
  buddy: { name: "A's tutor", parts: getBuddy("hippy").parts },
  createdAt: "2026-10-12 09:00:00+00",
  updatedAt: "2026-10-12 09:00:00+00",
};

// The database as user B's queries find it: none of A's rows.
let queriesOfB = storedBuddies([]);

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
  queriesOfB = storedBuddies([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("user A reads her own buddy through the same query", async () => {
  const neonHttp = storedBuddies([A_BUDDY]);

  expect(await getUserBuddy(USER_A, A_BUDDY_ID)).toHaveProperty(
    "id",
    A_BUDDY_ID,
  );
  expect(holdsPredicate(neonHttp.queries[0], buddyOwnedBy(USER_A))).toBe(true);
});

// Each buddy store function, called by B on A's buddy, with what B gets:
// the same as for a buddy that does not exist.
const callsOfB: [string, () => Promise<unknown>, unknown][] = [
  ["listBuddies", (): Promise<unknown> => listBuddies(USER_B), []],
  [
    "getUserBuddy",
    (): Promise<unknown> => getUserBuddy(USER_B, A_BUDDY_ID),
    undefined,
  ],
  [
    "cloneBuddy",
    (): Promise<unknown> => cloneBuddy(USER_B, A_BUDDY_ID),
    undefined,
  ],
  [
    "updateBuddy",
    (): Promise<unknown> =>
      updateBuddy(USER_B, A_BUDDY_ID, { name: "Taken over" }),
    undefined,
  ],
  [
    "deleteBuddy",
    (): Promise<unknown> => deleteBuddy(USER_B, A_BUDDY_ID),
    false,
  ],
];

test.each(callsOfB)(
  "%s by user B finds user A's buddy nowhere",
  async (_name, call, notFound) => {
    expect(await call()).toEqual(notFound);

    expect(queriesOfB.queries).toHaveLength(1);
    const [query] = queriesOfB.queries;
    const scopedToB: SQL = buddyOwnedBy(USER_B);
    expect(holdsPredicate(query, scopedToB)).toBe(true);
    expect(query?.params).not.toContain(USER_A);
  },
);
