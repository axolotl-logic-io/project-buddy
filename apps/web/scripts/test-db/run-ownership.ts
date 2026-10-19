// Durable local ownership journal and conservative recovery. A journal is
// evidence for refusal/recovery only, never authority to signal a saved PID.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process, { kill, pid as processId } from "node:process";
import { z } from "zod";
import {
  checkTestDatabase,
  dropTestDatabase,
  dropUnusedRunDatabases,
  listServerDatabases,
  type TestDatabase,
} from "./test-database.ts";

const NO_PROCESS = "ESRCH";
const PROCESS_BUFFER_BYTES = 4_194_304;
const PERMISSIONS_RADIX = 8;
// Whether the process with this id is running, as the operating system says.
function isProcessAlive(id: number): boolean {
  if (id === 1) {
    return true;
  }
  try {
    kill(id, 0);
    return true;
  } catch (error) {
    // Only ESRCH proves death. Permission failures and unknown OS errors
    // cannot authorize a destructive cleanup.
    return !(
      error instanceof Error &&
      "code" in error &&
      error.code === NO_PROCESS
    );
  }
}

// The database called name, on the same server as database.
function databaseBeside(database: TestDatabase, name: string): TestDatabase {
  const url = new URL(database.url);
  url.pathname = `/${name}`;
  return checkTestDatabase(url.href);
}

// Group snapshots are used only to WAIT/REFUSE cleanup, never as signalling
// authority. A sentinel signals its own, still-anchored group, not these PIDs.
interface LiveProcess {
  readonly pid: number;
  readonly pgid: number;
}
// One bounded OS query per cleanup observation, irrespective of group count.
function liveProcesses(): readonly LiveProcess[] {
  const inspector = spawnSync("ps", ["-A", "-o", "pid=,pgid=,stat="], {
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: PROCESS_BUFFER_BYTES,
  });
  if (
    inspector.error !== undefined ||
    inspector.status !== 0 ||
    inspector.stdout.trim() === ""
  ) {
    throw new Error("Cannot establish process group disappearance.", {
      cause: inspector.error,
    });
  }
  return inspector.stdout
    .trim()
    .split("\n")
    .map((line) => PROCESS_STATE.parse(PROCESS_ROW.exec(line)?.groups))
    .filter((row) => row.pid !== inspector.pid && !row.status.startsWith("Z"));
}
function groupHasProcesses(group: number, exclude?: number): boolean {
  return liveProcesses().some(
    ({ pid, pgid }) => pgid === group && pid !== exclude,
  );
}
function invocationProcessesRemain(
  members: ReadonlyMap<number, boolean>,
): boolean {
  if ([...members.keys()].some(isProcessAlive)) {
    return true;
  }
  if (![...members.values()].includes(true)) {
    return false;
  }
  const groups = new Set(liveProcesses().map(({ pgid }) => pgid));
  return [...members].some(([pid, group]) => group && groups.has(pid));
}
const PROCESS_ROW = /^\s*(?<pid>\d+)\s+(?<pgid>\d+)\s+(?<status>\S+)\s*$/u;
const PROCESS_STATE = z.object({
  pid: z.coerce.number().int().positive(),
  pgid: z.coerce.number().int().nonnegative(),
  status: z.string().min(1),
});
const BASE_NAME = /^project_buddy_e2e_[1-9]\d{0,9}_[\da-f]{8}$/u;
const MEMBER = z.object({
  pid: z.number().int().positive(),
  group: z.boolean(),
});
const RECORD = z.object({
  owner: z.number().int().positive(),
  server: z.string(),
  name: z.string(),
  created: z.boolean(),
});
const PRIVATE_MODE = 0o700;
const FILE_MODE = 0o600;

async function ownershipDirectory(): Promise<string> {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error("The test wrapper requires macOS or Linux/POSIX.");
  }
  const path = join(tmpdir(), `pb-test-runs-${uid}`);
  await mkdir(path, { recursive: true, mode: PRIVATE_MODE });
  const info = await lstat(path);
  if (
    !info.isDirectory() ||
    info.uid !== uid ||
    !info.mode.toString(PERMISSIONS_RADIX).endsWith("00")
  ) {
    throw new Error(
      "Test run ownership directory must be private and owned by this user.",
    );
  }
  return path;
}

