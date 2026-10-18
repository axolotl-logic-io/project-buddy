import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

interface RunOptions {
  fileName?: string;
  exitCode?: number;
  proxyInstalled?: boolean;
}

function runCounter(
  source: string | Uint8Array,
  reply: string,
  options: RunOptions = {},
): {
  status: number | null;
  stdout: string;
  stderr: string;
  invocation: unknown;
} {
  const directory = mkdtempSync(join(tmpdir(), "instruction-counter-"));
  try {
    return runInDirectory(directory, source, reply, options);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function runInDirectory(
  directory: string,
  source: string | Uint8Array,
  reply: string,
  options: RunOptions,
): {
  status: number | null;
  stdout: string;
  stderr: string;
  invocation: unknown;
} {
  const input = join(directory, options.fileName ?? "source.txt");
  const record = join(directory, "invocation.json");
  const agentDir = join(directory, "agent");
  if (options.proxyInstalled === true) {
    const proxyDir = join(agentDir, "npm/node_modules/pi-cliproxyapi");
    mkdirSync(proxyDir, { recursive: true });
    writeFileSync(join(proxyDir, "index.ts"), "");
  }
  const fixture = resolve(import.meta.dirname, "fake-pi.ts");
  writeFileSync(input, source);
  symlinkSync(fixture, join(directory, "pi"));
  const { PATH: originalPath } = process.env;
  const Path = directory + delimiter + (originalPath ?? "");
  const result = spawnSync(
    process.execPath,
    [resolve(import.meta.dirname, "../src/cli.ts"), input],
    {
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        PATH: Path,
        PI_CODING_AGENT_DIR: agentDir,
        counterTestReply: reply,
        counterTestRecord: record,
        counterTestExit: String(options.exitCode ?? 0),
      },
    },
  );
  let invocation: unknown;
  try {
    invocation = JSON.parse(readFileSync(record, "utf8"));
  } catch {
    invocation = null;
  }
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    invocation,
  };
}

function runInvalidInvocation(args: string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    process.execPath,
    [resolve(import.meta.dirname, "../src/cli.ts"), ...args],
    { encoding: "utf8", timeout: 10_000 },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export { runCounter, runInvalidInvocation };
