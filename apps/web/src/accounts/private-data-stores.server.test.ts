// use_case_private_data on the memory and spend stores: two users' real
// rows side by side, read and written through the stores directly. Neither
// can restore the other's memory or see the other's spend. Another user's
// project answers exactly as an unknown one does, and takes no writes.
// owner-scope-coverage.test.ts checks every store's queries with no rows.
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import { projectIdFixture } from "@/id-fixtures.ts";
import type { ProjectId } from "@/ids.ts";
import {
  MEMORY_VERSION_NUMBER,
  type Memory,
  type MemoryVersionNumber,
} from "@/memory/memory.ts";
import {
  type MemoryWriteResult,
  readMemory,
  readMemoryHistory,
  restoreMemoryVersion,
  saveMemory,
} from "@/memory/memory-store.ts";
import type { Project } from "@/projects/store.ts";
import { readMonthlyUsage, recordSpend } from "@/quota/spend-store.ts";
import type { TestData } from "@/test-database/data-test-kit.ts";
import { twoUsers } from "@/test-database/two-users-test-kit.ts";

const THEIR_MEMORY = "- [ ] Rig the fox";
const THEIR_NEWER_MEMORY = "- [x] Rig the fox\n- [ ] Animate the fox";
// A fixed moment, so the spend case reads the month it wrote whenever it
// runs.
const SPEND_NOW = new Date("2026-03-14T12:00:00Z");
const THEIR_SPEND_MICRO_USD = 1_250_000;
const HER_SPEND_MICRO_USD = 40_000;
const HER_LATER_SPEND_MICRO_USD = 7000;

// A project with two versions of its memory, the second saved.
interface TwoVersions {
  readonly project: Project;
  readonly first: Memory;
  readonly second: MemoryWriteResult;
}

function versionNumber(value: number): MemoryVersionNumber {
  return MEMORY_VERSION_NUMBER.parse(value);
}

// A new project of the owner's, with two versions of its memory.
async function twoVersions(owner: User, data: TestData): Promise<TwoVersions> {
  const project = await data.project();
  const { memory: first } = await saveMemory(owner.id, {
    projectId: project.id,
    text: THEIR_MEMORY,
    basedOn: versionNumber(0),
    author: "user",
  });
  const second = await saveMemory(owner.id, {
    projectId: project.id,
    text: THEIR_NEWER_MEMORY,
    basedOn: first.version,
    author: "user",
  });
  return { project, first, second };
}

// What her restoring version of the project answered, based on each of
// bases in turn.
function restoresAs(
  her: User,
  projectId: ProjectId,
  version: MemoryVersionNumber,
  bases: readonly MemoryVersionNumber[],
): Promise<(MemoryWriteResult | undefined)[]> {
  return Promise.all(
    bases.map((basedOn) =>
      restoreMemoryVersion(her.id, {
        projectId,
        version,
        basedOn,
        author: "user",
      }),
    ),
  );
}

// Her spend in SPEND_NOW's month.
async function spentBy(user: User): Promise<number> {
  return (await readMonthlyUsage(user.id, SPEND_NOW)).spentMicroUsd;
}

describe("use_case_private_data", () => {
  // Based on its newest version and on the empty memory, each answers as
  // for a project that never existed, holding none of their text.
  test("restoring another user's memory version is not found, and writes nothing", async () => {
    const { her, other, otherData } = await twoUsers();
    const { project, first, second } = await twoVersions(other, otherData);
    expect(second.kind).toBe("saved");
    const theirMemory = await readMemory(other.id, project.id);
    const theirHistory = await readMemoryHistory(other.id, project.id);
    const bases = [second.memory.version, versionNumber(0)];

    const answers = await restoresAs(her, project.id, first.version, bases);

    expect(answers).toEqual(
      await restoresAs(her, projectIdFixture(), first.version, bases),
    );
    for (const answer of answers) {
      expect(answer?.memory.text ?? "").not.toContain("Rig the fox");
    }
    expect(await readMemory(other.id, project.id)).toEqual(theirMemory);
    expect(await readMemoryHistory(other.id, project.id)).toEqual(theirHistory);
    expect(await readMemoryHistory(her.id, project.id)).toEqual([]);
  });

  // More spend of hers then changes only hers.
  test("each user's spend is their own", async () => {
    const { her, other } = await twoUsers();
    await recordSpend(other.id, THEIR_SPEND_MICRO_USD, SPEND_NOW);
    await recordSpend(her.id, HER_SPEND_MICRO_USD, SPEND_NOW);

    expect(await spentBy(other)).toBe(THEIR_SPEND_MICRO_USD);
    expect(await spentBy(her)).toBe(HER_SPEND_MICRO_USD);

    await recordSpend(her.id, HER_LATER_SPEND_MICRO_USD, SPEND_NOW);

    expect(await spentBy(other)).toBe(THEIR_SPEND_MICRO_USD);
    expect(await spentBy(her)).toBe(
      HER_SPEND_MICRO_USD + HER_LATER_SPEND_MICRO_USD,
    );
  });
});
