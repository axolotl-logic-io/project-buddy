// next/server's `after()` in server tests. Next's own throws outside a
// request's scope, which a server test that calls a route handler or Server
// Action has none of. This one starts each task at once and keeps its
// promise, so a test can await afterTasksDone() before it reads what the
// tasks save, such as a chat reply, and the setup file (vitest.server-setup.ts)
// awaits it before cleanup, so no task outlives its test.

// What `after()` takes: a task to run, or a promise already running.
type AfterTask<Result> = Promise<Result> | (() => Result | Promise<Result>);

// The tasks started and not yet awaited by afterTasksDone, each settled
// rather than rejected: a task that failed doesn't fail its test, as the app
// logs its own failures, and isn't reported as an unhandled rejection.
const pending: Promise<void>[] = [];

function ignoreOutcome(): void {
  // Only that the task has settled matters.
}

// The task, running.
function run<Result>(task: AfterTask<Result>): Promise<Result> {
  if (typeof task === "function") {
    return Promise.resolve().then(task);
  }
  return task;
}

// Runs task now, and keeps it for afterTasksDone.
function after<Result>(task: AfterTask<Result>): void {
  pending.push(run(task).then(ignoreOutcome, ignoreOutcome));
}

// Settles once every task started so far, and any they start, has settled.
async function afterTasksDone(): Promise<void> {
  const started = pending.splice(0);
  if (started.length === 0) {
    return;
  }
  await Promise.all(started);
  await afterTasksDone();
}

export { after, afterTasksDone };
