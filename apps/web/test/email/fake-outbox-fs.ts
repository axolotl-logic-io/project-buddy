// An in-memory stand-in for node:fs/promises, for the tests of the e2e outbox
// (src/email/outbox.ts), which mount it with
//   vi.mock("node:fs/promises", () => import("./fake-outbox-fs.ts"));
// It keeps folders and files in maps and fails as the real one does: writing
// into a missing folder, making a folder that exists or whose parent is
// missing without `recursive`, and renaming a missing file all reject. The
// tests then check what is on the "disk", not which calls were made.

// The files, by path, and the folders, starting with the root.
const files = new Map<string, string>();
const folders = new Set<string>(["/"]);

// A write that holdNextWrite holds: begin marks it started, and it waits
// for released.
interface PendingHold {
  readonly begin: () => void;
  readonly released: Promise<undefined>;
}

// The holds for the next writes, in order.
const pendingHolds: PendingHold[] = [];

interface MkdirOptions {
  readonly recursive?: boolean;
}

// A held write: started settles once the write has begun, and release lets
// it finish.
interface HeldWrite {
  readonly started: Promise<undefined>;
  readonly release: () => void;
}

function parentOf(path: string): string {
  const parent = path.slice(0, path.lastIndexOf("/"));
  if (parent === "") {
    return "/";
  }
  return parent;
}

function failure(code: string, path: string): Error {
  return Object.assign(new Error(`${code}: ${path}`), { code });
}

function mkdir(path: string, options: MkdirOptions = {}): Promise<undefined> {
  if (options.recursive === true) {
    for (let folder = path; !folders.has(folder); folder = parentOf(folder)) {
      folders.add(folder);
    }
    return Promise.resolve(undefined);
  }
  if (folders.has(path)) {
    return Promise.reject(failure("EEXIST", path));
  }
  if (!folders.has(parentOf(path))) {
    return Promise.reject(failure("ENOENT", path));
  }
  folders.add(path);
  return Promise.resolve(undefined);
}

async function writeFile(path: string, data: string): Promise<void> {
  if (!folders.has(parentOf(path))) {
    throw failure("ENOENT", path);
  }
  // A reader can see a created/truncated destination with incomplete bytes
  // before writeFile resolves; only rename publishes a whole email at once.
  files.set(path, data.slice(0, Math.floor(data.length / 2)));
  const hold = pendingHolds.shift();
  if (hold !== undefined) {
    hold.begin();
    await hold.released;
  }
  files.set(path, data);
}

function rename(from: string, to: string): Promise<void> {
  const data = files.get(from);
  if (data === undefined) {
    return Promise.reject(failure("ENOENT", from));
  }
  if (!folders.has(parentOf(to))) {
    return Promise.reject(failure("ENOENT", to));
  }
  files.delete(from);
  files.set(to, data);
  return Promise.resolve();
}

// Holds the next write after its destination has incomplete content.
function holdNextWrite(): HeldWrite {
  const started = Promise.withResolvers<undefined>();
  const released = Promise.withResolvers<undefined>();
  pendingHolds.push({
    begin: (): void => {
      started.resolve(undefined);
    },
    released: released.promise,
  });
  return {
    started: started.promise,
    release: (): void => {
      released.resolve(undefined);
    },
  };
}

// The paths of the files in folder, sorted.
function filesIn(folder: string): readonly string[] {
  return [...files.keys()]
    .filter((path) => parentOf(path) === folder)
    .sort((one, other) => one.localeCompare(other));
}

// What the file at path holds, or undefined when there is none.
function readFakeFile(path: string): string | undefined {
  return files.get(path);
}

// Empties the disk, back to the root folder alone.
function resetFakeDisk(): void {
  files.clear();
  folders.clear();
  folders.add("/");
  pendingHolds.length = 0;
}

export {
  filesIn,
  holdNextWrite,
  mkdir,
  readFakeFile,
  rename,
  resetFakeDisk,
  writeFile,
};
