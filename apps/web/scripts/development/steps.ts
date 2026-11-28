// The checks and steps `mise run setup` and `mise run doctor` share. Node
// built-ins only: setup runs them before npm ci.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(WEB_ROOT, "../..");
const COMMAND_TIMEOUT_MS = 180_000;

interface CommandOptions {
  readonly cwd?: string;
  readonly timeout?: number;
  // Shows the command's output, for one that prints only its own messages.
  readonly show?: boolean;
}

// Whether the command succeeds. Its output is hidden unless shown, since a
// tool's output may hold connection credentials.
function command(
  program: string,
  args: readonly string[],
  {
    cwd = WEB_ROOT,
    timeout = COMMAND_TIMEOUT_MS,
    show = false,
  }: CommandOptions = {},
): boolean {
  let stdio: "pipe" | ["ignore", "inherit", "inherit"] = "pipe";
  if (show === true) {
    stdio = ["ignore", "inherit", "inherit"];
  }
  const result = spawnSync(program, args, {
    cwd,
    env: process.env,
    encoding: "utf8",
    timeout,
    stdio,
  });
  return result.status === 0;
}

// The tools every task needs, each with what to do when it's missing.
function prerequisites(): [boolean, string][] {
  return [
    [process.versions.node.startsWith("24."), "Node 24: run mise install."],
    [command("npm", ["--version"], { cwd: ROOT }), "npm: run mise install."],
    [
      command("docker", ["info"]),
      "Docker engine: install Docker and start its engine.",
    ],
    [
      command("docker", ["compose", "version"]),
      "Docker Compose: install the Compose plugin.",
    ],
  ];
}

// Prints the failure and sets the exit code; prints no error details, which
// may hold credentials.
function reportFailure(error: unknown): void {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(
      "The command failed unexpectedly; no credentials were printed.",
    );
  }
  process.exitCode = 1;
}

export { command, prerequisites, ROOT, reportFailure, WEB_ROOT };
