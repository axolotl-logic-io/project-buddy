## Behaviour

1. **Different databases per run.** Two runs, in one checkout or in two, get different databases. With no port set, each run's port is the one its free-port source gave.
2. **A generated database.** When `DATABASE_URL` names no database (no path, or just `/`), the run makes up a name. The generated database is on the same server, with the same user and password. It passes `checkTestDatabase`, and its name is at most 40 characters, so a scratch database's `<name>_<suffix>` stays within Postgres's 63-character identifier limit.
3. **A free port.** When `E2E_PORT` is unset, the run takes an unprivileged port (1024 or above) that nothing listens on when the run asks for it.
4. **Explicit settings are honoured.** A database name or port set explicitly, in `.env.test` or the environment, is used as given, and the run never asks for a free port then. A named database is reset and migrated at the run's start and kept at its end, as `npm run test-db:reset` does today.
5. **The guards still hold.** A run's environment is refused unless its server is on this machine (`checkTestDatabase`'s "not on this machine" and "a Neon database" errors). A run also refuses, before it runs its command or touches a database, when `checkTestEnvironment()`'s other checks fail, such as `TUTOR_MODEL` not being `"mock"`. These checks still pass when the process's own `DATABASE_URL` names no database, as `.env.test` will.
6. **A run's own database is dropped when it ends.** The run creates and migrates its generated database before its command runs. It drops the database when the command ends, whether the command passes, fails or throws. The run answers the command's exit code, or rejects with the command's error.
7. **What counts as stale.** A database is stale only when its name is one a run generated, or a scratch database beside one (`<generated>_<suffix>`), and that run's process no longer exists. By default the run asks the operating system: process 1 always counts as running, and a process id no process has counts as ended. A name no run generated is never stale, whatever it looks like (`project_buddy_e2e`, `project_buddy_e2e_update_manual`, `pb_issue_475`, `postgres`).
8. **Stale databases are cleaned up.** Before it creates its own database, a run drops every stale database on the local test server, scratch databases included. It keeps the databases of runs whose processes are still running.
9. **The commands go through the run.** `npm run test:server` and `npm run test:e2e` (and so `npm run test:visual`) each run their Vitest or Playwright command through the run. They need no setup by hand, return the command's exit code, and drop the run's database on Ctrl-C or SIGTERM too. `npm run test-db:reset` and `npm run test-db:reindex` keep working on a database that `.env.test` names explicitly.
10. **The docs.** `.env.test.example` gives only the server, user and password in `DATABASE_URL`. It comments out the database name and `E2E_PORT`, and says that setting either pins it. The root `AGENTS.md` test-database rule, `apps/web/AGENTS.md`, and the README say how a run gets its database and port.

## Out of scope

- CI workflows (one job per machine) and the production and preview databases.
- The issue pipeline's own setup (`commands.setup`/`teardown` in the operator's repo config, which makes `pb_issue_<n>` databases per job; see the wiki's Running-the-Issue-Pipeline). An explicit name there keeps being honoured. Dropping it, so jobs use per-run databases, is the operator's change.
- The default `E2E_PORT` of 3100 in `readEndToEndPort()` (`apps/web/src/env.ts:164`), which a direct `playwright test` run without the wrapper still uses.

## Design

**One deep module, `apps/web/scripts/test-db/run-environment.ts`** (stub committed). It holds the decision of how a run gets its database and port (information hiding). Callers pass the settings and a command, and the module handles naming, checks, stale cleanup, reset and the drop itself (pull complexity downward). `test-database.ts` stays the one place that touches databases, and every create and drop still goes through `checkTestDatabase` (`apps/web/scripts/test-db/test-database.ts:122`).

- `resolveRunEnvironment(settings, sources)`:
  - **Name.** When `new URL(settings.databaseUrl).pathname` is empty or `/`, the run generates `project_buddy_e2e_<pid>_<8 lowercase hex>`. The hex comes from `node:crypto` `randomBytes(4)`, and `pid` is `sources.pid`, `process.pid` by default. The name is at most 37 characters, even for a 10-digit pid. It fits `PLAIN_DATABASE_NAME` (`test-database.ts:38`) and is never reserved (`test-database.ts:40`). The URL keeps the user, password, host, port and query, with the name as its path. The result goes through `checkTestDatabase`, which throws for a remote or Neon host.
  - **Port.** With no `settings.port`, the port comes from `sources.freePort`, `findFreePort` by default.
  - **Result.** `generated` is true only for a made-up name.
