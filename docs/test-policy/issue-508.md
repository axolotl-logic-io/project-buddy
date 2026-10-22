# Real-dependency test policy: #508

## Scope and decision

Autumn's 2026-10-22 decision removes direct-call unit tests and all 70 jsdom rendered-UI test files. It permits integration and feature-entrypoint tests through real dependencies, including browser-mode component integrations. It does not require an entire application flow. See [`real-dependency-tests`](../Decisions-Code-and-tooling.md#real-dependency-tests).

The deletion uses the preserved inventory at integration `29065aa2131595175cab9670160a616b518b08b9`, the source parent of this branch. No branch synchronization or production source change is part of this work. No replacement tests were added.

- Deleted 204 complete test files, including the 70 approved jsdom rendered-UI files. Their paths and removed assertions are in the [complete deleted-behavior ledger](issue-508-deleted-behaviors.md). This list belongs with the PR's coverage-loss disclosure.
- Removed direct-call checks from five mixed suites, preserving the actual-filesystem checks in flags, quota terms, quota grants, error-log imports and Streamdown names.
- Deleted 17 exclusively used helper files after a retained-consumer audit, plus the jsdom setup. Pruned unused fixture values and stream helpers from shared test kits, without changing their retained behavior.
- Retained 12 filesystem-guard files in a Node `repository` project. They validate release configuration, test-code placement, Drizzle's suppression, theme token contracts, WCAG AA, Streamdown names, self-hosted fonts, use-case coverage and scope, hiding stylesheets, quota module imports and error-folder dependencies.
- Retained all 57 server/database test files, 22 real-browser test files, 21 Playwright specs, both shell-script suites and all four instruction-counter subprocess test files. A browser or server test can use a fixture or mock where its real dependency is still what proves the behavior.
- Preserved #514's `chat-message.browser.test.tsx`, its exact assertions, `browser-test-kit.ts` ambient command declarations, browser setup, dependency and syntax plugins, and required kits. Extracted the existing early-loaded matcher types into `test/browser-matchers.d.ts`. `@testing-library/jest-dom` remains necessary for those types; no jsdom runtime setup or new runtime matcher is installed.
- Removed direct jsdom, Testing Library React and Testing Library DOM dependencies and their now-exclusive lockfile entries. Kept `culori`/its types for real-CSS contrast checks, and `memfs` for the manual clone and retained server kit.
- Removed only obsolete file entries from Biome overrides; no lint rule was disabled or weakened. No package script ran only the deleted tests: `test`, `test:watch` and `check` still run filesystem guards and real-browser tests, and instruction-counter's `test` runs subprocess tests. All scripts remain.

The quota-grant filesystem guard formerly asserted that deleted `test/tutor/model.test.ts` imported a test kit. Its witness now names retained `test/tutor/model-spend.server.test.ts`, which actually imports `quota-test-kit.ts`. The assertions forbidding production kit imports, unauthorized grant constructors and production casts remain. This is a correction to a deleted-file expectation, not a relaxation of the guard.

## Coverage gaps and required owner decision

**This draft is not ready to land.** The retained use-case guard fails for:

- `use_case_see_manual_credit`: the removed footer checks were the only dedicated assertions of the Blender Reference Manual and CC BY-SA 4.0 credit links. Rendering the footer for phone measurements or including it in screenshots is not a dedicated assertion of both link destinations on signed-in and signed-out pages.
- `use_case_view_buddies`: retained private-data tests verify owner isolation, own names and the empty-own-list message. Visual tests check the two own clones' ordering. Header phone tests measure the Buddies link. None proves the full built-in listing, navigation and action contract of this case. They were not relabeled to claim that coverage.

Autumn must authorize replacement real-dependency tests for these cases before implementation crosses #508's no-replacement-tests boundary. The guard, its assertions, case definitions, auth-case list and empty pending-case list are unchanged. There are no new skip, todo or pending entries.

