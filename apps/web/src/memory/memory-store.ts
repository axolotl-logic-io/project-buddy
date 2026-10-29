// Each project's memory: one Markdown text that every chat in the project
// shares, with every version kept. A project with nothing saved has an empty
// memory at version 0. Writes are optimistic: a save names the version it was
// based on and is refused if a newer one exists, so nothing is silently
// overwritten. An edit names the text it changes instead, so it applies on
// top of whatever version is newest. Callers never see how versions are
// stored. A memory belongs to its project's user: every function takes the
// owner first, so another user's project reads as an empty memory with no
// history, and nothing is written to it.
import { and, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { memoryVersionOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import {
  memoryVersions,
  RETIRED_BUDDY_AUTHOR,
} from "@/db/tables/memory-versions.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ProjectId, UserId } from "@/ids.ts";
import {
  EMPTY_MEMORY,
  MEMORY_AUTHORS,
  MEMORY_VERSION_NUMBER,
  type Memory,
  type MemoryAuthor,
  type MemoryVersion,
  type MemoryVersionNumber,
} from "@/memory/memory.ts";
import {
  applyMemoryEdit,
  type MemoryEdit,
  type MemoryEditFailure,
} from "@/memory/memory-edit.ts";
import {
  type NextMemoryVersion,
  selectNextMemoryVersion,
} from "@/memory/next-memory-version.ts";

// A save or a restore: saved as the newest version, or refused because the
// memory has a version newer than the one it was based on, which it returns.
type MemoryWriteResult =
  | { readonly kind: "saved"; readonly memory: Memory }
  | { readonly kind: "outdated"; readonly memory: Memory };

// An edit: saved as the newest version, or failed, leaving the memory as it
// is.
type MemoryEditResult =
  | { readonly kind: "saved"; readonly memory: Memory }
  | {
      readonly kind: "failed";
      readonly reason: MemoryEditFailure;
      readonly memory: Memory;
    };

// Whose memory and which edit, for editMemory.
interface MemoryEditRequest {
  readonly projectId: ProjectId;
  readonly edit: MemoryEdit;
  readonly author: MemoryAuthor;
}

const MEMORY_VERSION_ROW = z.object({
  version: z.number().positive().pipe(MEMORY_VERSION_NUMBER),
  text: z.string(),
  author: z.union([
    z.enum(MEMORY_AUTHORS),
    z.literal(RETIRED_BUDDY_AUTHOR).transform((): MemoryAuthor => "buddy"),
  ]),
  createdAt: z.date(),
});

// How many times an edit is applied to the newest version when other writes
// keep landing between reading the memory and saving the edit.
const EDIT_ATTEMPTS = 5;

// Rows as versions. A row that the table's constraints should have kept out
// is skipped.
function toMemoryVersions(rows: readonly unknown[]): MemoryVersion[] {
  return rows.flatMap((row) => {
    const parsed = MEMORY_VERSION_ROW.safeParse(row);
    if (parsed.success) {
      return [parsed.data];
    }
    return [];
  });
}

function toMemory({ text, version }: Memory): Memory {
  return { text, version };
}

// Inserts the next version, if selectNextMemoryVersion yields it and no
// other write took the version first.
async function insertNextVersion(
  operation: string,
  next: NextMemoryVersion,
): Promise<Memory | undefined> {
  const [saved] = await withAppErrors(operation, async () =>
    toMemoryVersions(
      await getDb()
        .insert(memoryVersions)
        .select(selectNextMemoryVersion(next))
        .onConflictDoNothing()
        .returning(),
    ),
  );
  if (saved === undefined) {
    return undefined;
  }
  return toMemory(saved);
}

// The owner's project's versions.
function projectVersions(owner: UserId, projectId: ProjectId): SQL | undefined {
  return and(
    eq(memoryVersions.projectId, projectId),
    memoryVersionOwnedBy(owner),
  );
}

// The project's newest memory, or the empty memory if nothing is saved.
async function readMemory(
  owner: UserId,
  projectId: ProjectId,
): Promise<Memory> {
  const [newest] = await withAppErrors("readMemory", async () =>
    toMemoryVersions(
      await getDb()
        .select()
        .from(memoryVersions)
        .where(projectVersions(owner, projectId))
        .orderBy(desc(memoryVersions.version))
        .limit(1),
    ),
  );
  if (newest === undefined) {
    return EMPTY_MEMORY;
  }
  return toMemory(newest);
}

// Every saved version of the project's memory, newest first.
function readMemoryHistory(
  owner: UserId,
  projectId: ProjectId,
): Promise<MemoryVersion[]> {
  return withAppErrors("readMemoryHistory", async () =>
    toMemoryVersions(
      await getDb()
        .select()
        .from(memoryVersions)
        .where(projectVersions(owner, projectId))
        .orderBy(desc(memoryVersions.version)),
    ),
  );
}

// Saves text as the project's newest memory, unless a version newer than
// basedOn exists. Text equal to basedOn's is saved already, so it writes
// nothing and returns the memory as it is.
async function saveMemory(
  owner: UserId,
  {
    projectId,
    text,
    basedOn,
    author,
  }: {
    readonly projectId: ProjectId;
    readonly text: string;
    readonly basedOn: MemoryVersionNumber;
    readonly author: MemoryAuthor;
  },
): Promise<MemoryWriteResult> {
  const saved = await insertNextVersion("saveMemory", {
    owner,
    projectId,
    basedOn,
    author,
    text: { kind: "new", text },
  });
  if (saved !== undefined) {
    return { kind: "saved", memory: saved };
  }
  const memory = await readMemory(owner, projectId);
  if (memory.version === basedOn && memory.text === text) {
    return { kind: "saved", memory };
  }
  return { kind: "outdated", memory };
}

// Saves the text of an earlier version as the project's newest memory,
// unless a version newer than basedOn exists. Every version stays. Unlike
// saveMemory, a restore always writes a new version, even when the text
// equals the newest one's, because a restore is an explicit action and the
// history records it. Undefined if the project has no such version.
async function restoreMemoryVersion(
  owner: UserId,
  {
    projectId,
    version,
    basedOn,
    author,
  }: {
    readonly projectId: ProjectId;
    readonly version: MemoryVersionNumber;
    readonly basedOn: MemoryVersionNumber;
    readonly author: MemoryAuthor;
  },
): Promise<MemoryWriteResult | undefined> {
  const saved = await insertNextVersion("restoreMemoryVersion", {
    owner,
    projectId,
    basedOn,
    author,
    text: { kind: "copy", version },
  });
  if (saved !== undefined) {
    return { kind: "saved", memory: saved };
  }
  const memory = await readMemory(owner, projectId);
  if (memory.version !== basedOn) {
    return { kind: "outdated", memory };
  }
  return undefined;
}

// One attempt at an edit, then, if another write landed first, another on
// top of that write. Undefined if the save was refused with no newer
// version written: the project is not the owner's.
async function editNewestMemory(
  owner: UserId,
  { projectId, edit, author }: MemoryEditRequest,
  attemptsLeft: number,
): Promise<MemoryEditResult | undefined> {
  const memory = await readMemory(owner, projectId);
  const outcome = applyMemoryEdit(memory.text, edit);
  if (outcome.kind === "failed") {
    return { kind: "failed", reason: outcome.reason, memory };
  }
  const result = await saveMemory(owner, {
    projectId,
    text: outcome.text,
    basedOn: memory.version,
    author,
  });
  if (result.kind === "saved") {
    return result;
  }
  if (result.memory.version === memory.version) {
    return undefined;
  }
  if (attemptsLeft <= 1) {
    throw new Error(
      `The memory kept changing during ${EDIT_ATTEMPTS} attempts to edit it`,
    );
  }
  return editNewestMemory(owner, { projectId, edit, author }, attemptsLeft - 1);
}

// Applies the edit to the project's newest memory and saves the result. A
// write that lands first is kept: the edit is applied again on top of it, and
// fails if the text it changes is gone. Undefined if the owner has no such
// project, after one attempt, as an unknown or another user's project saves
// nothing.
function editMemory(
  owner: UserId,
  request: MemoryEditRequest,
): Promise<MemoryEditResult | undefined> {
  return withAppErrors("editMemory", () =>
    editNewestMemory(owner, request, EDIT_ATTEMPTS),
  );
}

export type { MemoryEditRequest, MemoryEditResult, MemoryWriteResult };
export {
  editMemory,
  readMemory,
  readMemoryHistory,
  restoreMemoryVersion,
  saveMemory,
};
