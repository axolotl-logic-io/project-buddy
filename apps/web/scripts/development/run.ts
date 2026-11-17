// Runs before npm ci, so modules that import dependencies are imported only
// where they're used, after it.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  adoptWorktreeDatabase,
  configurationProblems,
  localSettings,
  prepareEnvironment,
  testCommandEnvironment,
} from "./environment.ts";
import { linkEmail } from "./sign-in-link-token.ts";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT = resolve(WEB_ROOT, "../..");
const COMPOSE = ["compose", "--file", "compose.dev-db.yml"];
const COMMAND_TIMEOUT_MS = 180_000;
// The first browser install downloads Chromium and WebKit.
const BROWSER_INSTALL_TIMEOUT_MS = 600_000;

function command(
  program: string,
  args: string[],
  cwd: string = WEB_ROOT,
  {
    env = process.env,
    timeout = COMMAND_TIMEOUT_MS,
    show = false,
  }: { env?: NodeJS.ProcessEnv; timeout?: number; show?: boolean } = {},
): boolean {
  // Child output may contain connection credentials. Report only the step,
  // unless the child is one of ours that prints only its own messages.
  let stdio: "pipe" | ["ignore", "inherit", "inherit"] = "pipe";
  if (show === true) {
    stdio = ["ignore", "inherit", "inherit"];
  }
  const result = spawnSync(program, args, {
    cwd,
    env,
    encoding: "utf8",
    timeout,
    stdio,
  });
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

function setup(): void {
  for (const [ok, message] of prerequisites()) {
    requireStep(ok, message);
  }
  adoptWorktreeDatabase(WEB_ROOT, process.env);
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
  console.log(
    "Preparing this worktree's development database (npm run dev:database)...",
  );
  requireStep(
    command("npm", ["run", "--silent", "dev:database"], WEB_ROOT, {
      env: { ...process.env, ...settings },
      // It prints only its own messages, never the database URL.
      show: true,
    }),
    "Development database: this worktree's own, with this checkout's migrations.",
  );
  requireStep(
    command("npm", ["run", "dev:cli-session"], WEB_ROOT, {
      env: { ...process.env, ...settings },
    }),
    "CLI session: the developer account's session is in apps/cli/.env.local.",
  );
  requireStep(
    command("npm", ["run", "test-env:init"]),
    "Manual test configuration: preserve or initialize .env.test.",
  );
  const testEnvironment = testCommandEnvironment(WEB_ROOT, process.env);
  requireStep(
    command("npm", ["run", "test-db:up"], WEB_ROOT, {
      env: testEnvironment,
    }),
    "Test database server: start Docker and check port 5433 is available.",
  );
  console.log(
    "Creating and migrating the test database (npm run test-db:reset)...",
  );
  requireStep(
    command("npm", ["run", "test-db:reset"], WEB_ROOT, {
      env: testEnvironment,
    }),
    "Test database: the database in .env.test is created and migrated.",
  );
  console.log("Installing test browsers (npm run browsers:install)...");
  requireStep(
    command("npm", ["run", "browsers:install"], WEB_ROOT, {
      timeout: BROWSER_INSTALL_TIMEOUT_MS,
    }),
    "Test browsers: Playwright's Chromium and WebKit are installed.",
  );
  console.log(
    "Ready. Run mise //apps/web:dev, then open http://localhost:3000.\nSign-in emails are JSON files in the configured EMAIL_OUTBOX_DIR under apps/web. Or run mise run sign-in-link EMAIL to print a sign-in link at once.\nWith the site running, project-buddy commands act as the developer account; try project-buddy whoami.\nRun mise run doctor to check this environment. The test database and browsers are ready; the test commands are in README.md.",
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
        const { migrationState } = await import("./database.ts");
        const { DATABASE_URL = "" } = settings;
        const state = await migrationState(DATABASE_URL);
        if (state === "diverged") {
          report(
            false,
            "This worktree's development database has migrations this checkout lacks. Run mise setup to reset it; its data is lost.",
          );
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
  // pg is a dependency, so this waits for npm ci, as the database check does.
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
  if (action === "setup" && actionArgs.length === 0) {
    setup();
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
