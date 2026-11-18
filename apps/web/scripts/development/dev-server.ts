import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { setInterval } from "node:timers/promises";

const NEXT_SERVER_TITLE = "next-server (v";
const SHUTDOWN_TIMEOUT_MS = 5000;
const EXIT_CHECK_INTERVAL_MS = 50;

function lockPid(webRoot: string): number | undefined {
  try {
    // Next writes its server PID to the lock in the development output directory.
    const lock: unknown = JSON.parse(
      readFileSync(join(webRoot, ".next/dev/lock"), "utf8"),
    );
    if (typeof lock === "object" && lock !== null && "pid" in lock) {
      const { pid } = lock;
      if (typeof pid === "number" && Number.isSafeInteger(pid) && pid > 1) {
        return pid;
      }
    }
  } catch (error) {
    if (
      !(
        error instanceof SyntaxError ||
        (error instanceof Error && "code" in error && error.code === "ENOENT")
      )
    ) {
      throw error;
    }
  }
  return undefined;
}

function isCheckoutServer(pid: number, webRoot: string): boolean {
  const title = spawnSync("ps", ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  }).stdout;
  if (!title?.trim().startsWith(NEXT_SERVER_TITLE)) {
    return false;
  }
  const cwd = realpathSync(webRoot);
  if (process.platform === "linux") {
    try {
      return realpathSync(`/proc/${pid}/cwd`) === cwd;
    } catch {
      return false;
    }
  }
  const result = spawnSync(
    "lsof",
    ["-a", "-p", String(pid), "-d", "cwd", "-Fn"],
    {
      encoding: "utf8",
    },
  );
  return result.stdout?.split("\n").includes(`n${cwd}`) === true;
}

function signalServer(pid: number, signal: NodeJS.Signals | 0): boolean {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") {
      return false;
    }
    throw error;
  }
}

async function stopDevelopmentServer(webRoot: string): Promise<void> {
  const pid = lockPid(webRoot);
  // A stale lock can name a PID that now belongs to another process.
  if (pid === undefined || !isCheckoutServer(pid, webRoot)) {
    return;
  }
  if (!signalServer(pid, "SIGTERM")) {
    return;
  }
  console.log("Stopping this checkout's development server before npm ci...");
  const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
  for await (const _ of setInterval(EXIT_CHECK_INTERVAL_MS)) {
    if (!signalServer(pid, 0)) {
      break;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        "The development server is still shutting down. Run mise setup again after it stops.",
      );
    }
  }
}

export { stopDevelopmentServer };
