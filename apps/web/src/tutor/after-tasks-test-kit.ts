// For server tests that call POST /api/chat: stand-ins for next/server's
// `after()` and `connection()`, which Next's own throw or wait outside a
// request. A test file replaces the module with it:
//   vi.mock("next/server", () => import("@/tutor/after-tasks-test-kit.ts"));
// and awaits finishAfterTasks() before reading what a reply saved. It
// imports nothing from the app, so the mock can load it first.

// The tasks after() was given and no one has awaited yet.
const keptTasks: Promise<unknown>[] = [];

// next/server's after(): runs a function at once, or keeps a promise, as a
// task finishAfterTasks awaits.
function after(task: Promise<unknown> | (() => unknown)): void {
  if (typeof task === "function") {
    keptTasks.push(Promise.resolve().then(task));
    return;
  }
  keptTasks.push(task);
}

// next/server's connection(): a server test has no request to wait for.
function connection(): Promise<void> {
  return Promise.resolve();
}

// Waits for every task after() was given, and for the tasks those tasks
// gave it in turn, until none is left. Rejects if one of them failed.
async function finishAfterTasks(): Promise<void> {
  if (keptTasks.length === 0) {
    return;
  }
  await Promise.all(keptTasks.splice(0));
  await finishAfterTasks();
}

export { after, connection, finishAfterTasks };
