// Supported spawn containment: a live sentinel anchors each native group.
// Snapshot membership only informs waiting. Signals target self/the live
// sentinel's own group, never a PID retrieved from ps or a journal.
import childProcess, {
  type ChildProcess,
  type SpawnOptions,
  type StdioOptions,
} from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { constants } from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { type TestRunProtocol, testProcessEnvironment } from "../../src/env.ts";
import { groupHasProcesses } from "./run-ownership.ts";
import { rendezvous, waitUntil } from "./run-protocol.ts";

const spawn: typeof childProcess.spawn = childProcess.spawn;
const ENTRY = fileURLToPath(new URL("./run.ts", import.meta.url));
const SENTINEL = "--owned-command";
const FAILED = 1;
const NO_COMMAND = 2;
const SIGNAL_EXIT_BASE = 128;
const KILL_GRACE_MS = 5000;
const STANDARD_FDS = 3;
const MAX_FDS = 32;
function signalStatus(signal: NodeJS.Signals): number {
  return SIGNAL_EXIT_BASE + constants.signals[signal];
}
function isArguments(
  value: readonly string[] | SpawnOptions | undefined,
): value is readonly string[] {
  return Array.isArray(value);
}

// Interpose only spawn: stock Node fork children inherit the preload and must
// register before their module runs. Native browsers/webServer shell commands
// get a sentinel, even when Playwright requests detached:true. No arbitrary
// daemon, environment-stripping or deliberate lifecycle evasion is supported.
function installSpawnProtocol(protocol: TestRunProtocol): void {
  function ownedSpawn(
    file: string,
    argsOrOptions?: readonly string[] | SpawnOptions,
    options?: SpawnOptions,
  ): ChildProcess {
    let args: readonly string[] = [];
    let settings: SpawnOptions = {};
    if (isArguments(argsOrOptions)) {
      args = z.array(z.string()).parse(argsOrOptions);
      settings = options ?? {};
    } else if (argsOrOptions !== undefined) {
      // The Node API overload is the one validated platform boundary.
      settings = argsOrOptions;
    }
    // Shell parsing belongs to the actual command, not to the sentinel's argv.
    let command = file;
    let commandArgs = args;
    const { shell: requestedShell } = settings;
    if (requestedShell) {
      let shell = "/bin/sh";
      if (typeof requestedShell === "string") {
        shell = requestedShell;
      }
      command = shell;
      commandArgs = ["-c", [file, ...args].join(" ")];
    }
    let fdCount = STANDARD_FDS;
    if (Array.isArray(settings.stdio)) {
      fdCount = settings.stdio.length;
    }
    return spawn(
      process.execPath,
      [ENTRY, SENTINEL, `${fdCount}`, command, ...commandArgs],
      {
        ...settings,
        shell: false,
        detached: true,
        env: testProcessEnvironment(protocol, false, settings.env),
      },
    );
  }
  // The native CJS object is the Node extension boundary; update its ESM views
  // too, so neither import spelling can accidentally bypass the protocol.
  Object.defineProperty(childProcess, "spawn", { value: ownedSpawn });
  syncBuiltinESMExports();
}

async function preload(protocol: TestRunProtocol): Promise<void> {
  let stopping = false;
  function stop(): void {
    if (stopping) {
      return;
    }
    stopping = true;
    // Signalling self cannot target a recycled PID. Escalation is self-owned.
    setTimeout(
      () => process.kill(process.pid, "SIGKILL"),
      KILL_GRACE_MS,
    ).unref();
    process.kill(process.pid, "SIGTERM");
  }
  const socket = await rendezvous(protocol, false, stop);
  socket.unref();
  installSpawnProtocol(protocol);
}

function ownedGroupStop(): {
  readonly stop: () => void;
  readonly dispose: () => void;
  readonly isStopping: () => boolean;
} {
  let stopping = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function stop(): void {
    if (stopping) {
      return;
    }
    stopping = true;
    // This process is the live group leader, established by detached spawn.
    // Group identity cannot be recycled while we are executing here.
    process.kill(-process.pid, "SIGTERM");
    timer = setTimeout(
      () => process.kill(-process.pid, "SIGKILL"),
      KILL_GRACE_MS,
    );
  }
  return {
    stop,
    dispose: () => clearTimeout(timer),
    isStopping: () => stopping,
  };
}

function nativeCommand(
  file: string,
  args: readonly string[],
  stdio: StdioOptions,
  protocol: TestRunProtocol,
): Promise<number> {
  const child = spawn(file, args, {
    stdio,
    detached: false,
    env: testProcessEnvironment(protocol, true),
  });
  return new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (status, signal) => {
      if (signal === null) {
        resolve(status ?? FAILED);
      } else {
        resolve(signalStatus(signal));
      }
    });
  });
}

async function ownedCommand(
  protocol: TestRunProtocol,
  line: readonly string[],
): Promise<number> {
  const [, count, file, ...args] = line;
  const fdCount = z.coerce
    .number()
    .int()
    .min(STANDARD_FDS)
    .max(MAX_FDS)
    .parse(count);
  const stdio: StdioOptions = Array.from(
    { length: fdCount },
    (_value, index) => index,
  );
  if (file === undefined) {
    return NO_COMMAND;
  }
  const { stop, dispose, isStopping } = ownedGroupStop();
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  const socket = await rendezvous(protocol, true, stop);
  let groupEmpty = false;
  try {
    if (isStopping()) {
      return FAILED;
    }
    const code = await nativeCommand(file, args, stdio, protocol);
    if (groupHasProcesses(process.pid, process.pid)) {
      stop();
      await waitUntil(
        () => !groupHasProcesses(process.pid, process.pid),
        "Owned process group shutdown",
        KILL_GRACE_MS,
      );
    }
    groupEmpty = true;
    return code;
  } finally {
    if (groupEmpty) {
      dispose();
    } else {
      stop();
    }
    socket.end();
    process.off("SIGTERM", stop);
    process.off("SIGINT", stop);
  }
}

export { ownedCommand, preload, SENTINEL };
