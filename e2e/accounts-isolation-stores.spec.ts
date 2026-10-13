// Two users' real rows side by side, read and written through the stores
// directly: neither can restore the other's memory, use the other's
// personas or see the other's spend. Another user's id answers exactly as an
// unknown id does, and writes nothing. accounts-isolation.spec.ts covers the
// same case through pages, the chat API and Server Actions;
// src/accounts/owner-scope-coverage.test.ts checks every store's queries
// with no rows.
import { expect } from "@playwright/test";
import type { User } from "@/accounts/users-store.ts";
import { projectIdFixture, userPersonaIdFixture } from "@/id-fixtures.ts";
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
import { DEFAULT_PERSONA_ID } from "@/personas/index.ts";
import {
  clonePersona,
  deletePersona,
  getUserPersona,
  listPersonas,
  updatePersona,
} from "@/personas/persona-store.ts";
import { readMonthlyUsage, recordSpend } from "@/quota/spend-store.ts";
import { type TestData, test } from "./fixtures.ts";

const THEIR_MEMORY = "- [ ] Rig the fox";
const THEIR_NEWER_MEMORY = "- [x] Rig the fox\n- [ ] Animate the fox";
const HER_PERSONA_EDIT = { name: "Hers now" };
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

// She reads, clones, edits and deletes the persona with this id: each
// answers exactly as for an unknown persona id.
async function expectPersonaNotFound(her: User, id: string): Promise<void> {
  const unknown = userPersonaIdFixture();
  expect(await getUserPersona(her.id, id)).toEqual(
    await getUserPersona(her.id, unknown),
  );
  expect(await clonePersona(her.id, id)).toEqual(
    await clonePersona(her.id, unknown),
  );
  expect(await updatePersona(her.id, id, HER_PERSONA_EDIT)).toEqual(
    await updatePersona(her.id, unknown, HER_PERSONA_EDIT),
  );
  expect(await deletePersona(her.id, id)).toEqual(
    await deletePersona(her.id, unknown),
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

// She uses another user's persona, by its id as stored and in capitals:
// it is not found, and stays as it was. Each user's list holds only their
// own personas.
async function useTheirPersona({
  account,
  otherAccount,
}: CaseArgs): Promise<void> {
  const theirPersona = await clonePersona(otherAccount.id, DEFAULT_PERSONA_ID);
  if (theirPersona === undefined) {
    throw new Error("Cloning the default persona saved nothing");
  }

  expect(await listPersonas(account.id)).toEqual([]);
  await expectPersonaNotFound(account, theirPersona.id);
  await expectPersonaNotFound(account, theirPersona.id.toUpperCase());
  expect(await listPersonas(account.id)).toEqual([]);

  const herPersona = await clonePersona(account.id, DEFAULT_PERSONA_ID);
  expect(herPersona).toBeDefined();
  expect(await listPersonas(account.id)).toEqual([herPersona]);
  expect(await listPersonas(otherAccount.id)).toEqual([theirPersona]);
  expect(await getUserPersona(otherAccount.id, theirPersona.id)).toEqual(
    theirPersona,
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
    "another user's persona is not found to read, clone, update or delete",
    useTheirPersona,
  );
  test("each user's spend is their own", spendOwnQuota);
});
