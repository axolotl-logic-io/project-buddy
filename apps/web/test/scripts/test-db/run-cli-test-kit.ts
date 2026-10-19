// Owned fixtures have bounded waits and afterEach disposal.
import { type ChildProcess, fork } from "node:child_process";
import { watch } from "node:fs";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, vi } from "vitest";
import { z } from "zod";
import { testRunEnvironment } from "../../../src/env.ts";
import { removeFixtureDirectory } from "./fake-run-database.ts";

const TIMEOUT_MS = 25_000;
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const resources: Array<() => Promise<void>> = [];
const MILESTONE = z.object({
  pid: z.number(),
  database: z.string(),
  port: z.number(),
});
const testUrl = new URL("postgres://localhost:4444/");
testUrl.username = "app";
testUrl.password = "placeholder";
interface Invocation {
  readonly child: ChildProcess;
  readonly directory: string;
  readonly done: Promise<number>;
  readonly output: () => string;
  readonly milestone: (name: string) => Promise<z.infer<typeof MILESTONE>>;
  readonly files: () => Promise<readonly string[]>;
}
function bounded<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Deadline waiting for ${label}.`)),
      TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
function fileReady(
  path: string,
  done: Promise<number>,
  output: () => string,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const watcher = watch(resolve(path, ".."), check);
    const timer = setTimeout(
      () => finish(new Error(`Missing milestone ${path}. ${output()}`)),
      TIMEOUT_MS,
    );
    function finish(error?: Error): void {
      clearTimeout(timer);
      watcher.close();
      if (error === undefined) {
        resolvePromise();
      } else {
        reject(error);
      }
    }
    function check(): void {
      access(path).then(
        () => finish(),
        () => {
          /* Await an observable event. */
        },
      );
    }
    done
      .then(() => access(path))
      .then(
        () => finish(),
        (error: unknown) =>
          finish(
            new Error(`Runner exited before milestone ${path}. ${output()}`, {
              cause: error,
            }),
          ),
      );
    watcher.once("error", finish);
    check();
  });
}
function invocation(
  child: ChildProcess,
  done: Promise<number>,
  directory: string,
  output: () => string,
): Invocation {
  return {
    child,
    directory,
    output,
    get done(): Promise<number> {
      return bounded(done, "runner completion");
    },
    milestone: async (name: string): Promise<z.infer<typeof MILESTONE>> => {
      const path = join(directory, name);
      await fileReady(path, done, output);
      return MILESTONE.parse(JSON.parse(await readFile(path, "utf8")));
    },
    files: () => readdir(directory),
  };
}
function registerCleanup(
  child: ChildProcess,
  done: Promise<number>,
  directory: string,
): void {
  resources.push(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
    await bounded(done, "fixture runner cleanup");
    await removeFixtureDirectory(directory);
  });
}
function fixtureEnvironment(
  databaseUrl: string | undefined,
  port: number | undefined,
  loader: string,
  real: boolean,
): NodeJS.ProcessEnv {
  let env = testRunEnvironment(databaseUrl, port);
  if (!real) {
    const { NODE_OPTIONS: previous = "" } = env;
    vi.stubEnv(
      "NODE_OPTIONS",
      `${previous} --import=${JSON.stringify(loader)}`,
    );
    env = testRunEnvironment(databaseUrl, port);
    vi.stubEnv("NODE_OPTIONS", previous);
  }
  return env;
}
async function startRun(
  mode: string,
  settings: {
    readonly databaseUrl?: string;
    readonly port?: number;
    readonly real?: boolean;
    readonly cwd?: string;
    readonly extra?: readonly string[];
    readonly fileSettings?: string;
    readonly command?: string;
  } = {},
): Promise<Invocation> {
  const directory = await mkdtemp(join(tmpdir(), "pb-wrapper-test-"));
  const root = settings.cwd ?? ROOT;
  const runner = join(root, "scripts/test-db/run.ts");
  const childFile = join(root, "test/scripts/test-db/fake-run-child.ts");
  const loader = pathToFileURL(
    join(root, "test/scripts/test-db/fake-run-loader.ts"),
  ).href;
  const args = ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON"];
  if (settings.fileSettings !== undefined) {
    const path = join(directory, "fixture.settings");
    await writeFile(path, settings.fileSettings);
    args.push(`--env-file=${path}`);
  }
  if (settings.real !== true) {
    args.push("--import", loader);
  }
  args.push(
    runner,
    settings.command ?? process.execPath,
    childFile,
    mode,
    `--fixture=${directory}`,
    ...(settings.extra ?? []),
  );
  let databaseUrl: string | undefined = settings.databaseUrl ?? testUrl.href;
  if (settings.fileSettings !== undefined) {
    ({ databaseUrl } = settings);
  }
  const env = fixtureEnvironment(
    databaseUrl,
    settings.port,
    loader,
    settings.real === true,
  );
  const scriptIndex = args.indexOf(runner);
  const child = fork(runner, args.slice(scriptIndex + 1), {
    execArgv: args.slice(0, scriptIndex),
    cwd: settings.cwd ?? ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  if (child.stdout === null || child.stderr === null) {
    throw new Error("Fixture output pipes are required.");
  }
  let output = "";
  child.stdout.on("data", (data: Buffer) => {
    output += data.toString();
  });
  child.stderr.on("data", (data: Buffer) => {
    output += data.toString();
  });
  const done = new Promise<number>((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolvePromise(code ?? 1));
  });
  registerCleanup(child, done, directory);
  return invocation(child, done, directory, () => output);
}
// A second independent script checkout with its own cwd and module paths.
// Dependencies are read-only; no Next build/cache artifacts are shared.
async function secondCheckout(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pb-second-checkout-"));
  resources.push(() => rm(root, { recursive: true }));
  await mkdir(join(root, "src/db"), { recursive: true });
  await mkdir(join(root, "test/scripts"), { recursive: true });
  await Promise.all([
    cp(join(ROOT, "scripts"), join(root, "scripts"), { recursive: true }),
    cp(join(ROOT, "src/env.ts"), join(root, "src/env.ts")),
    cp(join(ROOT, "src/db/client.ts"), join(root, "src/db/client.ts")),
    cp(join(ROOT, "test/scripts/test-db"), join(root, "test/scripts/test-db"), {
      recursive: true,
    }),
    cp(join(ROOT, "drizzle"), join(root, "drizzle"), { recursive: true }),
    symlink(resolve(ROOT, "../../node_modules"), join(root, "node_modules")),
  ]);
  return root;
}

async function competitor(port: number, directory?: string): Promise<Server> {
  const server = createServer();
  resources.push(
    () =>
      new Promise((resolvePromise, reject) =>
        server.close((error) => {
          if (error === undefined) {
            resolvePromise();
          } else {
            reject(error);
          }
        }),
      ),
  );
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, resolvePromise);
  });
  if (directory !== undefined) {
    await writeFile(join(directory, "competing-bound"), "bound");
  }
  return server;
}
afterEach(async () => {
  const cleanups = resources.splice(0).reverse();
  const failures: unknown[] = [];
  await cleanups.reduce(
    (previous, cleanup) =>
      previous.then(cleanup).catch((error: unknown) => {
        failures.push(error);
      }),
    Promise.resolve(),
  );
  if (failures.length > 0) {
    throw new AggregateError(failures, "Fixture cleanup failed.");
  }
});

export type { Invocation };
export { competitor, secondCheckout, startRun };
