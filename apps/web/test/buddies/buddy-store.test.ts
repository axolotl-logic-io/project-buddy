// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buddyOwnedBy } from "@/accounts/owner-scope.ts";
import {
  cloneBuddy,
  deleteBuddy,
  getUserBuddy,
  listBuddies,
  type UserBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { type BuddySnapshot, getBuddy } from "@/buddies/index.ts";
import { AppError } from "@/errors/app-error.ts";
import { holdsPredicate } from "../accounts/owner-scope-test-kit.ts";
import { FAKE_DATABASE_URL, fakeNeonHttp } from "../db/fake-neon-http.ts";
import { spyOnErrorLog } from "../errors/error-log-spy.ts";
import { userBuddyIdFixture, userIdFixture } from "../id-fixtures.ts";
import { type StoredBuddy, storedBuddies } from "./stored-buddies.ts";

const OWNER = userIdFixture();
const BUDDY_ID = userBuddyIdFixture();
const CREATED_AT = "2026-10-12 09:00:00+00";
const UPDATED_AT = "2026-10-13 09:00:00+00";
const MR_TEE = getBuddy("mr-tee");
const OWN_BUDDY: BuddySnapshot = {
  name: "Mr. Tee (clone)",
  parts: { ...MR_TEE.parts, voice: "## Voice\n\nCalm." },
};
const STORED: StoredBuddy = {
  id: BUDDY_ID,
  userId: OWNER,
  buddy: OWN_BUDDY,
  clonedFrom: "mr-tee",
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
};
const READ: UserBuddy = {
  id: BUDDY_ID,
  ...OWN_BUDDY,
  clonedFrom: "mr-tee",
  createdAt: new Date(CREATED_AT),
  updatedAt: new Date(UPDATED_AT),
};
const INSERTS_BUDDY = /^insert into "buddies"/u;
const UPDATES_BUDDY = /^update "buddies" set /u;

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", FAKE_DATABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buddy store reads", () => {
  test("listBuddies reads the owner's buddies", async () => {
    const neonHttp = storedBuddies([STORED]);

    expect(await listBuddies(OWNER)).toEqual([READ]);
    expect(holdsPredicate(neonHttp.queries[0], buddyOwnedBy(OWNER))).toBe(true);
  });

  test("listBuddies skips a buddy whose stored parts are not every part", async () => {
    const { voice: _voice, ...withoutVoice } = OWN_BUDDY.parts;
    storedBuddies([{ ...STORED, storedParts: withoutVoice }]);

    expect(await listBuddies(OWNER)).toEqual([]);
  });

  test("getUserBuddy looks up the lowercase id among the owner's buddies", async () => {
    const neonHttp = storedBuddies([STORED]);

    expect(await getUserBuddy(OWNER, BUDDY_ID.toUpperCase())).toEqual(READ);
    expect(neonHttp.queries[0]?.params).toEqual([BUDDY_ID, OWNER]);
  });

  test("getUserBuddy finds a malformed id nowhere, without a query", async () => {
    const neonHttp = storedBuddies([STORED]);

    expect(await getUserBuddy(OWNER, "mr-tee")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });
});

describe("buddy store cloneBuddy", () => {
  test("saves a copy of a built-in buddy as the owner's", async () => {
    const neonHttp = storedBuddies([STORED]);

    expect(await cloneBuddy(OWNER, "mr-tee")).toEqual(READ);

    const [insert] = neonHttp.queries;
    expect(insert?.query).toMatch(INSERTS_BUDDY);
    expect(insert?.params).toEqual([
      OWNER,
      `${MR_TEE.name} (clone)`,
      JSON.stringify(MR_TEE.parts),
      "mr-tee",
    ]);
  });

  test("saves a copy of one of the owner's own buddies, read as the owner's", async () => {
    const neonHttp = storedBuddies([STORED]);

    await cloneBuddy(OWNER, BUDDY_ID);

    const [read, insert] = neonHttp.queries;
    expect(holdsPredicate(read, buddyOwnedBy(OWNER))).toBe(true);
    expect(insert?.params).toEqual([
      OWNER,
      `${OWN_BUDDY.name} (clone)`,
      JSON.stringify(OWN_BUDDY.parts),
      BUDDY_ID,
    ]);
  });

  test("saves nothing for an id that is no buddy", async () => {
    const neonHttp = storedBuddies([]);

    expect(await cloneBuddy(OWNER, "retired-buddy")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });
});

describe("buddy store edits", () => {
  test("updateBuddy saves the new parts and the time, in the owner's buddy", async () => {
    const neonHttp = storedBuddies([STORED]);
    const { parts } = getBuddy("hippy");

    expect(await updateBuddy(OWNER, BUDDY_ID, { parts })).toEqual(READ);

    const [update] = neonHttp.queries;
    expect(update?.query).toMatch(UPDATES_BUDDY);
    expect(update?.query).toContain(`"updated_at" = now()`);
    expect(update?.query).not.toContain(`"name" =`);
    expect(update?.params).toEqual([JSON.stringify(parts), BUDDY_ID, OWNER]);
  });

  test("updateBuddy saves a new name alone", async () => {
    const neonHttp = storedBuddies([STORED]);

    await updateBuddy(OWNER, BUDDY_ID, { name: "Mr. Calm" });

    expect(neonHttp.queries[0]?.params).toEqual(["Mr. Calm", BUDDY_ID, OWNER]);
  });

  test("deleteBuddy deletes the owner's buddy", async () => {
    const neonHttp = storedBuddies([STORED]);

    expect(await deleteBuddy(OWNER, BUDDY_ID)).toBe(true);
    expect(holdsPredicate(neonHttp.queries[0], buddyOwnedBy(OWNER))).toBe(true);
  });

  test("rejects with a logged AppError when the database is unreachable", async () => {
    vi.stubGlobal("fetch", fakeNeonHttp({ kind: "unreachable" }).fetch);
    const log = spyOnErrorLog();

    const error = await listBuddies(OWNER).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(log).toHaveBeenCalledWith(
      "[app-error] database-unreachable in listBuddies",
      expect.any(String),
    );
  });
});
