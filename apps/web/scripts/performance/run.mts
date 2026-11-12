// Opt-in command platform boundary. It owns child processes and local output.
import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { cpus, hostname, loadavg, tmpdir, totalmem } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { z } from "zod";
import { readEndToEndPort } from "../../src/env.ts";
import { checkTestEnvironment } from "../test-db/test-database.ts";
import {
  parseReadinessSelection,
  type ReadinessSelection,
} from "./artifacts.ts";
import type { CaptureOptions, Fixture } from "./capture.mts";
import { captureMatrix, openBrowser } from "./capture.mts";
import { captureLighthouse } from "./lighthouse.mts";
import { MANIFEST_VERSION, parseManifest } from "./manifest.ts";
import { summarizeAudit } from "./summary.ts";
import { validateAuditDirectory } from "./validate-output.mts";

const MINIMUM_SAMPLES = 3;
const SERVER_READY_DEADLINE_MS = 30_000;
const SERVER_STOP_DEADLINE_MS = 10_000;
const READINESS_BUFFER_SIZE = 128;
const SAMPLE_COUNT = z.coerce.number().int().min(MINIMUM_SAMPLES);
async function command(
  commandName: string,
  args: string[],
  signal?: AbortSignal,
): Promise<void> {
  const child = spawn(commandName, args, { stdio: "inherit", signal });
  const [code] = await once(child, "exit");
  if (code !== 0) {
    throw new Error("Audit preparation command failed");
  }
}
async function git(args: string[]): Promise<string> {
  const child = spawn("git", args, { stdio: ["ignore", "pipe", "ignore"] });
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });
  const [code] = await once(child, "exit");
  if (code !== 0) {
    throw new Error("Unable to identify audit source");
  }
  return output.trim();
}
async function startServer(
  port: number,
  signal: AbortSignal,
): Promise<ChildProcess> {
  const child = spawn(
    process.execPath,
    [
      "../../node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { stdio: ["ignore", "pipe", "pipe"], signal },
  );
  // Readiness comes from the owned process, not a polling sleep or another server.
  child.stderr?.resume();
  try {
    await new Promise<void>((resolveReady, reject) => {
      const deadline = setTimeout(() => {
        reject(new Error("Production server did not become ready"));
      }, SERVER_READY_DEADLINE_MS);
      let startupOutput = "";
      function ready(chunk: Buffer): void {
        startupOutput = (startupOutput + chunk.toString()).slice(
          -READINESS_BUFFER_SIZE,
        );
        if (startupOutput.includes("Ready in")) {
          clearTimeout(deadline);
          resolveReady();
        }
      }
      child.stdout?.on("data", ready);
      child.once("error", (error) => {
        clearTimeout(deadline);
        reject(error);
      });
      child.once("exit", () => {
        clearTimeout(deadline);
        reject(new Error("Production server exited before capture"));
      });
    });
  } catch (error) {
    await stopServer(child);
    throw error;
  }
  return child;
}
async function stopServer(child: ChildProcess): Promise<void> {
  if (
    child.pid === undefined ||
    child.exitCode !== null ||
    child.signalCode !== null
  ) {
    return;
  }
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const deadline = setTimeout(() => {
    child.kill("SIGKILL");
  }, SERVER_STOP_DEADLINE_MS);
  try {
    await exited;
  } finally {
    clearTimeout(deadline);
  }
}
// Isolate the alias-aware fixture loader from native browser callbacks and
// native TypeScript modules already loaded by this process. Credentials cross
// the boundary only through an owned private file, removed before returning.
async function seedFixture(): Promise<Fixture> {
  const directory = await mkdtemp(join(tmpdir(), "pb-audit-fixture-"));
  const filename = join(directory, "fixture.json");
  try {
    await command(process.execPath, [
      "--import",
      "tsx",
      "scripts/performance/seed-command.mts",
      filename,
    ]);
    const input: unknown = JSON.parse(await readFile(filename, "utf8"));
    return z
      .strictObject({
        empty: z.string().min(1),
        populated: z.string().min(1),
        details: z.string().min(1),
        quest: z.uuid(),
        chat: z.uuid(),
        construct: z.uuid(),
        emptyQuest: z.uuid(),
        emptyChat: z.uuid(),
        counts: z.strictObject({
          accounts: z.number().int().positive(),
          quests: z.number().int().positive(),
          messages: z.number().int().positive(),
          ownConstructs: z.number().int().positive(),
          emptyDetailMessages: z.number().int().nonnegative(),
          editedPromptEnding: z.string().min(1),
        }),
      })
      .parse(input);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
// The installed version, read from the package itself rather than restated.
async function installedVersion(directory: string): Promise<string> {
  const input: unknown = JSON.parse(
    await readFile(`${directory}/package.json`, "utf8"),
  );
  return z.object({ version: z.string() }).parse(input).version;
}
async function run(): Promise<void> {
  const { values } = parseArgs({
    options: {
      output: { type: "string" },
      browser: { type: "string" },
      samples: { type: "string" },
      confirmation: { type: "boolean" },
      help: { type: "boolean" },
      "diagnostic-state": { type: "string" },
      "diagnostic-profile": { type: "string" },
      "diagnostic-journey": { type: "string" },
    },
  });
  if (values.help === true) {
    console.info(
      "audit:performance --output /new/absolute/directory --browser /absolute/chrome [--samples 3] [--confirmation]",
    );
    console.info(
      "Focused diagnostic: add --diagnostic-state populated --diagnostic-profile desktop --diagnostic-journey long-adventure; --confirmation selects ten samples. Diagnostics are not full audits.",
    );
    return;
  }
  const output = z.string().startsWith("/").parse(values.output);
  const browserPath = z.string().startsWith("/").parse(values.browser);
  let defaultSamples = 3;
  if (values.confirmation === true) {
    defaultSamples = 10;
  }
  const samples = SAMPLE_COUNT.parse(values.samples ?? defaultSamples);
  if (values.confirmation === true && samples < 10) {
    throw new Error("Confirmation requires at least ten runs per cell");
  }
  let selection: ReadinessSelection | undefined;
  const diagnosticValues: readonly (string | undefined)[] = [
    values["diagnostic-state"],
    values["diagnostic-profile"],
    values["diagnostic-journey"],
  ];
  if (diagnosticValues.some((value) => value !== undefined)) {
    selection = parseReadinessSelection({
      state: values["diagnostic-state"],
      profile: values["diagnostic-profile"],
      name: values["diagnostic-journey"],
    });
  }
  process.loadEnvFile(".env.test");
  checkTestEnvironment();
  if ((await git(["status", "--porcelain"])).length > 0) {
    throw new Error(
      "Commit tracked changes before capturing a reproducible build",
    );
  }
  const sourceCommit = await git(["rev-parse", "HEAD"]);
  await mkdir(output, { recursive: false });
  function host(): unknown {
    return {
      name: hostname(),
      cpuCount: cpus().length,
      memoryBytes: totalmem(),
      load: loadavg(),
    };
  }
  const preflight = await openBrowser(browserPath);
  const browserVersion = await preflight.version();
  await preflight.close();
  const tools = {
    browser: browserVersion,
    puppeteerCore: await installedVersion("../../node_modules/puppeteer-core"),
    lighthouse: await installedVersion("../../node_modules/lighthouse"),
    lighthousePuppeteerCore: await installedVersion(
      "../../node_modules/lighthouse/node_modules/puppeteer-core",
    ),
  };
  const hostBefore = host();
  const options: CaptureOptions = {
    base: `http://localhost:${readEndToEndPort()}`,
    output: resolve(output),
    browserPath,
    samples,
  };
  if (selection !== undefined) {
    options.selection = selection;
  }
  let scope = "full";
  if (selection !== undefined) {
    scope = "diagnostic";
  }
  let server: ChildProcess | undefined;
  let fixtureCreated = false;
  const cancellation = new AbortController();
  function cancel(): void {
    cancellation.abort();
    process.exitCode = 1;
  }
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  let stage = "database";
  try {
    await command("npm", ["run", "test-db:reset"], cancellation.signal);
    fixtureCreated = true;
    stage = "fixture";
    const fixture = await seedFixture();
    stage = "build";
    await command("npm", ["run", "build"], cancellation.signal);
    stage = "font-guard";
    await command("npm", ["run", "check:build-fonts"], cancellation.signal);
    const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
    const manifest = parseManifest({
      schemaVersion: MANIFEST_VERSION,
      scope,
      selection: selection ?? null,
      captureProtocol: "commit-probe-v5",
      sourceCommit,
      buildId,
      samples,
      fixture: fixture.counts,
      tools,
      hostBefore,
      cache:
        "new browser context per journey/sample; cold direct, warm direct then source→client; server/database not reset between cells",
      theme: "parchment/light",
      profiles: {
        desktop: {
          width: 1440,
          height: 900,
          cpuRate: 1,
          latency: 0,
          download: -1,
          upload: -1,
        },
        phone: {
          width: 390,
          height: 844,
          cpuRate: 4,
          latency: 150,
          download: 200_000,
          upload: 93_750,
        },
      },
      lighthouseEmulation:
        "Lighthouse mobile screen and user agent, applied before each source page loads",
      probeResolutionMs: 100,
      inputCharacters: 42,
      networkAttribution:
        "Completed CDP requests; initiator category only, no stacks or URLs; early means started by primary presence, not essential payload",
      minimumWindowMs: 5000,
      postControlWindowMs: 2000,
      quietWindowMs: 500,
      productionAccess: false,
      fieldCollection: false,
      screenshotPolicy: {
        allowedFiles: ["home.trace.json.gz", "stream.trace.json.gz"],
        manualReviewRequired: true,
      },
      complete: false,
    });
    await writeFile(
      `${output}/manifest.json`,
      JSON.stringify(manifest, null, 2),
    );
    stage = "server";
    server = await startServer(readEndToEndPort(), cancellation.signal);
    const browser = await openBrowser(browserPath);
    function closeFailed(): void {
      process.exitCode = 1;
    }
    function cancelBrowser(): void {
      browser.close().catch(closeFailed);
    }
    cancellation.signal.addEventListener("abort", cancelBrowser, {
      once: true,
    });
    try {
      cancellation.signal.throwIfAborted();
      stage = "matrix";
      const rows = await captureMatrix(browser, fixture, options);
      await writeFile(
        `${output}/summary.json`,
        JSON.stringify(summarizeAudit(rows), null, 2),
      );
      if (selection === undefined) {
        stage = "lighthouse";
        await captureLighthouse(browser, fixture, options);
      }
      const finished = parseManifest({
        ...manifest,
        hostAfter: host(),
        complete: selection === undefined,
        diagnosticComplete: selection !== undefined,
      });
      await writeFile(
        `${output}/manifest.json`,
        JSON.stringify(finished, null, 2),
      );
      if (selection === undefined) {
        // The validator reads the finished manifest; a rejected cohort is
        // marked incomplete again rather than left claiming completion.
        stage = "validation";
        try {
          await validateAuditDirectory(output, samples);
        } catch (error) {
          await writeFile(
            `${output}/manifest.json`,
            JSON.stringify({ ...finished, complete: false }, null, 2),
          );
          throw error;
        }
      }
    } finally {
      cancellation.signal.removeEventListener("abort", cancelBrowser);
      await browser.close();
    }
    if (selection === undefined) {
      console.info(
        `Audit complete: ${output}. Review allowed Home filmstrip before sharing.`,
      );
    } else {
      console.info(
        `Diagnostic cohort complete: ${output}. Full audit and Lighthouse were not run.`,
      );
    }
  } catch (error) {
    await writeFile(
      `${output}/audit-failure.json`,
      JSON.stringify({ stage, complete: false }),
    );
    throw new Error("Audit stage failed", { cause: error });
  } finally {
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
    if (server !== undefined) {
      await stopServer(server);
    }
    if (fixtureCreated) {
      await command("npm", ["run", "test-db:reset"]);
    }
  }
}
await run().catch(() => {
  console.error(
    "Audit failed; sanitized failure artifacts and partial outputs remain local.",
  );
  process.exitCode = 1;
});