- `findFreePort()`: listen on port 0 with `node:net` `createServer()`, on the same interfaces `next start` binds, read `address().port`, and close the server before it resolves.
- `isStaleTestDatabase(name, isAlive)`:
  - **Matching.** A top-level named regex with the `u` flag, such as `^project_buddy_e2e_(?<pid>\d+)_[\da-f]{8}(?:_[\d_a-z]+)?$`, matches a generated name and the scratch names beside it. The pid group is read by destructuring. The result is `!isAlive(pid)`.
  - **Liveness.** The default `isAlive` is `process.kill(pid, 0)`. It returns true when the call succeeds or throws `EPERM`, and false on any other error, such as `ESRCH`.
- `runWithTestDatabase(settings, command, sources)`, in order:
  1. resolve the environment;
  2. apply `checkTestEnvironment()`'s tutor and email checks (`test-database.ts:131-142`) to the resolved database, without re-reading the process's nameless `DATABASE_URL`. Refactor `checkTestEnvironment` to suit, for example with a `databaseUrl` parameter that defaults to `readTestDatabaseUrl()`. The existing callers keep their calls: `playwright.config.ts:69`, `vitest.server-setup.ts:14`, `scratch-database-test-kit.ts:16`, `reset.ts:6` and `reindex.ts:6`;
  3. list the server's databases, through a new `test-database.ts` function that reads `select datname from pg_database` on the maintenance database (`onMaintenanceDatabase`, `test-database.ts:95`). Drop each stale one other than the run's own with `dropTestDatabase` (`test-database.ts:146`), which is idempotent (`drop … if exists`), so two runs cleaning up at once don't conflict;
  4. `resetTestDatabase` (`test-database.ts:156`) on the run's database;
  5. `try { return await command(environment) } finally { if generated, dropTestDatabase }`.