function serverKey(database: TestDatabase): string {
  const url = new URL(database.url);
  url.pathname = "/";
  url.password = "";
  url.search = "";
  return createHash("sha256").update(url.href).digest("hex");
}

interface RunOwnership {
  readonly register: (pid: number, group: boolean) => Promise<void>;
  readonly reserve: (database: TestDatabase) => Promise<void>;
  readonly created: () => Promise<void>;
  readonly remove: () => Promise<void>;
}

// The journal is written before a child gets permission to execute. No URL or
// environment is stored. Missing/corrupt journals never authorize recovery.
async function createRunOwnership(): Promise<RunOwnership> {
  await ownershipDirectory();
  const members = new Map<number, boolean>([[processId, false]]);
  let path: string | undefined;
  let record: z.infer<typeof RECORD> | undefined;
  async function register(pid: number, group: boolean): Promise<void> {
    MEMBER.parse({ pid, group });
    members.set(pid, group);
    if (path !== undefined) {
      await writeFile(join(path, `${pid}`), JSON.stringify({ pid, group }), {
        mode: FILE_MODE,
      });
    }
  }
  return {
    register,
    reserve: async (database: TestDatabase): Promise<void> => {
      path = join(await ownershipDirectory(), database.name);
      await mkdir(path, { mode: PRIVATE_MODE });
      record = {
        owner: processId,
        server: serverKey(database),
        name: database.name,
        created: false,
      };
      await writeFile(join(path, "record"), JSON.stringify(record), {
        flag: "wx",
        mode: FILE_MODE,
      });
      await Promise.all(
        [...members].map(([pid, group]) => register(pid, group)),
      );
    },
    created: async (): Promise<void> => {
      if (path === undefined || record === undefined) {
        throw new Error("Database ownership was not reserved.");
      }
      record = { ...record, created: true };
      await writeFile(join(path, "record"), JSON.stringify(record), {
        mode: FILE_MODE,
      });
    },
    remove: async (): Promise<void> => {
      if (path !== undefined) {
        await rm(path, { recursive: true });
      }
    },
  };
}

async function dropRunDatabases(database: TestDatabase): Promise<void> {
  const names = await listServerDatabases(database);
  await Promise.all(
    names
      .filter(
        (name) =>
          name === database.name || name.startsWith(`${database.name}_`),
      )
      .map((name) => dropTestDatabase(databaseBeside(database, name))),
  );
}

async function journalProvesAbandonment(
  path: string,
  name: string,
  database: TestDatabase,
): Promise<boolean> {
  try {
    const record = RECORD.parse(
      JSON.parse(await readFile(join(path, "record"), "utf8")),
    );
    if (
      isProcessAlive(record.owner) ||
      !record.created ||
      record.name !== name ||
      record.server !== serverKey(database)
    ) {
      return false;
    }
    const files = (await readdir(path)).filter((file) => file !== "record");
    if (!files.includes(`${record.owner}`)) {
      return false;
    }
    const members = await Promise.all(
      files.map(async (file) =>
        MEMBER.parse(JSON.parse(await readFile(join(path, file), "utf8"))),
      ),
    );
    return !invocationProcessesRemain(
      new Map(members.map(({ pid, group }) => [pid, group])),
    );
  } catch {
    // Missing, ambiguous or concurrently recovered journals never authorize DROP.
    return false;
  }
}
async function recoverAbandonedDatabases(
  database: TestDatabase,
): Promise<void> {
  const directory = await ownershipDirectory();
  const names = (await readdir(directory)).filter((name) =>
    BASE_NAME.test(name),
  );
  await Promise.all(
    names.map(async (name) => {
      if (
        await journalProvesAbandonment(join(directory, name), name, database)
      ) {
        await dropUnusedRunDatabases(databaseBeside(database, name));
      }
    }),
  );
}

export type { RunOwnership };
export {
  createRunOwnership,
  dropRunDatabases,
  groupHasProcesses,
  invocationProcessesRemain,
  isProcessAlive,
  recoverAbandonedDatabases,
};
