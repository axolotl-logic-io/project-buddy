// The local site for the visual tools (compare.ts and baseline.ts): started
// here as a production build (`next build`, then `next start`) or as the
// development server (`next dev`), or one already running on this computer.
// Either way it must use this worktree's development database, where
// `mise run review-data` made the review accounts; the tools sign in as
// those accounts with session cookies signed here, as the site signs them.
//
// Runs after npm ci.
import { type ChildProcess, spawn } from "node:child_process";
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { localSettings } from "../development/environment.ts";
import {
  loopbackOrigin,
  pointAtLocalDatabase,
  type ReviewAccount,
  type ReviewKind,
  reviewAccounts,
  reviewSession,
  WEB_ROOT,
} from "../development/review-accounts.ts";
import type { ViewFinder } from "./views.ts";

// How the tools reach the site: start a production build or the development
// server here, or use the one at a given URL.
type SiteSource =
  | { readonly kind: "start"; readonly build: boolean }
  | { readonly kind: "dev" }
  | { readonly kind: "url"; readonly url: string };

interface Site {
  readonly origin: string;
  // How the site was built: "production", "development", or "as running"
  // for a site the tool didn't start.
  readonly build: string;
  readonly stop: () => Promise<void>;
}

// A review account signed in to the site: its session cookie, and where its
// quests and spells are.
interface SignedIn {
  readonly email: string;
  readonly cookie: { readonly name: string; readonly value: string };
  readonly find: ViewFinder;
}

interface NamedItem {
  readonly id: string;
  readonly name: string;
}

// Next's command, found by its package.json: app-modules.ts gives next/
// subpaths a .js the command lacks.
const NEXT_BIN = join(
  dirname(createRequire(import.meta.url).resolve("next/package.json")),
  "dist/bin/next",
);
const BUILD_ID = `${WEB_ROOT}/.next/BUILD_ID`;
const START_TIMEOUT_MS = 240_000;
const STOP_TIMEOUT_MS = 10_000;
const POLL_MS = 500;
const REQUEST_TIMEOUT_MS = 60_000;
const SERVER_ERROR = 500;
const LOG_TAIL_LINES = 30;
const READY = /Ready in /u;

const ME = z.object({ data: z.object({ email: z.string() }) });
const NAMED_ITEMS = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
});

// The environment for a site process: this worktree's local settings, then
// the shell's, as Next itself layers them, with DATABASE_URL pointed at the
// worktree's development database. NODE_ENV is left for Next to set, since
// next build and next start need "production".
function siteEnvironment(): NodeJS.ProcessEnv {
  pointAtLocalDatabase();
  const env: NodeJS.ProcessEnv = {
    ...localSettings(WEB_ROOT, process.env),
    ...process.env,
  };
  Reflect.deleteProperty(env, "NODE_ENV");
  return env;
}

// A free port on this computer.
function freePort(): Promise<number> {
  return new Promise(
    (done: (port: number) => void, fail: (error: Error) => void): void => {
      const server = createServer();
      server.on("error", fail);
      server.listen(0, "localhost", (): void => {
        const address = server.address();
        server.close((): void => {
          if (address === null || typeof address === "string") {
            fail(new Error("No free port."));
          } else {
            done(address.port);
          }
        });
      });
    },
  );
}

function tail(path: string): string {
  return readFileSync(path, "utf8")
    .trimEnd()
    .split("\n")
    .slice(-LOG_TAIL_LINES)
    .join("\n");
}

// Runs Next with args in its own process group, its output going to log.
function runNext(
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  log: string,
): ChildProcess {
  const child = spawn(process.execPath, [NEXT_BIN, ...args], {
    cwd: WEB_ROOT,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const file = createWriteStream(log, { flags: "a" });
  child.stdout?.pipe(file);
  child.stderr?.pipe(file);
  return child;
}

function exitOf(child: ChildProcess): Promise<number | null> {
  return new Promise((done: (code: number | null) => void): void => {
    child.on("exit", done);
  });
}

async function nextBuild(env: NodeJS.ProcessEnv, log: string): Promise<void> {
  console.log(`Building the site for production (log: ${log}).`);
  const code = await exitOf(runNext(["build"], env, log));
  if (code !== 0) {
    throw new Error(`next build failed:\n${tail(log)}`);
  }
}

// Ends the child's process group: next dev runs its server in a child of
// its own.
async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.pid === undefined) {
    return;
  }
  const exited = exitOf(child);
  process.kill(-child.pid, "SIGTERM");
  const stopped = await Promise.race([
    exited.then((): boolean => true),
    delay(STOP_TIMEOUT_MS).then((): boolean => false),
  ]);
  if (!stopped) {
    process.kill(-child.pid, "SIGKILL");
    await exited;
  }
}

