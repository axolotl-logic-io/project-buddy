// Each project's memory: one Markdown text that every chat in the project
// shares, with every version kept. A project with nothing saved has an empty
// memory at version 0. Writes are optimistic: a save names the version it was
// based on and is refused if a newer one exists, so nothing is silently
// overwritten. A change, such as an edit that names the text it changes,
// applies on top of whatever version is newest instead. Callers never see how versions are
// stored. A memory is open to everyone in its project, its owner and its
// members: every function takes the acting user first, so a project not
// open to them reads as an empty memory with no history, and nothing is
// written to it.
import { and, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { memoryVersionOpenTo } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { memoryVersions } from "@/db/tables/memory-versions.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ProjectId, parseUserId, type UserId } from "@/ids.ts";
import {
  EMPTY_MEMORY,
  MEMORY_AUTHORS,
  MEMORY_VERSION_NUMBER,
  type Memory,
  type MemoryAuthor,
  type MemorySaver,
  type MemoryVersion,
  type MemoryVersionNumber,
} from "@/memory/memory.ts";
import {
  applyMemoryEdit,
  type MemoryEdit,
  type MemoryEditFailure,
  type MemoryEditOutcome,
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

// A change to a memory's text: the changed text, or why it can't be made to
// this text. It may be applied more than once, each time to a newer text.
type MemoryChange = (text: string) => MemoryEditOutcome;

// Whose memory and which change, for changeMemory.
interface MemoryChangeRequest {
  readonly projectId: ProjectId;
  readonly change: MemoryChange;
  readonly author: MemoryAuthor;
}

const MEMORY_ROW = z.object({
  version: z.number().positive().pipe(MEMORY_VERSION_NUMBER),
  text: z.string(),
});

// A version as the history reads it, with the person who saved it.
const MEMORY_VERSION_ROW = MEMORY_ROW.extend({
  author: z.enum(MEMORY_AUTHORS),
  createdAt: z.date(),
  saverId: z.string().nullable(),
  saverName: z.string().nullable(),
  saverEmail: z.string().nullable(),
});

// How many times an edit is applied to the newest version when other writes
// keep landing between reading the memory and saving the edit.
const EDIT_ATTEMPTS = 5;

// Rows as memories. A row that the table's constraints should have kept out
// is skipped.
function toMemories(rows: readonly unknown[]): Memory[] {
  return rows.flatMap((row) => {
    const parsed = MEMORY_ROW.safeParse(row);
    if (parsed.success) {
      return [parsed.data];
    }
    return [];
  });
}

// Who saved a version, as viewer sees them: themself, or another person by
// name, or by email address when they have none. No one on the buddy's
// versions, or when no saver was recorded.
function saverOf(
  viewer: UserId,
  {
    author,
    saverId,
    saverName,
    saverEmail,
  }: z.infer<typeof MEMORY_VERSION_ROW>,
): MemorySaver | undefined {
  const id = parseUserId(saverId ?? "");
  if (author === "buddy" || id === undefined) {
    return undefined;
  }
  if (id === viewer) {
    return { kind: "viewer" };
  }
  const name = saverName ?? saverEmail;
  if (name === null) {
    return undefined;
  }
  return { kind: "person", name };
}

// Rows as viewer's history. A row that the table's constraints should have
// kept out is skipped.
function toMemoryVersions(
  viewer: UserId,
  rows: readonly unknown[],
): MemoryVersion[] {
  return rows.flatMap((row) => {
    const parsed = MEMORY_VERSION_ROW.safeParse(row);
    if (!parsed.success) {
      return [];
    }
    const { version, text, author, createdAt } = parsed.data;
    return [
      {
        version,
        text,
        author,
        savedBy: saverOf(viewer, parsed.data),
        createdAt,
      },
    ];
  });
}

// Inserts the next version, if selectNextMemoryVersion yields it and no
// other write took the version first.
async function insertNextVersion(
  operation: string,
  next: NextMemoryVersion,
): Promise<Memory | undefined> {
  const [saved] = await withAppErrors(operation, async () =>
    toMemories(
      await getDb()
        .insert(memoryVersions)
        .select(selectNextMemoryVersion(next))
        .onConflictDoNothing()
        .returning(),
    ),
  );
  return saved;
}

// The owner's project's versions.
function projectVersions(owner: UserId, projectId: ProjectId): SQL | undefined {
  return and(
    eq(memoryVersions.projectId, projectId),
    memoryVersionOpenTo(owner),
  );
}

// The project's newest memory, or the empty memory if nothing is saved.
async function readMemory(
  owner: UserId,
  projectId: ProjectId,
): Promise<Memory> {
  const [newest] = await withAppErrors("readMemory", async () =>
    toMemories(
      await getDb()
        .select()
        .from(memoryVersions)
        .where(projectVersions(owner, projectId))
        .orderBy(desc(memoryVersions.version))
        .limit(1),
    ),
  );
  return newest ?? EMPTY_MEMORY;
}

// Every saved version of the project's memory, newest first, each with who
// saved it as the owner (the acting user) sees them.
function readMemoryHistory(
  owner: UserId,
  projectId: ProjectId,
): Promise<MemoryVersion[]> {
  return withAppErrors("readMemoryHistory", async () =>
    toMemoryVersions(
      owner,
      await getDb()
        .select({
          version: memoryVersions.version,
          text: memoryVersions.text,
          author: memoryVersions.author,
          createdAt: memoryVersions.createdAt,
          saverId: memoryVersions.userId,
          saverName: users.name,
          saverEmail: users.email,
        })
        .from(memoryVersions)
        .leftJoin(users, eq(users.id, memoryVersions.userId))
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

// One attempt at a change, then, if another write landed first, another on
// top of that write. Undefined if the save was refused with no newer
// version written: the project is not the owner's.
async function changeNewestMemory(
  owner: UserId,
  { projectId, change, author }: MemoryChangeRequest,
  attemptsLeft: number,
): Promise<MemoryEditResult | undefined> {
  const memory = await readMemory(owner, projectId);
  const outcome = change(memory.text);
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
      `The memory kept changing during ${EDIT_ATTEMPTS} attempts to change it`,
    );
  }
  return changeNewestMemory(
    owner,
    { projectId, change, author },
    attemptsLeft - 1,
  );
}

// Applies the change to the project's newest memory and saves the result. A
// write that lands first is kept: the change is applied again on top of it,
// and fails if it no longer can be made. Undefined if the owner has no such
// project, after one attempt, as an unknown or another user's project saves
// nothing.
function changeMemory(
  owner: UserId,
  request: MemoryChangeRequest,
): Promise<MemoryEditResult | undefined> {
  return withAppErrors("changeMemory", () =>
    changeNewestMemory(owner, request, EDIT_ATTEMPTS),
  );
}

// Applies the edit to the project's newest memory, as changeMemory does, and
// fails if the text it changes is gone.
function editMemory(
  owner: UserId,
  { projectId, edit, author }: MemoryEditRequest,
): Promise<MemoryEditResult | undefined> {
  return changeMemory(owner, {
    projectId,
    author,
    change: (text: string): MemoryEditOutcome => applyMemoryEdit(text, edit),
  });
}

export type {
  MemoryChange,
  MemoryChangeRequest,
  MemoryEditRequest,
  MemoryEditResult,
  MemoryWriteResult,
};
export {
  changeMemory,
  editMemory,
  readMemory,
  readMemoryHistory,
  restoreMemoryVersion,
  saveMemory,
};
