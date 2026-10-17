## Behaviour

All paths are under `apps/web/` unless they start with `/` (the repo root).

1. **The check enforces the rule.** `use-cases/use-cases.test.ts` fails when an e2e test or `test.describe` outside `e2e/visual/` names a case that isn't an auth case. A declaration names its own slug title, or, if it has none, the slug title of the innermost group around it. The failure lists each such declaration as `<file>:<line> <title>`, and its message contains `e2e-visual-and-auth-only`. The logic is `outsideAuthCases(declarations, authCases)` in `use-cases/test-declarations.ts`. It returns those `at` strings and leaves out declarations that name no case, which the existing `testsOutsideCases` check already reports.
2. **The auth cases are one list.** `AUTH_CASES` in `use-cases/auth-cases.ts` holds exactly these 13 slugs: `use_case_sign_up`, `use_case_sign_up_existing_email`, `use_case_sign_up_wrong_invite_code`, `use_case_sign_up_locked_out`, `use_case_sign_in_by_link`, `use_case_sign_in_link_reused`, `use_case_sign_in_link_expired`, `use_case_too_many_sign_in_requests`, `use_case_visit_signed_out`, `use_case_return_signed_in`, `use_case_session_expired`, `use_case_sign_out`, `use_case_sign_out_everywhere`.
3. **Each auth case is a case.** `use-cases.test.ts` fails if an entry of `AUTH_CASES` is not a `## use_case_*` heading in `use-cases/*.md`.
4. **No case loses its test.** The other checks in `use-cases.test.ts` still pass: every case is named by an e2e or src test, or is pending; every slug title names a case; every e2e test outside `e2e/visual/` sits under a slug title; every link resolves.
5. **The e2e suite is visual plus auth.** `npm run test:e2e` runs only `e2e/visual/` and the 13 auth tests: `sign-up.spec.ts` (4), `sign-in.spec.ts` (3), `sign-in-limits.spec.ts` (1), `access.spec.ts` (2), `account.spec.ts` (`use_case_sign_out`, `use_case_sign_out_everywhere`), and `use_case_session_expired`, which may be in `when-things-go-wrong.spec.ts` or `access.spec.ts`. `playwright.config.ts` has one `webServer` and the projects `chromium`, `visual` and `visual-<device>` (one per device in `SHOT_DEVICES`). It has no `whole-database` project and no `grepInvert` on `chromium`.
6. **The emptied e2e setup is gone.** These files no longer exist: `e2e/memory-page.ts`, `e2e/quota-reset-days.ts`, `e2e/settings-page.ts`, `e2e/touch-targets.ts`, `e2e/storage-down-server.ts` and `e2e/whole-database.ts`. `buddy-page.ts`, `hold-form-submissions.ts`, `long-chat.ts` and `theme-page.ts` are already gone on the base. `databaseUrlEnvironment` in `src/env.ts`, whose only caller was the second server, is gone too, along with its test in `src/env.test.ts`.
7. **Every e2e helper export is used.** Each export of `e2e/fixtures.ts`, `e2e/chat-page.ts`, `e2e/page-helpers.ts`, `e2e/log-in.ts` and `e2e/sign-in-pages.ts` is imported by a remaining spec, an `e2e/visual/` file or `playwright.config.ts`.
8. **`fixtures.ts` keeps only what is used.** `e2e/fixtures.ts` exports `test` and `type TestData`. Its fixtures are `account`, `otherAccount`, `testData`, `clientAddress`, `otherClientAddress`, `newAddress` and the worker's `database`, if that is still needed. `otherTestData`, `deleteAccount`, `spend` and `spendInMonthAfter` are gone.
9. **`chat-page.ts` keeps only what is used.** `e2e/chat-page.ts` exports `buddyName`, `chatMessages`, `citations`, `exchange`, `lastMessage` and `sendMessage`. `openChat`, `manualSection`, `expectMessages`, `workingNotes`, `tutorPrompt` and `tutorEdits` are deleted. `fromUser` and `waitForComposer` stay as private helpers.
10. **`page-helpers.ts` keeps only what is used.** `e2e/page-helpers.ts` exports `alertIn` and `fillWhenReady`. `unique` is deleted, and `waitForHydrated` stays as a private helper of `fillWhenReady`.
11. **The sign-in helpers stay.** `e2e/log-in.ts` exports `logIn` and `testSessionCookie`. `e2e/sign-in-pages.ts` keeps all its exports. `e2e/outbox.ts`, `e2e/sign-in-clock.ts` and `e2e/pending-cases.ts` are unchanged.
12. **E2e fixtures use the server-test kit.** `e2e/fixtures.ts` makes `account` and `otherAccount` with `testUser()` and deletes them with `deleteTestUsers()` (`src/test-database/user-test-kit.ts`). It makes `testData` from `testData(account)` (`src/test-database/data-test-kit.ts`), plus `account`, and removes it with `removeTestData()`. It has no `findOrCreateUser` call and no `users` delete for its accounts. `newAddress` still deletes the account the site makes for it. `e2e/visual/account.spec.ts` imports `spend` from `@/test-database/spend-test-kit.ts`.
13. **One server-test kit.** The kits that parts 2 to 7 added beside their tests now live in `src/test-database/`, and no two exports there do the same job.
14. **One chat kit.** `src/test-database/chat-test-kit.ts` replaces `src/tutor/tutor-chat-test-kit.ts`, `src/app/api/chat/chat-request-test-kit.ts`, `src/chats/chat-server-test-kit.ts` and `two-users-test-kit.ts`'s `postChat`. It has one sender to `POST /api/chat` for the signed-in user, `sendChatMessage(chatId, text)`. It answers `{ status, body, chunks }` for any status, after `afterTasksDone()`. `tutorReply`, `tutorPrompt` and `tutorEdits` build on it. It also holds `postMessage`, `question`, `newMessageId`, `sendToEnd`, `userWithChat`, `formOf`, `savedConversation`, `exchange`, `SavedLine`, `citedSections` and one `messageText`, which replaces `replyText`. If it would pass 300 lines, the readers of a saved message (`messageText`, `citedSections`, `savedConversation`, `exchange`) go to `src/test-database/saved-message-test-kit.ts`.
15. **One way to wait for `after()` tasks.** `src/tutor/after-tasks-test-kit.ts` and `chat-request-test-kit.ts`'s `after`, `connection` and `finishAfterTasks` are deleted. No `*.server.test.ts` calls `vi.mock("next/server", …)`, because the setup file's mock serves every server test. Tests that awaited `finishAfterTasks()` now await `afterTasksDone()` from `after-test-kit.ts`.
16. **One `manualSection`.** `manualSection` has one copy, in `src/test-database/data-test-kit.ts`, beside `manualSections`.
17. **One spend kit.** `src/test-database/spend-test-kit.ts` is `src/quota/reset-days-test-kit.ts` (`spend`, `spendInMonthAfter`, `resetDaysSince`, `quotaMessage`, `exactlyOneOf`), plus `spentThisMonth` from the chat kit. The chat kit's `spend` is gone.
18. **The other kits move as they are.** These move to `src/test-database/` unchanged apart from their imports and comments: `src/accounts/two-users-test-kit.ts`, `src/memory/memory-form-test-kit.ts`, `src/db/storage-down-test-kit.ts` and `src/db/scratch-database-test-kit.ts`. `two-users-test-kit.ts`'s `deleteAccount` may use `user-test-kit.ts`'s deletion.
19. **The server tests still pass.** `npm run test:server` passes, and each moved test keeps its title, so every case still has its test.
20. **Docs say the check holds the rule.** `/CONTRIBUTING.md`, `/README.md`, `AGENTS.md` and `use-cases/README.md` no longer say the move out of e2e is in progress (#341). Each says that `use-cases.test.ts` enforces `e2e-visual-and-auth-only` against `use-cases/auth-cases.ts`. CONTRIBUTING's "E2e helpers" bullet lists the helpers that are left: `fixtures.ts`, `chat-page.ts`, `log-in.ts`, `page-helpers.ts`, `sign-in-pages.ts`, `sign-in-clock.ts`, `outbox.ts` and `visual/visual-page.ts`, but not `src/viewports-test-kit.ts`, which no e2e file uses now. Its "Typing right after a goto" bullet no longer names `waitForHydrated`. `AGENTS.md`'s kit list names every file in `src/test-database/`. No doc mentions a second web server or the `whole-database` project. README's `PHONE_PAGES` sentence is accurate today and stays.
21. **No comment names a deleted file.** No comment under `src/`, `e2e/`, `scripts/` or the config files names a deleted e2e file or a moved kit at its old path. Today these do: `src/db/storage-down-test-kit.ts:4`, `src/touch-targets-test-kit.ts:4`, `src/viewports-test-kit.ts:2-3`, `src/app/(workspace)/settings/flag-switches.browser.test.tsx:35-36` (the file is now `src/flags/settings-follow-user.server.test.ts`), `src/chats/chat-server-test-kit.ts:3-4,145`, `src/env.ts:60-61` and `playwright.config.ts:75-76,173-175`.

## Out of scope

- Moving any auth test out of Playwright, or changing what an auth or visual test checks. Visual baselines don't change.
- Merging every `new FormData()` that server tests build inline. Only the kits' duplicate helpers are merged.
- `src/touch-targets-test-kit.ts`, `src/viewports-test-kit.ts`, `src/tutor/mock-markdown-test-kit.ts` and the other kits shared with unit or browser tests. They aren't server-test kits, so they stay where they are, with their comments fixed.
- Releasing, deploying or touching `main`.

## Design

**The check (items 1 to 3).** Add `outsideAuthCases(declarations, authCases)` to `use-cases/test-declarations.ts`; the stub is at `test-declarations.ts:161`. It filters by `slug ?? inCase` and maps to `at`, the same way `unknownSlugTitles` (`test-declarations.ts:148`) does. It uses the parser as it is. `use-cases.test.ts` builds `NON_VISUAL_E2E_DECLARATIONS` once (from `E2E_FILES`, without `VISUAL_FOLDER`). The new `describe("the auth cases")` (`use-cases.test.ts:209`) checks it with `expect(…, AUTH_ONLY_RULE)`, which carries `e2e-visual-and-auth-only` in the failure. It also checks that `AUTH_CASES` is the 13 cases and that each one is in `CASES`. The header comment (`use-cases.test.ts:2-13`) already describes the rule. The implementer only fills in the stub at `use-cases/auth-cases.ts:7` and `test-declarations.ts:161-166`.
- *Design it twice:* (a) `outsideAuthCases(path, text, authCases)`, which parses per file like `testsOutsideCases`; (b) a declarations-in, `at`-strings-out function like `unknownSlugTitles`. I chose (b). The test file already parses the e2e files, the visual filter stays with the caller beside the other e2e checks, and the function's only job is the rule. For the list, I considered marking auth cases in the Markdown, for example with a tag in the heading, against a TypeScript list. The list won, as the issue suggests. It is typed, it is reviewed in one place, and the case files' format stays as `use-cases/README.md` describes it.
- *Types:* `AUTH_CASES: readonly \`use_case_${string}\`[]`, annotated, with no `as const` (CONTRIBUTING › Types). This matches `PendingCase.slug` in `e2e/pending-cases.ts`.

**Playwright (items 5 and 6).** In `playwright.config.ts`, remove these:
- the `storage-down-server.ts` import (`:15-18`)
- the `WHOLE_DATABASE_TAG` import (`:25`)
- `wholeDatabaseTests` (`:84`)
- `grepInvert` on `chromium` (`:136`)
- the `whole-database` project (`:149-162`)
- the second `webServer` entry (`:173-185`), leaving one server object

`testDatabase` (`:73`) then has no reader, so call `checkTestEnvironment()` for its check alone. Fix the comments that say "web servers" (`:75-76`). Then delete the six files in item 6, after grepping `e2e/`, `playwright.config.ts`, `use-cases/`, `src/` and `scripts/` for each name; on the base only `playwright.config.ts` imports two of them. Delete `databaseUrlEnvironment` (`src/env.ts:60-66`) and its `describe` (`src/env.test.ts:80`).

**E2e helpers (items 7 to 12).** Prune the exports listed in items 8 to 10 (`e2e/chat-page.ts:150-165`, `e2e/page-helpers.ts:51`, `e2e/fixtures.ts:237-238`). Then delete the functions that nothing calls once they are unexported, and the `logIn` import in `chat-page.ts:13` that only `openChat` used. In `fixtures.ts`:
- `useAccount` (`:112-122`) becomes `testUser()`, then `use`, then `deleteTestUsers()`. A Playwright worker runs one test at a time, so the kit's module-level list holds only this test's users, and `account` and `otherAccount` are both deleted by whichever teardown runs first.
- `useTestDataOf` becomes `{ account, ...testData(account) }`, then `use`, then `removeTestData()`.
- `TestData` becomes the kit's `TestData` plus `account`.
- Update the header comment (`:1-23`) and `user-test-kit.ts`'s comment (`:1-4`, `:23-25`) to say that both the server setup and the e2e fixtures use it.
This follows the issue: "Where an auth test's fixture and the kit make the same thing … `e2e/fixtures.ts` uses the kit's code."

**One kit (items 13 to 19).** Use `git mv` for the moves, so history follows. For the chat kits:
- Start from `two-users-test-kit.ts:46-67` (`postChat`). It already awaits `afterTasksDone()` and returns any status. Add `chunks: streamChunks(body)` (`chat-request-test-kit.ts:104`) and call it `sendChatMessage`.
- Build `tutorReply`, `tutorPrompt` and `tutorEdits` (`tutor-chat-test-kit.ts:57-110`) on it.
- Build `postMessage` (`chat-server-test-kit.ts:65-83`) on the same request builder, so the JSON body shape lives in one place.
- Drop the per-file `vi.mock("next/server", …)` from `see-monthly-usage`, `chat-names`, `manual-answers`, `reply-failures` (api/chat), `buddy-actions`, `memory-actions`, `memory-in-chats`, `over-quota` and `interview` `.server.test.ts`. The setup file (`vitest.server-setup.ts:30-37`) already mocks it with `after-test-kit.ts`, whose `afterTasksDone` waits for nested tasks, as `finishAfterTasks` did.
- `messageText`: two of the three copies join text parts with `""`, so the merged one does too. Its one `"\n"` caller, `manual-answers.server.test.ts:106`, checks with `toContain` and counts occurrences, and stays correct.

Update the importers, the comments at the top of each moved file, and `AGENTS.md`'s kit list (`apps/web/AGENTS.md:8-13`).

**Docs (item 20).**
- `/CONTRIBUTING.md:90`: drop "The e2e tests written before this rule move out in #341's parts". Say that `use-cases.test.ts` fails an e2e test outside `e2e/visual/` that names a case other than the auth cases in `use-cases/auth-cases.ts`, and change "Each e2e test is titled exactly by a slug" to say it is an auth case's slug.
- `/CONTRIBUTING.md:95-96`: the helper bullets.
- `apps/web/AGENTS.md:17` and `use-cases/README.md:10`: replace the in-progress note with the enforcement sentence.
- `use-cases/README.md:12`: add the auth-case check to its list of checks.
- `/README.md` has no second-server or `whole-database` text on the base (grep `/README.md:90-112`). Re-grep it after the change.

**Practices followed.**
- CONTRIBUTING › Design: information hiding, so the auth list and each kit job live in one module. The duplicate chat senders, `after()`s, `spend`s, `manualSection`s and `messageText`s are the "repetition" red flag. *Strategic, not tactical.*
- Lint: exports last, 300 lines per file, 50 per function. Split the chat kit if needed. `describe` callbacks stay short.
- Tests: test-first. `use-cases-drive-tests`, `e2e-visual-and-auth-only`, `tests-pin-promised-behaviour` and `flakes-are-failures` (wiki, Decisions-Code-and-tooling).
- This work follows `e2e-visual-and-auth-only` and departs from no decision. It brings the wiki's rollout notes up to date (see Wiki updates).

## Test interfaces

- `outsideAuthCases(declarations: readonly Declaration[], authCases: readonly string[]): readonly string[]`: `apps/web/use-cases/test-declarations.ts`, new (stub). Pins items 1 and 5.
- `AUTH_CASES: readonly \`use_case_${string}\`[]`: `apps/web/use-cases/auth-cases.ts`, new (stub, empty). Pins items 2 and 3.
- `npm run check` (apps/web), which runs `use-cases/use-cases.test.ts` and the type and lint checks: existing. Pins items 1, 3, 4, 6, 7, 8, 9, 10, 11 and 21. A deleted helper that is still imported fails the type check.
- `npm run test:server` (apps/web): existing. Pins items 12 to 19.
- `npm run test:e2e` (apps/web), with `npx playwright test --list` for the listing: existing. Pins items 5, 6 and 12.
- `e2e/fixtures.ts` `test`, with the fixtures `account`, `testData` and the rest: `apps/web/e2e/fixtures.ts:203`, changed. Pins items 8 and 12.
- The contributor docs, `/CONTRIBUTING.md`, `/README.md`, `apps/web/AGENTS.md` and `apps/web/use-cases/README.md`: existing, changed. Pins item 20, checked by reading them and by the greps under Tests.

## Tests

Committed on `agent/issue-351`:

- `use-cases/test-declarations.test.ts`, `describe("an e2e test outside e2e/visual/")`. Each test fails today because the stub throws "not implemented":
  - "names only an auth case, by its title or its group's": drives `outsideAuthCases` and pins item 1. A test titled by an auth slug, and a plain test in a plain group nested in an auth group, are not reported.
  - "is reported when it names any other case": drives `outsideAuthCases` and pins item 1, which issue #351's Tests section asks for. A test titled by a non-auth slug, a non-auth group with a plain test inside, and a non-auth test inside an auth group are each reported as `<file>:<line> <title>`. A plain test in no group is not reported, since `testsOutsideCases` covers it.
- `use-cases/use-cases.test.ts`, `describe("the auth cases")`:
  - "are the 13 cases of the auth workflows, each a case": drives `AUTH_CASES` and pins items 2 and 3. It fails today because the stub list is empty.
  - "are the only cases e2e tests outside e2e/visual/ name": drives `outsideAuthCases` over the real e2e files and pins items 1 and 5. It fails today because the stub throws. On the base, once the stub is implemented, it passes, because parts 2 to 7 already moved every other case out. I checked this with a local implementation, which was not committed: all 18 tests in `use-cases/` passed.
- The other tests in `use-cases.test.ts` stay as they are and pin item 4. They pass today and must still pass.
- Items 5 to 21 delete, move and reword files without adding behaviour. No unit test is committed for them, because a test that a file is absent, or that a helper sits in a given folder, would test the code's layout rather than promised behaviour (`tests-pin-promised-behaviour`). They are checked through the CLI interfaces above:
  - `npm run check`: lint and types catch dangling imports.
  - `npm run test:server` and `npm run test:e2e` must pass with no flakes.
  - `npx playwright test --list` shows only `e2e/visual/` tests and the 13 auth tests, under the projects `chromium`, `visual` and `visual-<device>`.
  - These greps return nothing: `grep -rn "whole-database\|storage-down-server\|WHOLE_DATABASE\|#341" apps/web /README.md /CONTRIBUTING.md`, run outside the wiki and `node_modules`, and `grep -rln "vi.mock(\"next/server\"" apps/web/src --include=*.server.test.ts`.
  - For item 21, this grep returns nothing outside the wiki and `node_modules`: `grep -rnE "memory-page|quota-reset-days|settings-page\.ts|e2e/touch-targets|storage-down-server|whole-database|tutor-chat-test-kit|chat-request-test-kit|chat-server-test-kit|after-tasks-test-kit|reset-days-test-kit|flag-switches\.browser|(accounts|memory|db)/(two-users|memory-form|storage-down|scratch-database)-test-kit" apps/web --exclude-dir=node_modules`.

## Wiki updates

- **Decisions-Code-and-tooling**:
  - `use-cases-drive-tests` now lists the auth-case check, and `viewports-test-kit.ts` is described as for the browser tests only.
  - `e2e-visual-and-auth-only`'s rollout gains #351's bullets: the check, the remaining suite, the deleted setup, the merged kit in `src/test-database/` and the fixtures that use it.
  - The `scratch-database-test-kit.ts` path is updated.
- **Decisions-Accounts**: "Month ends in quota tests" now names `src/test-database/spend-test-kit.ts` as the one module for every test, and the e2e copies are gone.

## Assumptions and risks

- **Base state:** triage's reading holds. The non-visual e2e files declare only the 13 auth tests, and no spec carries `@whole-database` (I grepped the slugs in `e2e/*.spec.ts`), so the new check passes once the stubs are filled in.
- **Fixture cleanup:** `user-test-kit.ts` keeps its users in module state. In Playwright each worker runs one test at a time, so `deleteTestUsers()` in a fixture teardown deletes only that test's users. If a later change ran tests concurrently inside one worker, this would break. Playwright doesn't do that.
- **The chat-kit merge** is the largest step, at about 20 test files. It changes no test's title or assertion, but it does change how each server test waits for `after()` tasks. A test that relied on the per-file `finishAfterTasks` mock must now await `afterTasksDone()`. A flaky test is a failure, so if a test needs more than that, its fix goes in the kit, not in a retry.
- **`waitForHydrated` is unexported** because no remaining test imports it, as the issue's pruning rule asks. A future auth test that needs it can export it again.
- **The wiki pages** describe the end state, and they merge with this branch.
- No file, page or log asked to change this task.

## Sources

- Issue #351 (`issue.md`) and its triage notes.
- `/AGENTS.md`, `/CONTRIBUTING.md` (Design, Types, Lint, Tests), `apps/web/AGENTS.md:1-18`, `apps/web/use-cases/README.md:1-12` and `/README.md:90-112`.
- Wiki: Decisions-Code-and-tooling (`use-cases-drive-tests`, `e2e-visual-and-auth-only`, `tests-pin-promised-behaviour`, `web-tests-under-load`, `flakes-are-failures`) and Decisions-Accounts ("Month ends in quota tests").
- Code:
  - `use-cases/use-cases.test.ts:1-197` and `use-cases/test-declarations.ts:1-157`
  - `playwright.config.ts:1-187`
  - `e2e/fixtures.ts:1-238`, `e2e/chat-page.ts`, `e2e/page-helpers.ts:1-51`, `e2e/log-in.ts`, `e2e/storage-down-server.ts` and `e2e/whole-database.ts`
  - `src/test-database/*.ts` and `vitest.server-setup.ts:1-44`
  - `src/tutor/tutor-chat-test-kit.ts`, `src/app/api/chat/chat-request-test-kit.ts`, `src/chats/chat-server-test-kit.ts`, `src/tutor/after-tasks-test-kit.ts`, `src/accounts/two-users-test-kit.ts`, `src/quota/reset-days-test-kit.ts`, `src/db/storage-down-test-kit.ts`, `src/db/scratch-database-test-kit.ts` and `src/memory/memory-form-test-kit.ts`
  - `src/env.ts:60-66` and `src/app/api/chat/manual-answers.server.test.ts:95-107`

<!-- end of spec -->