async function answersAt(origin: string): Promise<boolean> {
  const answer = await fetch(new URL("/login", origin), {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((): undefined => undefined);
  return answer !== undefined && answer.status < SERVER_ERROR;
}

// Waits until the child says it is ready and the site answers, so this
// process's own server is the one that answers, never another on the port.
async function waitUntilReady(
  child: ChildProcess,
  origin: string,
  log: string,
): Promise<void> {
  let said = "";
  child.stdout?.on("data", (chunk: Buffer): void => {
    said += chunk.toString();
  });
  const deadline = Date.now() + START_TIMEOUT_MS;
  async function poll(): Promise<void> {
    if (child.exitCode !== null) {
      throw new Error(`The site stopped while starting:\n${tail(log)}`);
    }
    if (Date.now() > deadline) {
      throw new Error(`The site didn't start in time:\n${tail(log)}`);
    }
    if (READY.test(said) && (await answersAt(origin))) {
      return;
    }
    await delay(POLL_MS);
    await poll();
  }
  await poll();
}

function givenSite(url: string): Site {
  const origin = loopbackOrigin(url);
  if (origin === undefined) {
    throw new Error(
      `--site must be the local site, such as http://localhost:3000, not ${url}.`,
    );
  }
  pointAtLocalDatabase();
  return {
    origin,
    build: "as running",
    stop: (): Promise<void> => Promise.resolve(),
  };
}

// Starts or finds the site. log is the file for the site's own output.
async function openSite(source: SiteSource, log: string): Promise<Site> {
  if (source.kind === "url") {
    return givenSite(source.url);
  }
  const env = siteEnvironment();
  const port = await freePort();
  const origin = `http://localhost:${port}`;
  let command = "dev";
  let build = "development";
  if (source.kind === "start") {
    command = "start";
    build = "production";
    if (source.build) {
      await nextBuild(env, log);
    } else if (!existsSync(BUILD_ID)) {
      throw new Error(
        "There is no production build to start: leave out --no-build.",
      );
    }
  }
  console.log(`Starting the site at ${origin} (log: ${log}).`);
  const child = runNext(
    [command, "--port", `${port}`, "--hostname", "localhost"],
    env,
    log,
  );
  try {
    await waitUntilReady(child, origin, log);
  } catch (error) {
    await stopProcess(child);
    throw error;
  }
  return {
    origin,
    build,
    stop: (): Promise<void> => stopProcess(child),
  };
}

async function getJson(
  origin: string,
  path: string,
  cookie: string,
): Promise<unknown> {
  const answer = await fetch(new URL(path, origin), {
    headers: { cookie },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!answer.ok) {
    throw new Error(`The site answered ${answer.status} to GET ${path}.`);
  }
  return answer.json();
}

// The path of the named item among items, under base.
function finder(
  items: readonly NamedItem[],
  base: string,
  email: string,
): (name: string) => string {
  function pathOf(name: string): string {
    const found = items.find((item: NamedItem): boolean => item.name === name);
    if (found === undefined) {
      throw new Error(
        `${email} has no "${name}". Run mise run review-data to make the review data again.`,
      );
    }
    return `${base}/${found.id}`;
  }
  return pathOf;
}

// Signs one review account in to the site at origin. Throws unless the
// account exists and the site reads the same database.
async function signIn(
  origin: string,
  account: ReviewAccount,
  sessionSecret: string,
): Promise<SignedIn> {
  const [{ SESSION_COOKIE_NAME }, value] = await Promise.all([
    import("@/auth/session-token.ts"),
    reviewSession(account, sessionSecret),
  ]);
  if (value === undefined) {
    throw new Error(
      `${account.email} doesn't exist. Run mise run review-data first.`,
    );
  }
  const cookie = `${SESSION_COOKIE_NAME}=${value}`;
  const me = ME.safeParse(
    await getJson(origin, "/api/v1/me", cookie).catch(
      (): undefined => undefined,
    ),
  );
  if (!me.success || me.data.data.email !== account.email) {
    throw new Error(
      `The site at ${origin} didn't sign ${account.email} in: it must use this worktree's development database and SESSION_SECRET.`,
    );
  }
  const [questData, spellData] = await Promise.all([
    getJson(origin, "/api/v1/quests", cookie),
    getJson(origin, "/api/v1/spells", cookie),
  ]);
  const quests = NAMED_ITEMS.parse(questData);
  const spells = NAMED_ITEMS.parse(spellData);
  return {
    email: account.email,
    cookie: { name: SESSION_COOKIE_NAME, value },
    find: {
      quest: finder(quests.items, "/quests", account.email),
      spell: finder(spells.items, "/spellbook", account.email),
    },
  };
}

// Signs the three review accounts derived from baseEmail in to the site.
async function signInReviewAccounts(
  origin: string,
  baseEmail: string | undefined,
): Promise<Readonly<Record<ReviewKind, SignedIn>>> {
  const { sessionSecret } = pointAtLocalDatabase();
  const accounts = reviewAccounts(baseEmail);
  function one(kind: ReviewKind): Promise<SignedIn> {
    const account = accounts.find(
      (candidate: ReviewAccount): boolean => candidate.kind === kind,
    );
    if (account === undefined) {
      throw new Error(`No ${kind} review account.`);
    }
    return signIn(origin, account, sessionSecret);
  }
  const [empty, typical, crowded] = await Promise.all([
    one("empty"),
    one("typical"),
    one("crowded"),
  ]);
  return { empty, typical, crowded };
}

export type { SignedIn, Site, SiteSource };
export { openSite, signInReviewAccounts };
