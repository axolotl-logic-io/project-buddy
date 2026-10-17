// next/server's after() for server tests that drive a route handler, which
// has no request for Next to run after() in. It keeps each task, and
// finishAfterTasks waits for them, as Next does once the response is sent.
// It imports nothing from the app, so a vi.mock factory can import it.
import type { after as nextAfter } from "next/server";

// The tasks after() has been given and finishAfterTasks hasn't awaited.
const pendingTasks: unknown[] = [];

// Keeps task, a promise or a function to call now, as after() runs it.
function after(task: Parameters<typeof nextAfter>[0]): void {
  if (typeof task === "function") {
    pendingTasks.push(task());
  } else {
    pendingTasks.push(task);
  }
}

// Waits for every task after() has been given, and for the tasks those
// tasks give it in turn, until none is left: a saved reply schedules the
// chat's naming from inside its own task.
async function finishAfterTasks(): Promise<void> {
  if (pendingTasks.length === 0) {
    return;
  }
  await Promise.all(pendingTasks.splice(0));
  await finishAfterTasks();
}

export { after, finishAfterTasks };
