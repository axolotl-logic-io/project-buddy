// `mise run setup`: installs the workspace's dependencies and prepares this
// checkout: local settings in .env.local, the two Compose database servers,
// this branch's development database and the test browsers. The test
// databases need no setup; each suite resets its own when it runs. Runs
// before npm ci, so it imports only Node built-ins and the files beside it.
import process from "node:process";
import { stopDevelopmentServer } from "./development/dev-server.ts";
import {
  configurationProblems,
  localSettings,
  prepareEnvironment,
} from "./development/environment.ts";
import {
  command,
  prerequisites,
  ROOT,
  reportFailure,
  WEB_ROOT,
} from "./development/steps.ts";

// The first browser install downloads Chromium and WebKit.
const BROWSER_INSTALL_TIMEOUT_MS = 600_000;

function requireStep(ok: boolean, message: string): void {
  if (!ok) {
    throw new Error(message);
  }
  console.log(`OK: ${message}`);
}

async function setup(): Promise<void> {
  for (const [ok, message] of prerequisites()) {
    requireStep(ok, message);
  }
  prepareEnvironment(WEB_ROOT, process.env);
  const problems = configurationProblems(localSettings(WEB_ROOT, process.env));
  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }
  await stopDevelopmentServer(WEB_ROOT);
  console.log("Installing workspace dependencies (npm ci)...");
  requireStep(
    command("npm", ["ci"], { cwd: ROOT }),
    "Dependency install: npm ci.",
  );
  requireStep(
    command("mise", ["run", "//apps/web:db:up"]),
    "Database servers: start Docker and check ports 5433 and 5434 are free.",
  );
  requireStep(
    command("mise", ["run", "//apps/web:db:migrate"], { show: true }),
    "Development database: this branch's own, with this checkout's migrations.",
  );
  console.log(
    "Installing test browsers (mise run //apps/web:browsers:install)...",
  );
  requireStep(
    command("mise", ["run", "//apps/web:browsers:install"], {
      timeout: BROWSER_INSTALL_TIMEOUT_MS,
    }),
    "Test browsers: Playwright's Chromium and WebKit are installed.",
  );
  console.log(
    "Ready. Run mise run dev, then open http://localhost:3000.\nSign-in emails are JSON files in the configured EMAIL_OUTBOX_DIR under apps/web. Or run mise run sign-in-link EMAIL to print a sign-in link at once.\nRun mise run doctor to check this environment, and mise run test for every test.",
  );
}

if (process.argv.length > 2) {
  reportFailure(new Error("Usage: mise run setup"));
} else {
  await setup().catch(reportFailure);
}
