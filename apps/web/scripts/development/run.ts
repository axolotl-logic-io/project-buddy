// Runs before npm ci, so dependency imports must stay inside databaseHealth.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  configurationProblems,
  localSettings,
  prepareEnvironment,
} from "./environment.ts";
import { linkEmail } from "./sign-in-link-token.ts";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(WEB_ROOT, "../..");
const COMPOSE = ["compose", "--file", "compose.dev-db.yml"];

function command(
  program: string,
  args: string[],
  cwd: string = WEB_ROOT,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const result = spawnSync(program, args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: 180_000,
    stdio: "pipe",
  });
  // Child output may contain connection credentials. Report only the step.
  return result.status === 0;
}

function requireStep(ok: boolean, message: string): void {
  if (!ok) {
    throw new Error(message);
  }
  console.log(`OK: ${message}`);
}

function prerequisites(): [boolean, string][] {
  return [
    [process.versions.node.startsWith("24."), "Node 24: run mise install."],
    [command("npm", ["--version"], ROOT), "npm: run mise install."],
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

type MigrationState = "current" | "pending" | "diverged";
const DIVERGED_DATABASE =
  "The development database migration history differs from this checkout. Setup cannot safely migrate it. Existing data is preserved; reconcile the migration history or explicitly reset the development database before rerunning setup.";

async function databaseHealth(
  settings: NodeJS.Dict<string>,
): Promise<MigrationState> {
  const { default: pg } = await import("pg");
  const { DATABASE_URL } = settings;
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 3000,
    options: "-c statement_timeout=3000",
  });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    let hashes: Set<string>;
    try {
      const applied = await client.query<{ hash: string }>(
        "SELECT hash FROM drizzle.__drizzle_migrations",
      );
      hashes = new Set(applied.rows.map((row) => row.hash));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "42P01") {
        return "pending";
      }
      throw error;
    }
    const migrations = join(WEB_ROOT, "drizzle");
    const knownHashes = new Set(
      readdirSync(migrations)
        .filter((file) => file.endsWith(".sql"))
        .map((file) =>
          createHash("sha256")
            .update(readFileSync(join(migrations, file)))
            .digest("hex"),
        ),
    );
    if ([...hashes].some((hash) => !knownHashes.has(hash))) {
      return "diverged";
    }
    if ([...knownHashes].some((hash) => !hashes.has(hash))) {
      return "pending";
    }
    return "current";
  } finally {
    await client.end();
  }
}

async function setup(): Promise<void> {
  for (const [ok, message] of prerequisites()) {
    requireStep(ok, message);
  }
  // Validate the target before installation, file creation or database writes.
  localSettings(WEB_ROOT, process.env);
  prepareEnvironment(WEB_ROOT, process.env);
  const settings = localSettings(WEB_ROOT, process.env);
  const problems = configurationProblems(settings);
  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }
  console.log("Installing workspace dependencies (npm ci)...");
  requireStep(command("npm", ["ci"], ROOT), "Dependency install: npm ci.");
  requireStep(
    command("docker", [...COMPOSE, "up", "--detach", "--wait"]),
    "Development database: start Docker and check port 5434 is available.",
  );
  console.log("Applying development migrations (npm run db:migrate)...");
  const migrated = command("npm", ["run", "db:migrate"], WEB_ROOT, {
    ...process.env,
    ...settings,
  });
  if (!migrated) {
    const state = await databaseHealth(settings).catch(() => undefined);
    if (state === "diverged") {
      throw new Error(DIVERGED_DATABASE);
    }
  }
  if (!migrated) {
    throw new Error(
      "Development migrations failed. Run mise run doctor to check database access and migration history. Existing data is not reset.",
    );
  }
  console.log("OK: Development migrations applied.");
  requireStep(
    command("npm", ["run", "dev:cli-session"], WEB_ROOT, {
      ...process.env,
      ...settings,
    }),
    "CLI session: the developer account's session is in apps/cli/.env.local.",
  );
  requireStep(
    command("npm", ["run", "test-env:init"]),
    "Manual test configuration: preserve or initialize .env.test.",
  );
  console.log(
    "Ready. Run mise //apps/web:dev, then open http://localhost:3000.\nSign-in emails are JSON files in the configured EMAIL_OUTBOX_DIR under apps/web. Or run mise run sign-in-link EMAIL to print a sign-in link at once.\nWith the site running, project-buddy commands act as the developer account; try project-buddy whoami.\nRun mise run doctor to check this environment. Database tests and browser tests remain opt-in; see README.md.",
  );
}

async function doctor(): Promise<void> {
  let healthy = true;
  function report(ok: boolean, message: string): void {
    let prefix = "OK";
    if (!ok) {
      healthy = false;
      prefix = "FAIL";
    }
    console.log(`${prefix}: ${message}`);
  }
  for (const [ok, message] of prerequisites()) {
    report(ok, message);
  }
  const dependencies =
    existsSync(join(ROOT, "node_modules", ".package-lock.json")) &&
    command("npm", ["ls", "--depth=0", "--workspaces"], ROOT);
  report(dependencies, "Workspace dependencies: run mise setup to install.");
  try {
    const settings = localSettings(WEB_ROOT, process.env);
    const problems = configurationProblems(settings);
    report(problems.length === 0, "Local configuration: run mise setup first.");
    for (const problem of problems) {
      report(false, problem);
    }
    if (problems.length === 0 && dependencies) {
      try {
        const state = await databaseHealth(settings);
        if (state === "diverged") {
          report(false, DIVERGED_DATABASE);
        } else if (state === "pending") {
          report(
            false,
            "Development database reachable; migrations pending. Run mise setup.",
          );
        } else {
          report(
            true,
            "Development database reachable; migrations are current.",
          );
          const { cliSessionWorks } = await import("./cli-session.ts");
          report(
            await cliSessionWorks(settings),
            "CLI session: run mise setup to renew apps/cli/.env.local.",
          );
        }
      } catch {
        report(
          false,
          "Development database unavailable: run mise setup and check Docker. Database credentials are not printed.",
        );
      }
    } else {
      console.log(
        "SKIP: Database check needs dependencies and local configuration.",
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      report(false, error.message);
    } else {
      report(false, "Cannot read local configuration; check file permissions.");
    }
  }
  if (!healthy) {
    process.exitCode = 1;
  }
}

// A new sign-in link for the address, or the developer account without one.
async function signInLink(address?: string): Promise<URL> {
  const email = linkEmail(address);
  const { DATABASE_URL } = localSettings(WEB_ROOT, process.env);
  if (!DATABASE_URL) {
    throw new Error("Run mise setup first.");
  }
  // pg is a dependency, so this waits for npm ci, as databaseHealth does.
  const { createSignInLink } = await import("./sign-in-link.ts").catch(
    (cause: unknown) => {
      throw new Error("Run mise setup first.", { cause });
    },
  );
  const { PROJECT_BUDDY_URL = "http://localhost:3000" } = process.env;
  return await createSignInLink(DATABASE_URL, PROJECT_BUDDY_URL, email);
}

const [action, ...actionArgs] = process.argv.slice(2);
try {
  if (action === "setup") {
    await setup();
  } else if (action === "doctor") {
    await doctor();
  } else if (action === "sign-in-link" && actionArgs.length <= 1) {
    console.log((await signInLink(actionArgs[0])).href);
  } else {
    throw new Error(
      "Usage: mise setup | mise run doctor | mise run sign-in-link [EMAIL]",
    );
  }
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(
      "Development command failed unexpectedly; no credentials were printed.",
    );
  }
  process.exitCode = 1;
}
