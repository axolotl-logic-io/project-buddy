// Each project's memory: one Markdown text that every chat in the project
// shares, with every version kept. A project with nothing saved has an empty
// memory at version 0. Writes are optimistic: a save names the version it was
// based on and is refused if a newer one exists, so nothing is silently
// overwritten. An edit names the text it changes instead, so it applies on
// top of whatever version is newest. Callers never see how versions are
// stored.
import { desc, eq, type SQL, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ProjectId } from "@/ids.ts";
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
  author: z.enum(MEMORY_AUTHORS),
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

// The project's newest version number, or 0, as SQL.
function newestVersion(projectId: ProjectId): SQL {
  return sql`(select coalesce(max(${memoryVersions.version}), 0) from ${memoryVersions} where ${memoryVersions.projectId} = ${projectId}::uuid)`;
}

// Inserts the row that `select` yields, if any, with its columns in the
// table's order: id, project id, version, text, author, time. It inserts nothing
// when the select matches no row or when another write took the version
// first. The check and the insert are one statement, so no other write can
// land between them.
async function insertVersion(
  operation: string,
  select: SQL,
): Promise<Memory | undefined> {
  const [saved] = await withAppErrors(operation, async () =>
    toMemoryVersions(
      await getDb()
        .insert(memoryVersions)
        .select(select)
        .onConflictDoNothing()
        .returning(),
    ),
  );
  if (saved === undefined) {
    return undefined;
  }
  return toMemory(saved);
}

// The project's newest memory, or the empty memory if nothing is saved.
async function readMemory(projectId: ProjectId): Promise<Memory> {
  const [newest] = await withAppErrors("readMemory", async () =>
    toMemoryVersions(
      await getDb()
        .select()
        .from(memoryVersions)
        .where(eq(memoryVersions.projectId, projectId))
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
function readMemoryHistory(projectId: ProjectId): Promise<MemoryVersion[]> {
  return withAppErrors("readMemoryHistory", async () =>
    toMemoryVersions(
      await getDb()
        .select()
        .from(memoryVersions)
        .where(eq(memoryVersions.projectId, projectId))
        .orderBy(desc(memoryVersions.version)),
    ),
  );
}

// Saves text as the project's newest memory, unless a version newer than
// basedOn exists.
async function saveMemory({
  projectId,
  text,
  basedOn,
  author,
}: {
  readonly projectId: ProjectId;
  readonly text: string;
  readonly basedOn: MemoryVersionNumber;
  readonly author: MemoryAuthor;
}): Promise<MemoryWriteResult> {
  const saved = await insertVersion(
    "saveMemory",
    sql`select gen_random_uuid(), ${projectId}::uuid, ${basedOn}::integer + 1, ${text}::text, ${author}::text, now() where ${newestVersion(projectId)} = ${basedOn}::integer`,
  );
  if (saved !== undefined) {
    return { kind: "saved", memory: saved };
  }
  return { kind: "outdated", memory: await readMemory(projectId) };
}

// Saves the text of an earlier version as the project's newest memory,
// unless a version newer than basedOn exists. Every version stays. Undefined
// if the project has no such version.
async function restoreMemoryVersion({
  projectId,
  version,
  basedOn,
  author,
}: {
  readonly projectId: ProjectId;
  readonly version: MemoryVersionNumber;
  readonly basedOn: MemoryVersionNumber;
  readonly author: MemoryAuthor;
}): Promise<MemoryWriteResult | undefined> {
  const saved = await insertVersion(
    "restoreMemoryVersion",
    sql`select gen_random_uuid(), ${projectId}::uuid, ${basedOn}::integer + 1, ${memoryVersions.text}, ${author}::text, now() from ${memoryVersions} where ${memoryVersions.projectId} = ${projectId}::uuid and ${memoryVersions.version} = ${version}::integer and ${newestVersion(projectId)} = ${basedOn}::integer`,
  );
  if (saved !== undefined) {
    return { kind: "saved", memory: saved };
  }
  const memory = await readMemory(projectId);
  if (memory.version !== basedOn) {
    return { kind: "outdated", memory };
  }
  return undefined;
}

// One attempt at an edit, then, if another write landed first, another on
// top of that write.
async function editNewestMemory(
  { projectId, edit, author }: MemoryEditRequest,
  attemptsLeft: number,
): Promise<MemoryEditResult> {
  const memory = await readMemory(projectId);
  const outcome = applyMemoryEdit(memory.text, edit);
  if (outcome.kind === "failed") {
    return { kind: "failed", reason: outcome.reason, memory };
  }
  const result = await saveMemory({
    projectId,
    text: outcome.text,
    basedOn: memory.version,
    author,
  });
  if (result.kind === "saved") {
    return result;
  }
  if (attemptsLeft <= 1) {
    throw new Error(
      `The memory kept changing during ${EDIT_ATTEMPTS} attempts to edit it`,
    );
  }
  return editNewestMemory({ projectId, edit, author }, attemptsLeft - 1);
}

// Applies the edit to the project's newest memory and saves the result. A
// write that lands first is kept: the edit is applied again on top of it, and
// fails if the text it changes is gone.
function editMemory(request: MemoryEditRequest): Promise<MemoryEditResult> {
  return withAppErrors("editMemory", () =>
    editNewestMemory(request, EDIT_ATTEMPTS),
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
