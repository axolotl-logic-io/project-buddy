// `mise run deploy`: releases integration to production, the way
// docs/project-practices.md describes. It reads only origin's branches, so
// the checkout and its working tree stay as they are.
//
// 1. Stops when main holds content integration lacks, or when there is
//    nothing to release.
// 2. Waits for CI and Integration preview on integration's head, and stops if
//    either fails.
// 3. Sorts the new migrations, and stops on any the live build might not run
//    with (see release-migrations.ts). Those releases go by hand.
// 4. Opens the integration-to-main release PR, or updates the open one, and
//    lists its changes and release checks.
// 5. Waits for the PR's required checks, merges it, and follows the Release
//    workflow, which builds, migrates, promotes and smoke-tests production.
//
// `mise run deploy --dry-run` stops after step 3 and prints the PR it would open.
// Needs `gh auth login` with rights to merge into main.
import { execFileSync } from "node:child_process";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { classifyMigrations, type Migration } from "./release-migrations.ts";

const MAIN = "origin/main";
const INTEGRATION = "origin/integration";
const PRODUCTION_URL = "https://project-buddy-rust.vercel.app";
// The workflows that must pass on integration's head before a release.
const INTEGRATION_WORKFLOWS = ["CI", "Integration preview"];
const RELEASE_WORKFLOW = "release.yml";
const MIGRATIONS = "apps/web/drizzle";
const SQL_EXTENSION = /\.sql$/u;
// The PR a first-parent commit came from: "Merge pull request #12 from ..."
// or "Title (#12)".
const PR_NUMBER = /#(?<number>\d+)/u;
const SHORT_SHA_LENGTH = 8;
// How long to wait for GitHub to list the checks or runs a push starts.
const APPEAR_TRIES = 30;
const APPEAR_PAUSE_MS = 10_000;

class Stop extends Error {}

function shortSha(sha: string): string {
  return sha.slice(0, SHORT_SHA_LENGTH);
}

