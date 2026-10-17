// Stand-ins for next/server in a server test that replies in a chat. Next's
// own `after()` throws outside a request scope, which a server test has none
// of, and `connection()` waits for a request. A test file that calls
// POST /api/chat replaces the module with these, keeping the rest:
//   vi.mock("next/server", async (importOriginal) => {
//     const kit = await import("@/chats/next-server-test-kit.ts");
//     return {
//       ...(await importOriginal<typeof import("next/server")>()),
//       after: kit.after,
//       connection: kit.connection,
//     };
//   });
// This module imports nothing of the app's, so the factory can import it
// while the route is still loading. After each test it awaits every task,
// before the setup file (vitest.server-setup.ts) deletes the test's users,
// so no task outlives its test.
import type * as nextServer from "next/server";
import { afterEach } from "vitest";

// A promise, or a callback to run, as after() takes it.
type AfterTask = Parameters<typeof nextServer.after>[0];

// The tasks after() was given and settleAfterTasks hasn't awaited yet.
const pendingTasks: Promise<unknown>[] = [];

// next/server's after(): it runs the task at once, as Next runs it once the
// response is sent, and keeps it for settleAfterTasks.
function after(task: AfterTask): void {
  if (typeof task === "function") {
    pendingTasks.push(Promise.resolve().then(task));
  } else {
    pendingTasks.push(task);
  }
}

// next/server's connection(), which has no request to wait for.
function connection(): Promise<void> {
  return Promise.resolve();
}

// Resolves once every task after() was given has ended, including the tasks
// they give it while this waits, such as naming the chat once its reply is
// saved. Rejects with the first task's failure, if any failed.
async function settleAfterTasks(): Promise<void> {
  const tasks = pendingTasks.splice(0);
  if (tasks.length === 0) {
    return;
  }
  const settled = await Promise.allSettled(tasks);
  await settleAfterTasks();
  const failed = settled.find(
    (outcome): outcome is PromiseRejectedResult =>
      outcome.status === "rejected",
  );
  if (failed !== undefined) {
    throw failed.reason;
  }
}

// Registered after the setup file's afterEach, so it runs before it.
afterEach(settleAfterTasks);

export { after, connection, settleAfterTasks };
