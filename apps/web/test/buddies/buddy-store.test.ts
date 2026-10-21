// @vitest-environment node
// The buddy store's rows read as buddies, and its failures. Which rows its
// queries find and write is buddy-store.server.test.ts's and
// buddy-actions.server.test.ts's.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  cloneBuddy,
  getUserBuddy,
  listBuddies,
  type UserBuddy,
} from "@/buddies/buddy-store.ts";
import { type BuddySnapshot, getBuddy } from "@/buddies/index.ts";
import { AppError } from "@/errors/app-error.ts";
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
    storedBuddies([STORED]);

    expect(await listBuddies(OWNER)).toEqual([READ]);
  });

  test("listBuddies skips a buddy whose stored parts are not every part", async () => {
    const { voice: _voice, ...withoutVoice } = OWN_BUDDY.parts;
    storedBuddies([{ ...STORED, storedParts: withoutVoice }]);

    expect(await listBuddies(OWNER)).toEqual([]);
  });

  test("getUserBuddy finds a malformed id nowhere, without a query", async () => {
    const neonHttp = storedBuddies([STORED]);

    expect(await getUserBuddy(OWNER, "mr-tee")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });
});

describe("buddy store cloneBuddy", () => {
  test("saves nothing for an id that is no buddy", async () => {
    const neonHttp = storedBuddies([]);

    expect(await cloneBuddy(OWNER, "retired-buddy")).toBeUndefined();
    expect(neonHttp.queries).toHaveLength(0);
  });
});

describe("buddy store failures", () => {
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