function output(command: string, args: readonly string[]): string {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

// Runs a command with its output on the terminal, and throws if it fails.
function follow(command: string, args: readonly string[]): void {
  execFileSync(command, args, { stdio: "inherit" });
}

function succeeds(command: string, args: readonly string[]): boolean {
  try {
    execFileSync(command, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

interface Run {
  readonly databaseId: number;
  readonly workflowName: string;
  readonly status: string;
  readonly conclusion: string;
}

function runsFor(sha: string, workflow?: string): Run[] {
  const args = ["run", "list", "--commit", sha, "--limit", "20"];
  if (workflow !== undefined) {
    args.push("--workflow", workflow);
  }
  args.push("--json", "databaseId,workflowName,status,conclusion");
  const runs: Run[] = JSON.parse(output("gh", args));
  return runs;
}

// Waits for a workflow run to finish, and stops unless it passed.
function awaitRun(run: Run, what: string): void {
  if (run.status !== "completed") {
    say(`Waiting for ${what}...`);
    if (
      !succeeds("gh", ["run", "watch", String(run.databaseId), "--exit-status"])
    ) {
      throw new Stop(`${what} failed. See: gh run view ${run.databaseId}`);
    }
    return;
  }
  if (run.conclusion !== "success") {
    throw new Stop(
      `${what} ended ${run.conclusion}. See: gh run view ${run.databaseId}`,
    );
  }
}

function checkDivergence(): void {
  const base = output("git", ["merge-base", MAIN, INTEGRATION]);
  if (!succeeds("git", ["diff", "--quiet", base, MAIN])) {
    throw new Stop(
      "main holds content integration lacks. Merge main into integration first.",
    );
  }
}

function checkIntegration(sha: string): void {
  // gh lists the newest run first; only each workflow's newest run counts.
  const runs = runsFor(sha);
  for (const workflow of INTEGRATION_WORKFLOWS) {
    const run = runs.find((candidate) => candidate.workflowName === workflow);
    if (!run) {
      throw new Stop(`${workflow} has no run on integration's head ${sha}.`);
    }
    awaitRun(run, `${workflow} on integration`);
  }
}

function newMigrations(): Migration[] {
  const changed = output("git", [
    "diff",
    "--name-status",
    MAIN,
    INTEGRATION,
    "--",
    `${MIGRATIONS}/*.sql`,
  ]);
  const migrations: Migration[] = [];
  for (const line of changed.split("\n").filter(Boolean)) {
    const [status, path] = line.split("\t");
    if (status !== "A" || !path) {
      throw new Stop(
        `Release migrations must be new files, but ${path} is ${status}. Release it by hand.`,
      );
    }
    const name = path.slice(MIGRATIONS.length + 1).replace(SQL_EXTENSION, "");
    migrations.push({
      name,
      sql: output("git", ["show", `${INTEGRATION}:${path}`]),
    });
  }
  return migrations;
}

function migrationLines(migrations: readonly Migration[]): string[] {
  const classified = classifyMigrations(migrations);
  const unsafe = classified.filter((migration) => migration.needsReview.length);
  if (unsafe.length > 0) {
    const listed = unsafe
      .map(
        (migration) =>
          `${migration.name}:\n${migration.needsReview.map((s) => `  ${s}`).join("\n")}`,
      )
      .join("\n");
    throw new Stop(
      `These statements might not work with the live build, so release them by hand:\n${listed}`,
    );
  }
  if (classified.length === 0) {
    return ["- Migrations: none."];
  }
  return classified.map(
    (migration) =>
      `- Migration \`${migration.name}\` is additive and works with the live build: it ${migration.additive.join(", ")}.`,
  );
}

// The release's changes: each first-parent commit on integration since main,
// named by its PR's title when it came from one.
function changeLines(): string[] {
  const subjects = output("git", [
    "log",
    "--first-parent",
    "--reverse",
    "--format=%s",
    `${MAIN}..${INTEGRATION}`,
  ]);
  return subjects
    .split("\n")
    .filter(Boolean)
    .map((subject) => {
      const { number } = PR_NUMBER.exec(subject)?.groups ?? {};
      if (!number) {
        return `- ${subject}`;
      }
      const title = output("gh", [
        "pr",
        "view",
        number,
        "--json",
        "title",
        "--jq",
        ".title",
      ]);
      return `- ${title} (#${number}).`;
    });
}

function releaseBody(sha: string, migrations: readonly string[]): string {
  return [
    "Merges `integration` into `main`.",
    "",
    "## Changes",
    "",
    ...changeLines(),
    "",
    "## Release checks",
    "",
    "- Branch divergence: `main` holds only merge commits that integration already contains; no content differs.",
    `- Integration checks: ${INTEGRATION_WORKFLOWS.join(" and ")} passed on ${shortSha(sha)}.`,
    ...migrations,
    "",
    "Opened by `mise run deploy`.",
  ].join("\n");
}

// Opens the release PR, or updates the open one, and returns its number.
function openReleasePr(title: string, body: string): string {
  const open = output("gh", [
    "pr",
    "list",
    "--base",
    "main",
    "--head",
    "integration",
    "--state",
    "open",
    "--json",
    "number",
    "--jq",
    ".[0].number // empty",
  ]);
  if (open) {
    follow("gh", ["pr", "edit", open, "--title", title, "--body", body]);
    return open;
  }
  const url = output("gh", [
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    "integration",
    "--title",
    title,
    "--body",
    body,
  ]);
  return url.split("/").at(-1) ?? url;
}

// The checks main's branch protection requires, such as lint, test and
// preview.
function requiredCheckNames(): string[] {
  return output("gh", [
    "api",
    "repos/{owner}/{repo}/branches/main/protection/required_status_checks",
    "--jq",
    ".contexts[]",
  ])
    .split("\n")
    .filter(Boolean);
}

// Whether GitHub lists every required check on the PR yet. Until it lists
// one, `gh pr checks` fails with "no checks reported"; until it lists them
// all, watching would end before the missing ones run.
function listsRequiredChecks(pr: string, names: readonly string[]): boolean {
  try {
    const listed = output("gh", [
      "pr",
      "checks",
      pr,
      "--required",
      "--json",
      "name",
      "--jq",
      ".[].name",
    ]).split("\n");
    return names.every((name) => listed.includes(name));
  } catch {
    return false;
  }
}

async function awaitRequiredChecks(pr: string): Promise<void> {
  say(`Waiting for the required checks on #${pr}...`);
  const names = requiredCheckNames();
  for (let tries = 0; tries < APPEAR_TRIES; tries += 1) {
    if (listsRequiredChecks(pr, names)) {
      const args = ["pr", "checks", pr, "--required", "--watch", "--fail-fast"];
      if (succeeds("gh", args)) {
        return;
      }
      throw new Stop(
        `#${pr}'s required checks did not pass. See: gh pr checks ${pr}`,
      );
    }
    await sleep(APPEAR_PAUSE_MS);
  }
  throw new Stop(
    `GitHub never listed all of the required checks on #${pr}: ${names.join(", ")}.`,
  );
}

async function followRelease(mergeSha: string): Promise<void> {
  for (let tries = 0; tries < APPEAR_TRIES; tries += 1) {
    const [run] = runsFor(mergeSha, RELEASE_WORKFLOW);
    if (run) {
      awaitRun(run, "the production release");
      return;
    }
    await sleep(APPEAR_PAUSE_MS);
  }
  throw new Stop(
    `No Release run started for ${mergeSha}. See the Actions tab.`,
  );
}

async function deploy(dryRun: boolean): Promise<void> {
  follow("git", ["fetch", "--quiet", "origin", "main", "integration"]);
  checkDivergence();
  if (succeeds("git", ["diff", "--quiet", MAIN, INTEGRATION])) {
    say("Nothing to release: main already holds integration's content.");
    return;
  }
  const sha = output("git", ["rev-parse", INTEGRATION]);
  checkIntegration(sha);
  const migrations = migrationLines(newMigrations());
  const title = `Release ${new Date().toISOString().slice(0, 10)}`;
  const body = releaseBody(sha, migrations);
  if (dryRun) {
    say(`${title}\n\n${body}`);
    return;
  }
  const pr = openReleasePr(title, body);
  await awaitRequiredChecks(pr);
  follow("gh", ["pr", "merge", pr, "--merge", "--match-head-commit", sha]);
  const mergeSha = output("gh", [
    "pr",
    "view",
    pr,
    "--json",
    "mergeCommit",
    "--jq",
    ".mergeCommit.oid",
  ]);
  await followRelease(mergeSha);
  say(`Released ${shortSha(sha)} to ${PRODUCTION_URL}`);
}

// The arguments, which may only be --dry-run. Anything else stops before any
// change, so a mistyped flag never releases.
function isDryRun(args: readonly string[]): boolean {
  const unknown = args.filter((arg) => arg !== "--dry-run");
  if (unknown.length > 0) {
    throw new Stop(`Unknown arguments: ${unknown.join(" ")}`);
  }
  return args.length > 0;
}

try {
  await deploy(isDryRun(process.argv.slice(2)));
} catch (error) {
  if (error instanceof Stop) {
    process.stderr.write(`mise run deploy stopped: ${error.message}\n`);
    process.exit(1);
  }
  throw error;
}
