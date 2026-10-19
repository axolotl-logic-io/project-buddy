# Agent rules for the site

Read the root `AGENTS.md` first. Run these commands in this folder, `apps/web/`, or from anywhere with `mise //apps/web:<task>`.

- `npm run check` runs Biome, the type check, the workflow script tests and the unit and browser tests (`*.browser.test.tsx`, in Chromium and WebKit); `npm run test:e2e` runs the end-to-end and screenshot tests against a database of the run's own on the local test server that `.env.test` gives, on a port of its own (`test-run-own-database`). Both must pass, and a flaky test is a failure (`flakes-are-failures`).
- Every use case in `use-cases/` has a test or `describe` titled exactly its slug, wherever that test lives. A change in behaviour updates the use case and its test.
- Playwright e2e tests cover only visual regressions (`e2e/visual/`) and the auth workflows (`e2e-visual-and-auth-only`). The auth workflows are sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate, where a signed-out visitor, or one whose session has lapsed, is sent to log in. Every other case is tested in Vitest:
  - A case that needs a real server or database gets a server test against the test database. It calls the Server Action, route handler or store with real users and sessions, not through a browser.
  - A case that needs only the UI gets a component or browser test in `test/`.
- A server test is a `test/**/*.server.test.ts` file. `npm run test:server` loads `.env.test` and runs them in Node (`vitest.server.config.mts`) in a database of the run's own, which `scripts/test-db/run.ts` creates and migrates first and drops at the end, or in the one `.env.test` names, reset first and kept; `npm run test:e2e` and `test:visual` run it first in the same allocation, and `npm test` and `npm run check` never do, so they need no database. It needs Docker, like the e2e tests. Each test makes what it needs with the kit in `test/test-database/`, and the setup file (`vitest.server-setup.ts`) deletes it after the test:
  - A server test titled exactly by a `use_case_*` slug covers that case; other server tests keep plain titles. No new e2e test goes outside `e2e/visual/` and the auth workflows.
  - In server tests, share read-only set-up in `beforeAll`, and run independent set-up and reads together with `Promise.all`, but never memory edits or other writes whose order matters. Each `tutorReply`, `tutorPrompt` or `tutorEdits` is a full `POST /api/chat` round trip, so send only the ones an assertion needs. Don't use `/mock-slow` unless the case is about a slow reply. `SERVER_TEST_TIMEOUT_MS` in `vitest.server.config.mts` is there so a busy machine fails no test on timing, not as a budget to fill.
- `use-cases/use-cases.test.ts` enforces `e2e-visual-and-auth-only` against the auth cases in `use-cases/auth-cases.ts`: outside `e2e/visual/`, an e2e test titled by any other case, or inside a group titled by one, fails it, and so does an entry of the list that isn't a case. `e2e/fixtures.ts` makes its accounts and data with the server tests' kit in `test/test-database/`, `testUser()` and `testData(user)`.
- A change that alters a page updates its screenshot baselines (`npm run test:visual:update`); look at every changed image before committing it.

## Test wrapper import boundaries

The #475 subprocess fixtures have exactly four new `noNodejsModules` test-helper boundaries: `test/scripts/test-db/run-cli-test-kit.ts`, `fake-run-loader.ts`, `fake-run-database.ts` and `fake-run-child.ts` (the last three in the same directory). They provide controlled subprocess/socket/temporary-file, exact database-module substitution and IPC fixtures with bounded waits and owned cleanup.

No console or process-environment exception is granted. Environment access stays in `src/env.ts`; no dynamic-import workaround or production test-only export is allowed. The production wrapper's focused platform modules are separately enumerated in `biome.jsonc`; only Node imports are excepted there.

## Test database and port

Postgres runs in Docker behind Neon's local proxy on port 4444 (`compose.test-db.yml`). `.env.test` gives the server, user and password (`test-run-own-database`).

Stock `npm run test:server`, `test:e2e` and `test:visual` use `scripts/test-db/run.ts` on macOS and Linux/POSIX only. Each invocation exclusively creates and migrates its own database and reserves its own port. It stops its supported processes with bounded shutdown and escalation before dropping its generated database and scratch databases, pass or fail. Handled SIGINT/SIGTERM clean up; an uncatchable kill cannot.

After an uncatchable kill, a later run recovers only when a private ownership journal proves the runner and all registered processes/groups are gone. Age or a missing runner PID alone does not suffice. Unknown ownership means leave the database alone.

To pin a database, set a database name in `DATABASE_URL` in `.env.test` or the environment. To pin the site's port, set `E2E_PORT`. These overrides are independent; environment settings override `.env.test`. Explicitly named databases are reset first and kept. Default `.env.test.example` pins neither.

The entire `project_buddy_e2e_` namespace is reserved for generated databases and scratch databases and cannot be pinned. `checkTestEnvironment()` in `scripts/test-db/test-database.ts` requires localhost or 127.0.0.1, the mock tutor and file outbox before database changes.

Cleanup includes ordinary detached Playwright webServer/browser groups. There is no Windows support, no promise of generic Node/ps descendant containment, and no support for arbitrary caller commands deliberately daemonizing, escaping/reparenting before ownership is established, or evading the lifecycle protocol.

Keep only one full web suite scheduled at a time until #475 is accepted and operator setup is separately compatible.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
