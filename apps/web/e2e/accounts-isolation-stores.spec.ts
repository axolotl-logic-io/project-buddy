// Two users' real rows side by side, read and written through the stores
// directly: neither can restore the other's memory, use the other's
// buddies or see the other's spend. Another user's id answers exactly as an
// unknown id does, and writes nothing. accounts-isolation.spec.ts covers the
// same case through pages, the chat API and Server Actions;
// src/accounts/owner-scope-coverage.test.ts checks every store's queries
// with no rows.
import { expect } from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import {
  cloneBuddy,
  deleteBuddy,
  getUserBuddy,
  listBuddies,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { projectIdFixture, userBuddyIdFixture } from "@/id-fixtures.ts";
import type { ProjectId } from "@/ids.ts";
import {
  MEMORY_VERSION_NUMBER,
  type MemoryVersionNumber,
} from "@/memory/memory.ts";
import {
  readMemory,
  readMemoryHistory,
  restoreMemoryVersion,
  saveMemory,
} from "@/memory/memory-store.ts";
import { readMonthlyUsage, recordSpend } from "@/quota/spend-store.ts";
import { type TestData, test } from "./fixtures.ts";

const THEIR_MEMORY = "- [ ] Rig the fox";
const THEIR_NEWER_MEMORY = "- [x] Rig the fox\n- [ ] Animate the fox";
const HER_BUDDY_EDIT = { name: "Hers now" };
// A fixed moment, so the spend case reads the month it wrote whenever it
// runs.
const SPEND_NOW = new Date("2026-03-14T12:00:00Z");
const THEIR_SPEND_MICRO_USD = 1_250_000;
const HER_SPEND_MICRO_USD = 40_000;
const HER_LATER_SPEND_MICRO_USD = 7000;

// What a test of this case uses: her account, and the other user's account
// and data.
interface CaseArgs {
  readonly account: User;
  readonly otherAccount: User;
  readonly otherTestData: TestData;
}

function versionNumber(value: number): MemoryVersionNumber {
  return MEMORY_VERSION_NUMBER.parse(value);
}

// She restores version of the project, based on basedOn: the answer is
// exactly the one for a project that never existed, and holds none of the
// project's text.
async function expectRestoreNotFound(
  her: User,
  projectId: ProjectId,
  version: MemoryVersionNumber,
  basedOn: MemoryVersionNumber,
): Promise<void> {
  const restore = { version, basedOn, author: "user" } as const;
  const result = await restoreMemoryVersion(her.id, { ...restore, projectId });
  expect(result).toEqual(
    await restoreMemoryVersion(her.id, {
      ...restore,
      projectId: projectIdFixture(),
    }),
  );
  expect(result?.memory.text ?? "").not.toContain("Rig the fox");
}

// She reads, clones, edits and deletes the buddy with this id: each
// answers exactly as for an unknown buddy id.
async function expectBuddyNotFound(her: User, id: string): Promise<void> {
  const unknown = userBuddyIdFixture();
  expect(await getUserBuddy(her.id, id)).toEqual(
    await getUserBuddy(her.id, unknown),
  );
  expect(await cloneBuddy(her.id, id)).toEqual(
    await cloneBuddy(her.id, unknown),
  );
  expect(await updateBuddy(her.id, id, HER_BUDDY_EDIT)).toEqual(
    await updateBuddy(her.id, unknown, HER_BUDDY_EDIT),
  );
  expect(await deleteBuddy(her.id, id)).toEqual(
    await deleteBuddy(her.id, unknown),
  );
}

// Her spend in SPEND_NOW's month.
async function spentBy(user: User): Promise<number> {
  return (await readMonthlyUsage(user.id, SPEND_NOW)).spentMicroUsd;
}

// She restores a version of another user's memory, based on its newest
// version and on the empty memory: each answers as for a project that never
// existed, and their memory and its history are unchanged.
async function restoreTheirMemory({
  account,
  otherAccount,
  otherTestData,
}: CaseArgs): Promise<void> {
  const theirs = await otherTestData.project();
  const first = await saveMemory(otherAccount.id, {
    projectId: theirs.id,
    text: THEIR_MEMORY,
    basedOn: versionNumber(0),
    author: "user",
  });
  const second = await saveMemory(otherAccount.id, {
    projectId: theirs.id,
    text: THEIR_NEWER_MEMORY,
    basedOn: first.memory.version,
    author: "user",
  });
  expect(second.kind).toBe("saved");
  const theirMemory = await readMemory(otherAccount.id, theirs.id);
  const theirHistory = await readMemoryHistory(otherAccount.id, theirs.id);

  await expectRestoreNotFound(
    account,
    theirs.id,
    first.memory.version,
    second.memory.version,
  );
  await expectRestoreNotFound(
    account,
    theirs.id,
    first.memory.version,
    versionNumber(0),
  );

  expect(await readMemory(otherAccount.id, theirs.id)).toEqual(theirMemory);
  expect(await readMemoryHistory(otherAccount.id, theirs.id)).toEqual(
    theirHistory,
  );
  expect(await readMemoryHistory(account.id, theirs.id)).toEqual([]);
}

// She uses another user's buddy, by its id as stored and in capitals:
// it is not found, and stays as it was. Each user's list holds only their
// own buddies.
async function useTheirBuddy({
  account,
  otherAccount,
}: CaseArgs): Promise<void> {
  const theirBuddy = await cloneBuddy(otherAccount.id, DEFAULT_BUDDY_ID);
  if (theirBuddy === undefined) {
    throw new Error("Cloning the default buddy saved nothing");
  }

  expect(await listBuddies(account.id)).toEqual([]);
  await expectBuddyNotFound(account, theirBuddy.id);
  await expectBuddyNotFound(account, theirBuddy.id.toUpperCase());
  expect(await listBuddies(account.id)).toEqual([]);

  const herBuddy = await cloneBuddy(account.id, DEFAULT_BUDDY_ID);
  expect(herBuddy).toBeDefined();
  expect(await listBuddies(account.id)).toEqual([herBuddy]);
  expect(await listBuddies(otherAccount.id)).toEqual([theirBuddy]);
  expect(await getUserBuddy(otherAccount.id, theirBuddy.id)).toEqual(
    theirBuddy,
  );
}

// Both users spend in the same month: each reads only their own spend, and
// more spend of hers changes only hers.
async function spendOwnQuota({
  account,
  otherAccount,
}: CaseArgs): Promise<void> {
  await recordSpend(otherAccount.id, THEIR_SPEND_MICRO_USD, SPEND_NOW);
  await recordSpend(account.id, HER_SPEND_MICRO_USD, SPEND_NOW);

  expect(await spentBy(otherAccount)).toBe(THEIR_SPEND_MICRO_USD);
  expect(await spentBy(account)).toBe(HER_SPEND_MICRO_USD);

  await recordSpend(account.id, HER_LATER_SPEND_MICRO_USD, SPEND_NOW);

  expect(await spentBy(otherAccount)).toBe(THEIR_SPEND_MICRO_USD);
  expect(await spentBy(account)).toBe(
    HER_SPEND_MICRO_USD + HER_LATER_SPEND_MICRO_USD,
  );
}

test.describe("use_case_private_data", () => {
  test(
    "restoring another user's memory version is not found, and writes nothing",
    restoreTheirMemory,
  );
  test(
    "another user's buddy is not found to read, clone, update or delete",
    useTheirBuddy,
  );
  test("each user's spend is their own", spendOwnQuota);
});
