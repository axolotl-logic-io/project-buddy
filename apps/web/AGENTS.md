# Agent rules for the site

Read the root `AGENTS.md` first. Run these commands in this folder, `apps/web/`, or from anywhere with `mise //apps/web:<task>`.

- `npm run check` is the fast default: Biome, the type check, the workflow and lane script tests and Node filesystem/repository guards, including the unchanged use-case guard, plus all six cheap in-process Vite guards (measured together at 1.62 seconds). `npm test` and `test:watch` select both `repository` and `vite-integration`; `test:vite` is a focused subset of that default. Costly stages are explicit opt-ins: `test:browser` (Chromium/WebKit, zones and touch), `test:integration` (guards plus Vite and all browser projects), `test:server`, `test:e2e` and `test:visual`. The Vite and browser commands need no `.env.test` or database; the Vite guards need no browser binaries either. A fast pass is not evidence for unrun browser/server/e2e stages. Keep timeouts, concurrency and assertions unchanged; optimize or isolate costly tasks to an authorized stage. See the [fast-default decision](../../docs/Decisions-Code-and-tooling.md#fast-default-checks). The orchestrator provides `.env.test` with its database and `E2E_PORT` pinned to the lane. For a manual run, copy `.env.test.example` to `.env.test` by hand and configure a local test database and an unused site port. Missing files are errors; commands never create/copy/rewrite them or allocate their own environment. Different concurrent runs need distinct lanes or manual configurations. Lane resources are reused, not dropped at a command's exit.
- `npm run test:e2e` runs `npm run test:server` followed by `npm run test:playwright`, only when server tests pass. Both use the supplied environment. `npm run test:playwright -- <file>` runs just that e2e file without server tests; provision/migrate its database first. `test:visual` runs server tests followed by the visual Playwright projects. Tests and check must pass; a flake is a failure (`flakes-are-failures`). Keep only one full web suite scheduled at a time until #475 is accepted and operator setup is separately compatible. Merging these scripts does not configure or install pipeline lane-slot wiring.
- Every use case in `use-cases/` has a test or `describe` titled exactly its slug, wherever that test lives. A change in behaviour updates the use case and its test.
- Playwright e2e tests cover only visual regressions (`e2e/visual/`) and the auth workflows (`e2e-visual-and-auth-only`). The auth workflows are sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate, where a signed-out visitor, or one whose session has lapsed, is sent to log in. Every other case is tested in Vitest:
  - A case that needs a real server or database gets a server test against the test database. It calls the Server Action, route handler or store with real users and sessions, not through a browser.
  - A case that needs only the UI gets a browser-mode component integration or feature-entrypoint test in `test/` (`*.browser.test.tsx`). It need not cover a whole application flow.
- A server test is a `test/**/*.server.test.ts` file. `npm run test:server` loads `.env.test`, resets and migrates its configured local database, then runs tests in Node (`vitest.server.config.mts`). It leaves the database and proxy provisioned. `test:e2e` and `test:visual` run it first; `npm test` and `npm run check` never do, so need no database. Each test makes what it needs with the kit in `test/test-database/`, and `vitest.server-setup.ts` deletes that data after each test:
  - A server test titled exactly by a `use_case_*` slug covers that case; other server tests keep plain titles. No new e2e test goes outside `e2e/visual/` and the auth workflows.
  - In server tests, share read-only set-up in `beforeAll`, and run independent set-up and reads together with `Promise.all`, but never memory edits or other writes whose order matters. Each `tutorReply`, `tutorPrompt` or `tutorEdits` is a full `POST /api/chat` round trip, so send only the ones an assertion needs. Don't use `/mock-slow` unless the case is about a slow reply. `SERVER_TEST_TIMEOUT_MS` in `vitest.server.config.mts` is there so a busy machine fails no test on timing, not as a budget to fill.
- `use-cases/use-cases.test.ts` enforces `e2e-visual-and-auth-only` against the auth cases in `use-cases/auth-cases.ts`: outside `e2e/visual/`, an e2e test titled by any other case, or inside a group titled by one, fails it, and so does an entry of the list that isn't a case. `e2e/fixtures.ts` makes its accounts and data with the server tests' kit in `test/test-database/`, `testUser()` and `testData(user)`.
- A change that alters a page updates its screenshot baselines (`npm run test:visual:update`); look at every changed image before committing it.

## Test database and port

The orchestrator supplies `.env.test` with a local database and `E2E_PORT` pinned to its lane. Test commands consume that file without allocating a database or port or tearing down lane resources. Manual runs use a file copied and configured by hand, with a distinct database and site port for each concurrent run. Environment settings override `.env.test`.

`checkTestEnvironment()` in `scripts/test-db/test-database.ts` requires localhost or 127.0.0.1, a safe database name, the mock tutor and file outbox before database changes. `test:server` resets and migrates the supplied database; it leaves the database and proxy provisioned.

See [Project practices](../../docs/project-practices.md#the-orchestrator-owns-the-environment) for lane setup, maintenance and focused test commands. Keep only one full web suite scheduled at a time until #475 is accepted and operator setup is separately compatible. Merging repository scripts does not configure or install pipeline lane-slot wiring.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