- **Entry point, `apps/web/scripts/test-db/run.ts` (new, the implementer's).** The command is the argv after the script, skipping a leading `--`. The entry point runs `runWithTestDatabase({ databaseUrl: readTestDatabaseUrl(), port: readEndToEndPortIfSet() }, spawnCommand)`.
  - **Spawning.** `spawnCommand` spawns the command with `stdio: "inherit"` and the environment plus `DATABASE_URL` and `E2E_PORT`. It resolves with the child's exit code, or 1 when the child was killed by a signal.
  - **Signals.** On SIGINT and SIGTERM the wrapper forwards the signal to the child and stays alive, so the `finally` drop runs.
  - **Exit.** It sets `process.exitCode` and prints one line naming the database and port, as `reset.ts:8` does.
- **`apps/web/src/env.ts`.** It is the one module that reads the environment (AGENTS.md lint rules, `env.ts:1`). It gains:
  - `readEndToEndPortIfSet(): number | undefined`, which validates as `readEndToEndPort` does (`env.ts:164`);
  - a helper that returns the process environment with given variables added, for the spawn.

  `readTestDatabaseUrl` (`env.ts:49`) keeps its `.env.test` message.
- **`apps/web/biome.jsonc`.** Add the narrowest overrides, as `scripts/release/smoke.ts` has (`biome.jsonc:248-266`):
  - `noNodejsModules` off for `run-environment.ts` and `run.ts`;
  - `noConsole` off for `run.ts`, beside `reset.ts` and `reindex.ts` (`biome.jsonc:238`).

  Use `node:process` imports rather than the `process` global.
- **`apps/web/package.json:16-17`.** These are the run's command lines:
  - `test:server`: `npm run test-db:up && node --env-file=.env.test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/test-db/run.ts node ../../node_modules/vitest/vitest.mjs run --config vitest.server.config.mts`;
  - `test:e2e`: `npm run test:server && npm run test-db:up && node --env-file=.env.test … scripts/test-db/run.ts node ../../node_modules/@playwright/test/cli.js test`.

  The Playwright command stays last, so `test:visual`'s appended `--project 'visual*'` reaches it. Each step gets its own fresh database, as the two resets do today. Triage's plan put both steps in one wrapper call, but nothing needs one database for both, and this keeps `test:e2e` composed from `test:server`. `test-db:reset` and `test-db:reindex` are unchanged.
- **Unchanged consumers.** They read the run's `DATABASE_URL` and `E2E_PORT` from the inherited environment:
  - Playwright's web server (`playwright.config.ts:143-150`), where the process environment wins over Next's `.env.local` and `.env`;
  - `e2e/fixtures.ts:146` (`getDb()`);
  - `vitest.server-setup.ts:14`;
  - `scratchDatabase` (`src/test-database/scratch-database-test-kit.ts:15`), whose `<run name><suffix>` becomes `project_buddy_e2e_<pid>_<hex>_update_manual` and the like, at most 52 characters. That name is covered by stale cleanup.

  Update their comments that say ".env.test names" the database (`playwright.config.ts:1-5`, `vitest.server.config.mts:4-6`, `test-database.ts:1-7`, `compose.test-db.yml:4-6`, the scratch kit's header).
- **Docs** (Behaviour 10):
  - `.env.test.example:7-15`;
  - `AGENTS.md:78`;
  - `apps/web/AGENTS.md:5` and `:10`;
  - `README.md:53`, `:91` and `:93`. Line 93's "port 3000" is stale: say the run's own port.
  - `apps/web/use-cases/README.md:7`.

  Keep the wording consistent with `apps/issue-pipeline/agents/issue-pipeline-writer.md:17`.

**Practices followed:**
- Deep modules, information hiding, pull complexity downward, and define errors out of existence (idempotent drops, and a missing name means "make one up") (Coding Practices Digest, Design).
- No `any`, `!` or `as`. Explicit parameter and return types, top-level named `u` regexes, no ternaries (Digest, Types and Lint).
- Env reads only through `src/env.ts`, and console output only in entry points.
- Tests pin promised behaviour (`tests-pin-promised-behaviour`). No test depends on timing (`flakes-are-failures`): the pid, liveness and port sources are injected, and existence is read from `pg_database`, never waited for.
- The server tests are `src/**/*.server.test.ts` (`use-cases-drive-tests`).

**Wiki decision:** new `test-run-own-database` (see Wiki updates). It amends the "One server suite" and "Whole-database tests own a database" bullets of Server-test design.

## Test interfaces

- `findFreePort(): Promise<number>`, in `apps/web/scripts/test-db/run-environment.ts` (new).
- `resolveRunEnvironment(settings: RunSettings, sources?: Partial<RunSources>): Promise<RunEnvironment>`, in the same file (new).
- `isStaleTestDatabase(name: string, isAlive?: (pid: number) => boolean): boolean`, in the same file (new).
- `runWithTestDatabase(settings: RunSettings, command: RunCommand, sources?: Partial<RunSources>): Promise<number>`, in the same file (new).
- The `npm run test:server` and `npm run test:e2e` CLIs (`apps/web/package.json:16-17`, changed).
- `.env.test.example` (config, changed).

The types are:
- `RunSettings = { databaseUrl: string; port?: number }`;
- `RunSources = { pid: number; freePort: () => Promise<number>; isAlive: (pid: number) => boolean }`;
- `RunEnvironment = { database: TestDatabase; port: number; generated: boolean }`;
- `RunCommand = (environment: RunEnvironment) => Promise<number>`.

## Tests

**`apps/web/scripts/test-db/run-environment.test.ts`.** Unit tests in Node under `npm test`; they need no database. All of them fail today because the stubs throw or reject with "not implemented (#475)".

- "a run's own database and port":
  - "two runs in one checkout get different databases" (`resolveRunEnvironment`, Behaviour 1);
  - "runs in two checkouts get different databases and ports" (1);
  - "is a generated database on the server and user .env.test gives" (2);
  - "is generated when DATABASE_URL's path names no database" (2);
  - "has a name short enough for a scratch database beside it" (2);
  - "takes an unprivileged port nothing listens on when none is set" (3; it checks that a `fetch` to the port is refused).
- "a run's database or port set explicitly":
  - "uses a database name set explicitly as given, and keeps it" (4);
  - "uses a port set explicitly as given", where a free-port source that rejects shows it is never asked (4).
- "a run's server": "refuses a server that is not on this machine" (5).
- "a free port": "is unprivileged and nothing listens on it" (`findFreePort`, 3).
- "a stale test database" (`isStaleTestDatabase`, 7):
  - "is a generated one whose run's process has ended";
  - "is never one whose run's process is still running";
  - "includes a scratch database beside an ended run's";
  - "is never a name set explicitly or the server's own";
  - "by default, belongs to a process that no longer exists", which uses pid 1 and pid 2147483647.
- "a run refuses, before it runs its command," (`runWithTestDatabase`, 5):
  - "a server that is not on this machine";
  - "a run whose tutor would call Claude". It stubs the process's `DATABASE_URL` to a nameless server URL, so a wrapper that calls today's `checkTestEnvironment()` unchanged fails it.

**`apps/web/src/test-database/test-run.server.test.ts`.** Server tests under `npm run test:server`; they need the Docker test database. They fail today because `runWithTestDatabase` and `resolveRunEnvironment` reject with "not implemented (#475)". They pass the server's connection string themselves, built from the run's `DATABASE_URL` with its path removed, so they never reset the outer run's database. They read existence from `pg_database`.

- "a test run's own database" (`runWithTestDatabase`, 6):
  - "is created and migrated for its command, and dropped when it ends". It also stubs a nameless `DATABASE_URL` (5).
  - "is dropped when its command fails, and the run fails with it": the exit code 3 is returned;
  - "is dropped when its command throws".
- "a test run's database named explicitly": "is reset, migrated and kept when the run ends" (4). It uses `scratchDatabase("_kept_by_run")` and drops it afterwards.
- "a test run's cleanup": "drops what killed runs left, and keeps the databases in use" (8).
  - **Planting.** It plants an empty database, and a scratch one beside it, under names generated for pid 1. It plants each with a single `create database`, so no other run's cleanup can catch it half-made.
  - **Liveness.** It tells the run that only pid 1 has ended. Real runs never take pid 1's databases as stale, so a concurrent run on the machine can't disturb the test, and this test drops nothing of theirs.
  - **Checks.** It checks that both planted databases are gone and that the outer run's database is kept. It drops the planted ones in `finally`.

**Not unit-tested.** Behaviour 9 (the npm scripts, signal forwarding) and 10 (docs). The acceptance run of `npm run test:server` and `npm run test:e2e`, under the new scripts, checks 9, and review checks 10. A test that spawned npm or sent signals would depend on timing.

Existing tests keep passing: `scripts/test-db/test-database.test.ts` and `src/env.test.ts`.

## Wiki updates

- **Decisions-Code-and-tooling:**
  - new decision `test-run-own-database`, with the rejected alternatives;
  - the Server-test design bullets "One server suite" and "Whole-database tests own a database" are updated to match.
- **Decisions:** an index entry for `test-run-own-database`.
- **Coding-Practices-Digest:** the site-tests bullet on server tests says they run in the run's own database.

## Assumptions and risks

- **The pipeline's setup.** As triage noted, the explicit names in the pipeline's setup (`pb_issue_<n>`, per the wiki's Running-the-Issue-Pipeline) keep being honoured. Pipeline jobs therefore keep their per-job database until the operator drops the name from that setup.
- **Port race.** A port found free can be taken by another process before `next start` binds it, after a build of a minute or so. Playwright then fails with "port already used" (`reuseExistingServer: false`, `playwright.config.ts:147`) rather than testing the wrong server. The chance is small, and holding the port open until the server starts would need changes to Playwright's web-server start.
- **Pid reuse.** A killed run's pid may be reused by a live process, which delays its cleanup until that process ends. It never causes a wrong drop. The random part keeps a new run from colliding with a stale name.
- **SIGKILL.** A wrapper killed with SIGKILL can't drop its database. The next run's stale cleanup does.
- **A pinned lookalike.** A developer who pins a name shaped like a generated one (`project_buddy_e2e_<digits>_<8 hex>`) could see it dropped once the matching pid has ended. The docs should say to pin plain names.
- **Unrun server tests.** The server test file was type-checked and linted but not run in this session: this job has no `.env.test`. Its failure today is the stubs' rejection.
- No instructions to change the task were found in the code or the wiki.

## Sources

- **Issue:** #475 and its triage comment.
- **Code:**
  - `apps/web/package.json:16-17,27-28`;
  - `apps/web/scripts/test-db/test-database.ts` (`:38`, `:40`, `:95`, `:122`, `:131`, `:146`, `:156`);
  - `apps/web/scripts/test-db/reset.ts`, `apps/web/scripts/test-db/reindex.ts`;
  - `apps/web/src/env.ts:49`, `:164`;
  - `apps/web/playwright.config.ts:1-5`, `:69`, `:143-150`;
  - `apps/web/vitest.server-setup.ts:14`, `apps/web/vitest.server.config.mts`, `apps/web/vitest.config.mts:139-151`;
  - `apps/web/src/test-database/scratch-database-test-kit.ts:15`;
  - `apps/web/src/manual/update-manual.server.test.ts:29`, `apps/web/src/db/keep-data-through-update.server.test.ts:26`;
  - `apps/web/src/db/client.ts:83`, `apps/web/e2e/fixtures.ts:146`;
  - `apps/web/biome.jsonc:225-276`, `apps/web/compose.test-db.yml`, `apps/web/.env.test.example`.
- **Docs:** `AGENTS.md:78`, `apps/web/AGENTS.md:5,10`, `README.md:53,91,93`, `apps/issue-pipeline/agents/issue-pipeline-writer.md:17`.
- **Wiki:**
  - Coding-Practices-Digest;
  - Decisions-Code-and-tooling (`e2e-visual-and-auth-only`/Server-test design, `tests-pin-promised-behaviour`, `flakes-are-failures`);
  - Running-the-Issue-Pipeline (the setup's `pb_issue_<n>` databases).
- **Web:** Node.js `process.kill(pid, 0)` and `--env-file` precedence (environment wins), https://nodejs.org/api/process.html#processkillpid-signal and https://nodejs.org/api/cli.html#--env-filefile; PostgreSQL identifier length (63 bytes), https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS.

<!-- end of spec -->
