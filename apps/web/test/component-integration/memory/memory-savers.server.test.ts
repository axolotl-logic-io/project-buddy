// Who saved each version of a quest's memory, as its history names them, in
// the test database: the viewer's own versions are theirs, a version another
// person saved while quests could be shared is named, the construct's are
// the construct's, and a version whose saver's account is gone stays, with
// no one named. That other person, a former member, reads no history and
// restores nothing.
import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { saveUserName, type User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { users } from "@/db/tables/users.ts";
import type { ProjectId, UserId } from "@/ids.ts";
import type { MemorySaver } from "@/memory/memory.ts";
import {
  editMemory,
  readMemory,
  readMemoryHistory,
  restoreMemoryVersion,
  saveMemory,
} from "@/memory/memory-store.ts";
import { formerMemberQuest } from "../accounts/former-member-quest-test-kit.ts";

// Each version's number and who saved it, newest first, as viewer sees them.
async function saversSeenBy(
  viewer: UserId,
  projectId: ProjectId,
): Promise<
  { readonly version: number; readonly savedBy: MemorySaver | undefined }[]
> {
  const history = await readMemoryHistory(viewer, projectId);
  return history.map(({ version, savedBy }) => ({ version, savedBy }));
}

// Saves a new version as the owner, then names saver as the person who saved
// it, as a member's save once did. The stores save only the acting user's
// versions now, so this names the table.
async function saveAsFormerMember(
  owner: User,
  saver: User,
  projectId: ProjectId,
): Promise<void> {
  const memory = await readMemory(owner.id, projectId);
  const saved = await saveMemory(owner.id, {
    projectId,
    text: `${memory.text}\n\nNext step: shade the shell.`,
    basedOn: memory.version,
    author: "user",
  });
  if (saved.kind !== "saved") {
    throw new Error(`The memory was not saved: ${saved.kind}`);
  }
  await getDb()
    .update(memoryVersions)
    .set({ userId: saver.id })
    .where(
      and(
        eq(memoryVersions.projectId, projectId),
        eq(memoryVersions.version, saved.memory.version),
      ),
    );
}

describe("use_case_view_memory", () => {
  test("a quest's history names who saved each version, and a former member reads none of it", async () => {
    // The owner saved the memory (version 1) and a Quick Note (version 2).
    const { owner, member, project } = await formerMemberQuest();
    await saveUserName(owner.id, "Ada");
    await saveAsFormerMember(owner, member, project.id);
    await editMemory(owner.id, {
      projectId: project.id,
      edit: { oldText: "", newText: "Milestone: shell shaded." },
      author: "construct",
    });

    // The former member has no name, so the owner sees their address.
    expect(await saversSeenBy(owner.id, project.id)).toEqual([
      { version: 4, savedBy: undefined },
      { version: 3, savedBy: { kind: "person", name: member.email } },
      { version: 2, savedBy: { kind: "viewer" } },
      { version: 1, savedBy: { kind: "viewer" } },
    ]);
    expect(await saversSeenBy(member.id, project.id)).toEqual([]);
  });

  test("a version stays when its saver's account is deleted, naming no one", async () => {
    const { owner, member, project } = await formerMemberQuest();
    await saveAsFormerMember(owner, member, project.id);

    // The site has no account deletion yet, so this names the table.
    await getDb().delete(users).where(eq(users.id, member.id));

    const history = await readMemoryHistory(owner.id, project.id);
    expect(
      history.map(({ version, savedBy }) => ({ version, savedBy })),
    ).toEqual([
      { version: 3, savedBy: undefined },
      { version: 2, savedBy: { kind: "viewer" } },
      { version: 1, savedBy: { kind: "viewer" } },
    ]);
    expect(history[0]?.text).toContain("Next step: shade the shell.");
  });
});

test("restores record their source version and authorship without changing earlier history, and a former member restores nothing", async () => {
  const { owner, member, project } = await formerMemberQuest();
  const before = await readMemoryHistory(owner.id, project.id);
  const [newest] = before;
  const earlier = before.at(-1);
  if (newest === undefined || earlier === undefined) {
    throw new Error("Missing Journal history");
  }
  const { version } = earlier;
  const basedOn = newest.version;
  function restoreAs(user: User): ReturnType<typeof restoreMemoryVersion> {
    return restoreMemoryVersion(user.id, {
      projectId: project.id,
      version,
      basedOn,
      author: "user",
    });
  }

  expect(await restoreAs(member)).not.toMatchObject({ kind: "saved" });
  expect(await readMemoryHistory(owner.id, project.id)).toEqual(before);

  expect(await restoreAs(owner)).toMatchObject({ kind: "saved" });
  const history = await readMemoryHistory(owner.id, project.id);
  expect(history[0]).toMatchObject({
    restoredFromVersion: earlier.version,
    author: "user",
    savedBy: { kind: "viewer" },
  });
  expect(history.slice(1)).toEqual(before);
});
