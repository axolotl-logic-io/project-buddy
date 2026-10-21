# Agent rules for the site

Read the root `AGENTS.md` first. Run these commands in this folder, `apps/web/`, or from anywhere with `mise //apps/web:<task>`.

- `npm run check` runs Biome, the type check, the workflow script tests and the unit and browser tests (`*.browser.test.tsx`, in Chromium and WebKit); `npm run test:e2e` runs the end-to-end and screenshot tests against the local test database named in `.env.test`. Both must pass, and a flaky test is a failure (`flakes-are-failures`).
- Every use case in `use-cases/` has a test or `describe` titled exactly its slug, wherever that test lives. A change in behaviour updates the use case and its test.
- Playwright e2e tests cover only visual regressions (`e2e/visual/`) and the auth workflows (`e2e-visual-and-auth-only`). The auth workflows are sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access gate, where a signed-out visitor, or one whose session has lapsed, is sent to log in. Every other case is tested in Vitest:
  - A case that needs a real server or database gets a server test against the test database in `.env.test`. It calls the Server Action, route handler or store with real users and sessions, not through a browser.
  - A case that needs only the UI gets a component or browser test in `test/`.
- A server test is a `test/**/*.server.test.ts` file. `npm run test:server` resets the test database, loads `.env.test` and runs them in Node (`vitest.server.config.mts`); `npm run test:e2e` runs it first, and `npm test` and `npm run check` never do, so they need no database. It needs Docker, like the e2e tests. Each test makes what it needs with the kit in `test/test-database/`, and the setup file (`vitest.server-setup.ts`) deletes it after the test:
  - `testUser()` (`user-test-kit.ts`): a new user of the test's own, deleted after the test with everything it owns. Make one per user the test needs, such as a second user for what one user can't see of another's.
  - `testData(user)` (`data-test-kit.ts`): the user's projects, chats and manual sections, made through the app's stores.
  - `signIn(user)`, `signOut()` and `lapsed(user)` (`session-test-kit.ts`): the session cookie that next/headers' `cookies()` serves, so `src/auth/current-user.ts` runs unmocked in Server Actions and pages. Each test starts signed out. `requestWithSession(url, init)` makes a `Request` that carries the cookie, for a route handler such as `POST /api/chat`.
  - `expectRedirect(action, path)` and `expectNotFound(action)` (`navigation-test-kit.ts`): pass only if the action calls Next's `redirect(path)` or `notFound()`.
  - `afterTasksDone()` (`after-test-kit.ts`): the setup file serves its `after()` as next/server's in every server test, so no test file mocks next/server; awaiting it waits for every task `after()` started, and the tasks those start.
  - `sendChatMessage(chatId, text)` (`chat-test-kit.ts`): the signed-in user's message through `POST /api/chat`, answered as `{ status, body, chunks }` for any status, once every `after()` task is done. `tutorReply`, `tutorPrompt` and `tutorEdits` build on it; `postMessage` and `sendToEnd` send as a given user; `userWithChat`, `question`, `formOf`, and the readers of saved messages (`messageText`, `citedSections`, `savedConversation`, `exchange`) are there too.
  - `spend(user, microUsd)`, `spendInMonthAfter`, `spentThisMonth`, `resetDaysSince` and `quotaMessage` (`spend-test-kit.ts`): the monthly quota's spend and reset days, whatever month's end a run crosses. `e2e/visual/account.spec.ts` uses it too.
  - `twoUsers()` (`two-users-test-kit.ts`): two users with their data, the first signed in, for `use_case_private_data`.
  - `saveFromEditor` and `restoreFromHistory` (`memory-form-test-kit.ts`): the memory page's forms, sent through their Server Actions.
  - `stubStorageDown` and `restoreStorage` (`storage-down-test-kit.ts`): a database that can't be reached, for `use_case_storage_unavailable`.
  - `scratchDatabase(suffix)` (`scratch-database-test-kit.ts`): a database of the test's own, for a test that migrates or rebuilds a whole database.
  - `kit.server.test.ts` tests the kit itself.
  - A server test titled exactly by a `use_case_*` slug covers that case; other server tests keep plain titles. No new e2e test goes outside `e2e/visual/` and the auth workflows.
  - Keep server tests fast. The kit's data lasts one test, so each test makes its own; share only read-only set-up within a file, in `beforeAll`. Run independent set-up and reads together (`Promise.all`), but never memory edits or other writes whose order matters. Each `tutorReply`, `tutorPrompt` or `tutorEdits` is a full `POST /api/chat` round trip, so send only the ones an assertion needs. Never sleep, and don't use `/mock-slow` unless the case is about a slow reply. `SERVER_TEST_TIMEOUT_MS` in `vitest.server.config.mts` is there so a busy machine fails no test on timing, not as a budget to fill.
- `use-cases/use-cases.test.ts` enforces `e2e-visual-and-auth-only` against the auth cases in `use-cases/auth-cases.ts`: outside `e2e/visual/`, an e2e test titled by any other case, or inside a group titled by one, fails it, and so does an entry of the list that isn't a case. `e2e/fixtures.ts` makes its accounts and data with the server tests' kit in `test/test-database/`, `testUser()` and `testData(user)`.
- A change that alters a page updates its screenshot baselines (`npm run test:visual:update`); look at every changed image before committing it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