`use_case_chat_project_badge` already has genuine real-browser assertions. `test/components/chat-list.browser.test.tsx` checks badge visibility with chat names hidden, placement outside accessible links, rendered colors, long-name ellipsis, containment on 320/390 px screens and accessible chat names across themes and modes. The containment group's metadata now names this slug, with every assertion unchanged. `test/app/(workspace)/chat/page.touch.browser.test.tsx` also checks the badge in the composed all-chats page. This metadata correction does not claim that every deleted jsdom badge assertion survives.

## Lost sole or branch-specific coverage

The [ledger](issue-508-deleted-behaviors.md) lists every removed test title or parameterized template, including all 70 rendered-UI files. Treat those checks as lost coverage unless actual retained assertions are identified above. Same-subject server or browser filenames alone are not evidence that a deleted branch remains covered. Autumn can use this list to decide which real-dependency tests to authorize.

The highest-risk lost dedicated checks are:

- Production refusal of `TUTOR_MODEL=mock` under `VERCEL_ENV=production`, plus environment accessor validation. Deletion does not repair #512's unrelated test-setup conflict or change its product code.
- Test-database safety refusals: remote hosts, unsafe/reserved names, missing configuration, real tutor selection, non-file or missing outbox, production outbox use, raw spaces/backslashes in credentials, and operations confined to the validated database boundary. Retained server setup exercises acceptance, not these refusal branches.
- Outbox atomic write-then-rename publication, replacement while a write is held, and overlapping writes under one key; email request shape, refusal classification and login-email content.
- Export-by-export owner-scope completeness and the fake-query validator's own behavior. Real-database private-data tests remain, but do not automatically guard every future export.
- Playwright configuration validation, supplied port/refusal behavior, and the Chromium partial-raster configuration assertions. The actual Playwright policy and byte-exact repaint regression stay unchanged.
- Browser dependency-plugin rejection of synthetic unlisted imports, browser syntax-plugin diagnostics, and server-config timeout checks. The plugins and timeouts stay active.
- Build font-map validator failure branches and release smoke-response validation/sequencing, including unread bodies and body-read failure reporting. The real build-font check, release filesystem guards and shell promotion tests stay.
- Message-id parsing; proxy public paths, session handling and theme-specific font-preload headers; HMAC vectors, token/legacy-token parsing and cookie behavior.
- User-name validation, row decoding, login/invitation/storage failures, prompt preferences and rate-limit behavior during a database outage; action validation/refusal/error branches and usage formatting.
- Buddy registry/default rules and legacy stored-parts decoding; legacy chat-row buddy decoding, chat-name rules, preference-read failures and message-save results.
- Working-note classification and tool-part registry completeness; database-client URL/endpoint/WebSocket paths; error classification, log formats and sensitive-data omission; newer-build reload and its UI handling.
- Flag registry/copy completeness, switch/default interpretation, pre-paint and cookie logic, and save/seed/switch branches. The file-backed hiding/tagging checks remain.
- RST splitting, Sphinx IDs, section extraction, manual URLs, fake-git clone checks, reindex batching/operator output and search decoding/failure branches. Real stored-index tests remain.
- Memory edit/empty rules and store failures; project-store decoding/failures; prices, UTC month/reset-day math, usage parsing, spend metering, unreachable/deleted-owner writes and quota decisions. Real quota/database flows remain.
- Theme choice parsing, pre-paint/cookie logic, font preload calls and action validation. CSS contract/contrast/font guards and browser theme integrations remain.
- Tutor prompt assembly, name substitution, planning defaults/guidance, mock-command branches, answer-now/empty-call/resend/step-limit/quota/failure/naming branches, opening/protocol parsing, tool inputs and tool sets, model selection and provider bookkeeping. Server chat requests exercise some flows, not all branches.
- Account/settings/login/setup/signup content and form feedback, memory conflict/restore UI, rename-chat, ChatView refusal restoring typed text, tool-failure lines, error boundaries, not-found content, first-HTML header/theme behavior, and the footer credit. Browser layout/visual counterparts do not establish each removed functional assertion.

