// Who saved each version of a team project's memory, as its history names
// them, in the test database: the viewer's own versions are theirs, another
// person's are named, the construct's are the construct's, and a version whose saver's
// account is gone stays, with no one named.
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { saveUserName } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
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
import { teamProject } from "../projects/team-project-test-kit.ts";

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

describe("use_case_view_memory", () => {
  test("a team project's history names who saved each version, to each viewer", async () => {
    // The owner saved the memory (version 1) and a Quick Note (version 2).
    const { owner, member, project } = await teamProject();
    await saveUserName(owner.id, "Ada");
    const memory = await readMemory(member.id, project.id);
    await saveMemory(member.id, {
      projectId: project.id,
      text: `${memory.text}\n\nNext step: shade the shell.`,
      basedOn: memory.version,
      author: "user",
    });
    await editMemory(member.id, {
      projectId: project.id,
      edit: { oldText: "", newText: "Milestone: shell shaded." },
      author: "construct",
    });

    const [seenByMember, seenByOwner] = await Promise.all([
      saversSeenBy(member.id, project.id),
      saversSeenBy(owner.id, project.id),
    ]);
    expect(seenByMember).toEqual([
      { version: 4, savedBy: undefined },
      { version: 3, savedBy: { kind: "viewer" } },
      { version: 2, savedBy: { kind: "person", name: "Ada" } },
      { version: 1, savedBy: { kind: "person", name: "Ada" } },
    ]);
    // The member has no name, so the owner sees their address, as the
    // project's members list does.
    expect(seenByOwner).toEqual([
      { version: 4, savedBy: undefined },
      { version: 3, savedBy: { kind: "person", name: member.email } },
      { version: 2, savedBy: { kind: "viewer" } },
      { version: 1, savedBy: { kind: "viewer" } },
    ]);
  });

  test("a version stays when its saver's account is deleted, naming no one", async () => {
    const { owner, member, project } = await teamProject();
    const memory = await readMemory(member.id, project.id);
    await saveMemory(member.id, {
      projectId: project.id,
      text: `${memory.text}\n\nNext step: shade the shell.`,
      basedOn: memory.version,
      author: "user",
    });

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

test("future member restores record their source version and authorship without changing earlier history", async () => {
  const { owner, member, project } = await teamProject();
  const before = await readMemoryHistory(owner.id, project.id);
  const [newest] = before;
  const earlier = before.at(-1);
  if (newest === undefined || earlier === undefined) {
    throw new Error("Missing Journal history");
  }
  expect(
    await restoreMemoryVersion(member.id, {
      projectId: project.id,
      version: earlier.version,
      basedOn: newest.version,
      author: "user",
    }),
  ).toMatchObject({ kind: "saved" });
  const history = await readMemoryHistory(owner.id, project.id);
  expect(history[0]).toMatchObject({
    restoredFromVersion: earlier.version,
    author: "user",
    savedBy: { kind: "person", name: member.email },
  });
  expect(history.slice(1)).toEqual(before);
  expect((await readMemoryHistory(member.id, project.id))[0]?.savedBy).toEqual({
    kind: "viewer",
  });
  expect(
    await restoreMemoryVersion(owner.id, {
      projectId: project.id,
      version: earlier.version,
      basedOn: newest.version,
      author: "user",
    }),
  ).toMatchObject({ kind: "outdated" });
});
