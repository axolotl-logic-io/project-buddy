// CLI and preload entry for the bounded stock test-command lifecycle.
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { constants } from "node:os";
import process, { argv } from "node:process";
import { fileURLToPath } from "node:url";
import {
  readEndToEndPortIfSet,
  readTestDatabaseUrl,
  readTestRunProtocol,
  type TestRunProtocol,
  testProcessEnvironment,
  testRunEnvironment,
} from "../../src/env.ts";
import { type RunEnvironment, runWithTestDatabase } from "./run-environment.ts";
import { createRunOwnership } from "./run-ownership.ts";
import { type PortLease, releasePort, reservePort } from "./run-port.ts";
import { ownedCommand, preload, SENTINEL } from "./run-process.ts";
import { awaitCommandShutdown } from "./run-protocol.ts";
import { type Registry, registry } from "./run-registry.ts";

import { executeStock, stockCommand } from "./run-stock.ts";

const ENTRY = fileURLToPath(import.meta.url);
const FAILED = 1;
const USAGE = "Usage: node scripts/test-db/run.ts [--] <command> [args...]";
const RELEASE_PORT = "--release-port";
const SIGNAL_EXIT_BASE = 128;
function commandLine(): readonly string[] {
  const [, , ...rest] = argv;
  if (rest[0] === "--") {
    return rest.slice(1);
  }
  return rest;
}
function signalStatus(signal: NodeJS.Signals): number {
  return SIGNAL_EXIT_BASE + constants.signals[signal];
}
async function main(): Promise<number> {
  const line = commandLine();
  if (line[0] === RELEASE_PORT) {
    await releasePort();
    return 0;
  }
  const protocol = readTestRunProtocol();
  if (line[0] === "--execute-stock" && protocol !== undefined) {
    return executeStock(line, protocol);
  }
  if (line[0] === SENTINEL && protocol !== undefined) {
    return ownedCommand(protocol, line);
  }
  if (line.length === 0) {
    throw new Error(USAGE);
  }
  if (process.platform !== "darwin" && process.platform !== "linux") {
    throw new Error(
      "Unsupported test wrapper platform: requires macOS or Linux/POSIX.",
    );
  }
  if (line[0] === "--stock") {
    return run(stockCommand(line));
  }
  return run(line);
}
function launchCommand(
  line: readonly string[],
  environment: RunEnvironment,
  protocol: TestRunProtocol,
  token: string | undefined,
): Promise<number> {
  const [file, ...args] = line;
  if (file === undefined) {
    return Promise.resolve(FAILED);
  }
  const { database, port } = environment;
  console.log(
    `Running in the test database "${database.name}" on port ${port}.`,
  );
  const child = spawn(process.execPath, [ENTRY, SENTINEL, "3", file, ...args], {
    detached: true,
    stdio: "inherit",
    env: testProcessEnvironment(
      protocol,
      false,
      testRunEnvironment(database.url, port, token),
    ),
  });
  return new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? FAILED));
  });
}
async function run(line: readonly string[]): Promise<number> {
  const controller = new AbortController();
  let active: Registry | undefined;
  let stopPromise: Promise<void> | undefined;
  let signal: NodeJS.Signals | undefined;
  function stopProcesses(): Promise<void> {
    if (active === undefined) {
      return Promise.resolve();
    }
    stopPromise ??= active.stop();
    return stopPromise;
  }
  function stop(received: NodeJS.Signals): void {
    signal = received;
    controller.abort(new Error(`Test run cancelled by ${received}.`));
    // Observe rejection here; the awaited shutdown reports it below.
    stopProcesses().catch(() => {
      /* Awaited and reported before any database drop. */
    });
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  let lease: PortLease | undefined;
  const ownership = await createRunOwnership();
  try {
    return await runWithTestDatabase(
      { databaseUrl: readTestDatabaseUrl(), port: readEndToEndPortIfSet() },
      async (environment: RunEnvironment): Promise<number> => {
        controller.signal.throwIfAborted();
        active = await registry(ownership);
        if (controller.signal.aborted) {
          await stopProcesses();
          return FAILED;
        }
        const result = await awaitCommandShutdown(
          launchCommand(line, environment, active.protocol, lease?.token),
          controller.signal,
          stopProcesses,
        );
        if (signal !== undefined) {
          return signalStatus(signal);
        }
        return result;
      },
      {
        ownership,
        stop: stopProcesses,
        signal: controller.signal,
        reservePort: async (port: number | undefined): Promise<number> => {
          lease = await reservePort(port);
          return lease.port;
        },
      },
    );
  } finally {
    await lease?.close();
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}

try {
  if (argv[1] !== undefined && realpathSync(argv[1]) === ENTRY) {
    process.exitCode = await main();
  } else {
    const protocol = readTestRunProtocol();
    if (protocol !== undefined) {
      await preload(protocol);
    }
  }
} catch (error) {
  console.error(error);
  process.exitCode = FAILED;
}
