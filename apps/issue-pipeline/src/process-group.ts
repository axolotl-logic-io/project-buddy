// How the pipeline ends a process tree: through the process group its
// leader started (`spawn` with `detached: true`, whose pid is the group's
// id), so the leader's children end with it (commands-leave-no-processes,
// #371). `endGroup` sends SIGTERM to the whole group, waits for it to exit
// and sends SIGKILL to what is left after the grace. A group that is
// already gone counts as ended, so none of these has an error case.
// `endLeaderGroup` does the same for a child's group only while the child,
// its leader, runs: once the leader has been reaped, its pid and the
// group's id are free, and on a busy machine pids wrap within minutes, so
// the id may already lead another process's group.

import type { ChildProcess } from "node:child_process";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

// How often groupEnded looks at the group again.
const POLL_MS = 20;
const PID_LINE = /^\d+$/u;

// The signals endGroup sent, in order.
type GroupSignals = ["SIGTERM"] | ["SIGTERM", "SIGKILL"];

function errnoOf(error: unknown): string | undefined {
  if (error instanceof Error && "code" in error) {
    return String(error.code);
  }
  return undefined;
}

// Sends `signal` to every process in the group `pid` leads. A group that is
// gone (ESRCH), or that this process may not signal (EPERM), is left alone.
function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch (error: unknown) {
    const code = errnoOf(error);
    if (code !== "ESRCH" && code !== "EPERM") {
      throw error;
    }
  }
}

// Whether any process is still in the group `pid` leads. macOS answers
// EPERM for a group of zombies not yet reaped, which still counts.
function groupAlive(pid: number): boolean {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error: unknown) {
    return errnoOf(error) === "EPERM";
  }
}

// The pids in the group `pid` leads, best effort, from `pgrep -g`: null when
// pgrep fails or lists none.
function groupPids(pid: number): number[] | null {
  const listed = spawnSync("pgrep", ["-g", String(pid)], { encoding: "utf8" });
  const pids = (listed.stdout || "")
    .split("\n")
    .filter((line: string): boolean => PID_LINE.test(line))
    .map(Number);
  if (listed.status !== 0 || pids.length === 0) {
    return null;
  }
  return pids;
}

async function pollEnded(pid: number, deadline: number): Promise<void> {
  if (!groupAlive(pid)) {
    return;
  }
  if (performance.now() >= deadline) {
    throw new Error(`process group ${pid} is still running`);
  }
  await delay(POLL_MS);
  await pollEnded(pid, deadline);
}

// Resolves once the group `pid` leads is empty, its zombies reaped; rejects
// if it isn't within `withinMs`.
function groupEnded(pid: number, withinMs: number): Promise<void> {
  return pollEnded(pid, performance.now() + withinMs);
}

// Whether `promise` fulfils within `ms`.
async function within(promise: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const graceUp = new Promise<boolean>((up: (done: boolean) => void): void => {
    timer = setTimeout((): void => up(false), ms);
  });
  const done = promise.then(
    (): boolean => true,
    (): boolean => false,
  );
  const result = await Promise.race([done, graceUp]);
  clearTimeout(timer);
  return result;
}

// Ends the group `pid` leads: SIGTERM, then SIGKILL unless `exited` fulfils
// within `graceMs`. Resolves to the signals it sent.
async function endGroup(
  pid: number,
  exited: Promise<unknown>,
  graceMs: number,
): Promise<GroupSignals> {
  signalGroup(pid, "SIGTERM");
  if (await within(exited, graceMs)) {
    return ["SIGTERM"];
  }
  signalGroup(pid, "SIGKILL");
  return ["SIGTERM", "SIGKILL"];
}

// Whether `leader` has neither exited nor been killed.
function leaderRunning(leader: ChildProcess): boolean {
  return leader.exitCode === null && leader.signalCode === null;
}

// Ends the group child `leader` leads, as endGroup does, while the leader
// runs: SIGTERM, then SIGKILL unless the leader exits within `graceMs`. A
// leader that has exited, or never started, gets no signal. Resolves to the
// signals it sent.
async function endLeaderGroup(
  leader: ChildProcess,
  graceMs: number,
): Promise<GroupSignals | []> {
  const { pid } = leader;
  if (pid === undefined || !leaderRunning(leader)) {
    return [];
  }
  const exited = once(leader, "exit");
  signalGroup(pid, "SIGTERM");
  if ((await within(exited, graceMs)) || !leaderRunning(leader)) {
    return ["SIGTERM"];
  }
  signalGroup(pid, "SIGKILL");
  return ["SIGTERM", "SIGKILL"];
}

// Ends child `leader`, whose time is up: its group, as endLeaderGroup does,
// while it runs. Once it has exited, its stdout and stderr get `graceMs` to
// close, and are then destroyed, since a process outside its group may hold
// them open, so that the child's close comes.
async function endOverdue(
  leader: ChildProcess,
  graceMs: number,
): Promise<void> {
  const closed = once(leader, "close");
  await endLeaderGroup(leader, graceMs);
  if (!(await within(closed, graceMs))) {
    leader.stdout?.destroy();
    leader.stderr?.destroy();
  }
}

export type { GroupSignals };
export {
  endGroup,
  endLeaderGroup,
  endOverdue,
  groupAlive,
  groupEnded,
  groupPids,
  leaderRunning,
  signalGroup,
  within,
};
