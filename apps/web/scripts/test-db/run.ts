// The test commands' entry point (`npm run test:server`, `npm run test:e2e`):
// runs the command its arguments give, after a leading `--`, in a test run's
// own database and port (run-environment.ts), with DATABASE_URL and E2E_PORT
// set to them, and exits with the command's status. On Ctrl-C or SIGTERM it
// passes the signal on to the command and stays to drop the run's database.
// As the command's entry point, it is the one place here that prints to the
// terminal.
import { type ChildProcess, spawn } from "node:child_process";
import process, { argv } from "node:process";
import {
  readEndToEndPortIfSet,
  readTestDatabaseUrl,
  testRunEnvironment,
} from "../../src/env.ts";
import { type RunEnvironment, runWithTestDatabase } from "./run-environment.ts";

// The status of a command killed by a signal, or never started because a
// signal came first, and of a run given no command.
const FAILED = 1;
const NO_COMMAND = 2;
const USAGE = "Usage: node scripts/test-db/run.ts [--] <command> [args...]";

// What the run has been asked to stop by, and the command it has running.
const state: {
  signal: NodeJS.Signals | undefined;
  child: ChildProcess | undefined;
} = { signal: undefined, child: undefined };

function commandLine(): readonly string[] {
  const [, , ...rest] = argv;
  if (rest[0] === "--") {
    return rest.slice(1);
  }
  return rest;
}

function passOn(signal: NodeJS.Signals): void {
  state.signal = signal;
  state.child?.kill(signal);
}

// Runs the command line in the run's environment, answering its exit code.
function runCommand(environment: RunEnvironment): Promise<number> {
  const [file, ...args] = commandLine();
  if (file === undefined || state.signal !== undefined) {
    return Promise.resolve(FAILED);
  }
  const { database, port } = environment;
  console.log(
    `Running in the test database "${database.name}" on port ${port}.`,
  );
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      stdio: "inherit",
      env: testRunEnvironment(database.url, port),
    });
    state.child = child;
    child.once("error", reject);
    child.once("exit", (code) => {
      state.child = undefined;
      resolve(code ?? FAILED);
    });
  });
}

process.on("SIGINT", passOn);
process.on("SIGTERM", passOn);

if (commandLine().length === 0) {
  console.error(USAGE);
  process.exitCode = NO_COMMAND;
} else {
  process.exitCode = await runWithTestDatabase(
    { databaseUrl: readTestDatabaseUrl(), port: readEndToEndPortIfSet() },
    runCommand,
  );
}