Production comments still mention removed coverage or helpers in `src/flags/flags.ts`, `src/themes/themes.ts`, `src/themes/theme-font-urls.ts`, `src/themes/theme-fonts.ts`, `src/quota/quota-grant.ts` and `src/email/send-email.ts`. They are flagged here rather than edited outside the authorized production-source scope. Historical decision records and `docs/visual-evidence/issue-506/` remain historical evidence.

## Counts and validation

There is **no measured exact-head runtime baseline**. The owner-provided preserved inventory supplies the following historical and static evidence; these are not fabricated baseline passes:

| Measure | Before | After |
| --- | --- | --- |
| Web default Vitest source files | 216 default non-browser files plus 22 browser sources | 12 repository guards plus the same 22 browser sources |
| Web default Vitest runtime files/tests | Historical #514 at `9d8b3ae1`: 262 files, 2,068 tests; 1 file/test failed | Measured here: 58 runtime files, 622 tests; 57 files/621 tests passed, 1 file/test failed |
| Expected default runtime tests at `29065aa2` | Inventory estimate: about 2,076, not measured (the later environment tables add 8) | No exact deletion delta is claimed from this estimate |
| Instruction-counter subprocess tests | Four files; inventory counted 14 static call sites, not runtime tests | Measured here: four files, 26 runtime tests, all passed |
| Server/database, Playwright and shell sources | 57 files, 21 specs, 2 shell suites | Unchanged; shell suites passed, server/Playwright runtime totals not measured in this run |

Runtime file counts include separate Chromium/WebKit and time-zone/touch instances. The 993 removed declarations/templates in the ledger are static, not a runtime count.

Validation on the deletion candidate:

- `npm run check` in `apps/web`: **failed** at the unchanged use-case coverage assertion for the two slugs above. Biome checked 455 files successfully, type checking passed, and both shell-script suites passed before Vitest. Vitest completed with 622 tests, one failed and no reported cancelled, skipped or todo tests. Every browser instance passed. A `MaxListenersExceededWarning` was also emitted; no listener limit was changed.
- An initial focused type check failed after removal of the jsdom setup because the retained browser assertion requires the old matcher type declaration order. After extracting those same types, the focused type check and the gate's type check both passed. Both logs are retained. The protected browser assertions were not edited.
- `npm run check` in `apps/instruction-counter`: passed type checking, Biome and all 26 subprocess tests.
- Retained-import audit: 441 tracked code files, 2,001 existing local-path edges, no reference to a deleted target. Type checking also passes. Protected browser harness, ambient commands, use-case guard and Playwright files have no diff.
- `git diff --check`: passed.
- Server/database tests, Playwright, build-font validation and the e2e flake-gate repeat are **unrun**. The full gate cannot pass while the use-case guard fails. No failing or passing suite was repeated to obtain a green result, and no check command was weakened.

The canonical setup receipt reports lane 1 prepared successfully; `apps/web/.env.test` existed. Its contents were not read or rewritten. The owner granted #508 Implementation the exclusive heavy-test reservation; this record grants no later stage permission to run tests or land.

Complete validation logs and audit receipts are retained outside the checkout and canonical job workspace at:

```text
/Users/axolotl-logic/workspace/agent-handoffs/project-buddy/20261019-launch-ready/dispatch-20261022-pb-508-514/pb508-evidence/
```

Relevant files are `web-check.log`, `instruction-counter-check.log`, `typecheck.log`, `typecheck-with-browser-types.log`, `helper-closure.txt`, `retained-import-audit.json`, `deletion-manifest.json` and `title-ledger-counts.txt`. The directory was writable. Failed-run evidence was not erased.

## Matching ecosystem policy

Ecosystem #164 adoption remains pending. No ecosystem checkout or job was changed. The exact matching patch for its previously identical `docs/coding-practices.md` is `ecosystem-164-coding-practices.patch` in the durable evidence directory above. The complete resulting Project Buddy file has SHA-256:

```text
aee66734b3bf3f238b4717d4e8bc2218bcc4ec5936b26c9f0f8af2e2850c2d40
```

The patch changes only the shared test-policy paragraph. Its text explicitly permits real-dependency integration and feature-entrypoint tests without requiring full e2e. Source merge does not install, release or deploy this change.
