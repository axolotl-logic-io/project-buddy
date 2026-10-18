import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { judgeArguments, judgeInput } from "./judge.ts";
import type { Measurement } from "./report.ts";
import { parseAnalysis, report, sourceLines } from "./report.ts";

const MAX_INPUT_BYTES = 131_072;
const MAX_OUTPUT_BYTES = 16_777_216;

function readText(file: string): string | undefined {
  const stat = statSync(file);
  if (!stat.isFile()) {
    throw new Error("Input must be a regular file");
  }
  if (stat.size > MAX_INPUT_BYTES) {
    throw new Error(
      "Input exceeds the 128 KiB limit; no analysis was performed",
    );
  }
  const bytes = readFileSync(file);
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
  if (bytes.includes(0)) {
    return undefined;
  }
  return source;
}

function proxyExtension(): string | undefined {
  const { PI_CODING_AGENT_DIR: configuredDir } = process.env;
  const agentDir = configuredDir ?? join(homedir(), ".pi", "agent");
  const extension = resolve(
    agentDir,
    "npm/node_modules/pi-cliproxyapi/index.ts",
  );
  if (existsSync(extension)) {
    return extension;
  }
  return undefined;
}

function measure(
  file: string,
): Measurement | { filename: string; status: "skipped"; reason: "binary" } {
  const source = readText(file);
  if (source === undefined) {
    return { filename: file, status: "skipped", reason: "binary" };
  }
  const lines = sourceLines(source);
  if (source.trim() === "") {
    return report(file, {
      instructions: [],
      descriptiveStatements: [],
      contentLines: [],
    });
  }
  const result = spawnSync("pi", judgeArguments(proxyExtension()), {
    input: judgeInput(lines),
    encoding: "utf8",
    timeout: 300_000,
    killSignal: "SIGKILL",
    maxBuffer: MAX_OUTPUT_BYTES,
  });
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error !== undefined) {
    throw new Error(
      "Could not complete pi analysis (check installation, timeout and output size)",
    );
  }
  if (result.status !== 0) {
    throw new Error("Pi analysis failed; no result was emitted");
  }
  return report(file, parseAnalysis(result.stdout, lines));
}

function main(): void {
  const args = process.argv.slice(2);
  const [file] = args;
  if (args.length !== 1 || file === undefined) {
    throw new Error("Usage: node src/cli.ts <text-file>");
  }
  process.stdout.write(`${JSON.stringify(measure(resolve(file)))}\n`);
}

try {
  main();
} catch (error: unknown) {
  let message = "Analysis failed";
  if (error instanceof Error) {
    ({ message } = error);
  }
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
