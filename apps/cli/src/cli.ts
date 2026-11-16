#!/usr/bin/env node
// The process boundary of the project-buddy command: it hands run the
// arguments, environment, files, stdin, network and interrupts, and exits
// with run's status.

import { readFile } from "node:fs/promises";
import process from "node:process";
import { buffer } from "node:stream/consumers";
import { EXIT_STATUS } from "./problems.ts";
import { run } from "./run.ts";

// How long an interrupted invocation may take to write its error before
// the process exits anyway, such as while it waits for stdin.
const INTERRUPT_GRACE_MILLISECONDS = 1000;

// Bytes as UTF-8 text; invalid UTF-8 throws.
function utf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

const interrupt: AbortController = new AbortController();
process.once("SIGINT", (): void => {
  interrupt.abort();
  setTimeout((): void => {
    process.exit(EXIT_STATUS.interrupted);
  }, INTERRUPT_GRACE_MILLISECONDS).unref();
});

// A reader that closed stdout early gets no more lines, and no crash.
process.stdout.on("error", (): void => {
  process.exitCode = EXIT_STATUS.failure;
});

const {
  PROJECT_BUDDY_URL: url,
  PROJECT_BUDDY_SESSION: session,
}: NodeJS.ProcessEnv = process.env;

process.exitCode = await run({
  args: process.argv.slice(2),
  environment: { url, session },
  write: (text: string): void => {
    process.stdout.write(text);
  },
  readFile: async (path: string): Promise<string> => utf8(await readFile(path)),
  readStdin: async (): Promise<string> => utf8(await buffer(process.stdin)),
  fetch,
  interrupt: interrupt.signal,
});
