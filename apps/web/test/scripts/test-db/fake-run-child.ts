// Real descendants and TCP listeners, with file milestones for coordination.

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { access, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import process, { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { releasePort } from "../../../scripts/test-db/run-port.ts";
import {
  checkTestDatabase,
  createTestDatabase,
} from "../../../scripts/test-db/test-database.ts";
import { readEndToEndPort, readTestDatabaseUrl } from "../../../src/env.ts";
import { fixtureDirectory } from "./fake-run-database.ts";

const TIMEOUT_MS = 20_000;
const FAILED = 3;
const directory = fixtureDirectory();
const [, , mode]: readonly string[] = argv;
async function marker(name: string): Promise<void> {
  const path = join(directory, name);
  await writeFile(
    `${path}.partial`,
    JSON.stringify({
      pid: process.pid,
      database: new URL(readTestDatabaseUrl()).pathname.slice(1),
      port: readEndToEndPort(),
    }),
  );
  await rename(`${path}.partial`, path);
}
function hold(): void {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  process.on("SIGTERM", () => {
    marker("stopped").then(
      () => server.close(),
      (error: unknown) => {
        throw error;
      },
    );
  });
}
function waitForFile(name: string): Promise<void> {
  const path = join(directory, name);
  return new Promise((resolve, reject) => {
    // Subscribe before checking: readiness may precede this wait, or arrive
    // between the initial check and the next filesystem event.
    const watcher = watch(directory, check);
    const timer = setTimeout(
      () => finish(new Error(`Missing fixture milestone ${name}.`)),
      TIMEOUT_MS,
    );
    function finish(error?: Error): void {
      clearTimeout(timer);
      watcher.close();
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    }
    function check(): void {
      access(path).then(
        () => finish(),
        () => {
          /* Await the next observable filesystem milestone. */
        },
      );
    }
    watcher.once("error", finish);
    check();
  });
}
if (mode === "detached") {
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), "hold", `--fixture=${directory}`],
    { detached: true, stdio: "ignore" },
  );
  const ready = waitForFile("ready");
  child.unref();
  await ready;
  await marker("parent-exited");
} else if (mode === "hold" || mode === "stubborn") {
  if (argv.includes("--scratch")) {
    const url = new URL(readTestDatabaseUrl());
    url.pathname += "_scratch";
    await createTestDatabase(checkTestDatabase(url.href));
  }
  hold();
  if (mode === "stubborn") {
    process.removeAllListeners("SIGTERM");
    process.on("SIGTERM", () => {
      /* Escalation fixture. */
    });
  }
  await marker("ready");
} else if (mode === "already-ready") {
  await marker("ready");
  await waitForFile("ready");
  await marker("observed-ready");
} else if (mode === "browser") {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent("<title>Owned browser</title>");
    if ((await page.title()) !== "Owned browser") {
      throw new Error("Browser content mismatch.");
    }
    await marker("browser-done");
  } finally {
    await browser.close();
  }
} else if (mode === "race") {
  const competitor = waitForFile("competing-bound");
  await releasePort();
  await marker("released");
  await competitor;
  const server = createServer();
  server.on("error", (error: Error) => {
    throw new Error(
      `Selected test port ${readEndToEndPort()} is unavailable.`,
      { cause: error },
    );
  });
  server.listen(readEndToEndPort(), () => {
    marker("tests-ran").catch((error: unknown) => {
      throw error;
    });
  });
} else {
  await marker("ready");
  if (mode === "fail") {
    process.exitCode = FAILED;
  }
}
