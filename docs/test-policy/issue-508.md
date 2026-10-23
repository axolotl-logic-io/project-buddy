# Real-dependency test policy: #508

## Scope and decision

Autumn's 2026-10-22 decision removes direct-call unit tests and all 70 jsdom rendered-UI test files. It permits integration and feature-entrypoint tests through real dependencies, including browser-mode component integrations. It does not require an entire application flow. See [`real-dependency-tests`](../Decisions-Code-and-tooling.md#real-dependency-tests).

The deletion uses the preserved inventory at integration `29065aa2131595175cab9670160a616b518b08b9`, the source parent of this branch. No branch synchronization or production source change is part of this work. No replacement tests were added.

- Deleted 202 complete test files, including the 70 approved jsdom rendered-UI files. Their paths and removed assertions are in the [complete deleted-behavior ledger](issue-508-deleted-behaviors.md). This list belongs with the PR's coverage-loss disclosure.
- Removed direct-call checks from five mixed suites, preserving the actual-filesystem checks in flags, quota terms, quota grants, error-log imports and Streamdown names.
- Deleted 17 exclusively used helper files after a retained-consumer audit, plus the jsdom setup. Pruned unused fixture values and stream helpers from shared test kits, without changing their retained behavior.
- Retained 12 filesystem-guard files in a Node `repository` project. They validate release configuration, test-code placement, Drizzle's suppression, theme token contracts, WCAG AA, Streamdown names, self-hosted fonts, use-case coverage and scope, hiding stylesheets, quota module imports and error-folder dependencies. The two restored in-process Vite plugin suites below have a separate project selected by default too.
- Retained all 57 server/database test files, 22 real-browser test files, 21 Playwright specs, both shell-script suites and all four instruction-counter subprocess test files. A browser or server test can use a fixture or mock where its real dependency is still what proves the behavior.
- Preserved #514's `chat-message.browser.test.tsx`, its exact assertions, `browser-test-kit.ts` ambient command declarations, browser setup, dependency and syntax plugins, and required kits. Extracted the existing early-loaded matcher types into `test/browser-matchers.d.ts`. `@testing-library/jest-dom` remains necessary for those types; no jsdom runtime setup or new runtime matcher is installed.
- Removed direct jsdom, Testing Library React and Testing Library DOM dependencies and their now-exclusive lockfile entries. Kept `culori`/its types for real-CSS contrast checks, and `memfs` for the manual clone and retained server kit.
- Removed only obsolete file entries from Biome overrides; no lint rule was disabled or weakened. No package script ran only the deleted tests. The initial deletion candidate kept guards and browser tests in `test`, `test:watch` and `check`; the later fast-default policy below separates costly stages without deleting coverage. Instruction-counter's cheap fake-pi subprocess tests remain in its default gate.

The quota-grant filesystem guard formerly asserted that deleted `test/tutor/model.test.ts` imported a test kit. Its witness now names retained `test/tutor/model-spend.server.test.ts`, which actually imports `quota-test-kit.ts`. The assertions forbidding production kit imports, unauthorized grant constructors and production casts remain. This is a correction to a deleted-file expectation, not a relaxation of the guard.

## Restored in-process Vite plugin suites

The first revision (`df84ab2f`) deleted `vitest.browser-deps.test.mts` and `vitest.browser-syntax.test.mts` as unit tests. They start a real in-process Vite dev server (`createViteServer`) with the browser projects' plugins and resolve or transform modules through it, so they meet the real-dependency rule. This revision restores them from `29065aa2` with their titles and assertions unchanged: all three dependency-plugin tests and the three served-module syntax-plugin tests.

`every browser project serves through the check` stays deleted, with its helpers. It only imports `vitest.config.mts` and reads plugin names from the exported object, a direct call with no Vite server, like the deleted `vitest.server.config.test.ts`. The `repository` project discovers `**/*.test.{ts,mts}` but excludes these two named integration suites as well as e2e, browser and server tests. The `vite-integration` project explicitly discovers both root `.mts` files and is selected alongside `repository` in the default. `tsconfig.json` already type-checks `**/*.mts`.

### Fast default checks

Autumn's 2026-10-22 [fast-default decision](../Decisions-Code-and-tooling.md#fast-default-checks) supersedes unconditional full-suite defaults. `npm test` and `test:watch` select both `repository` and `vite-integration`. `npm run check` retains Biome, types, deterministic shell safety checks, repository guards (including the unchanged use-case guard) and all six cheap Vite guards. Their retained 1.62-second focused run has no browser-binary or database prerequisite; the integration label does not justify excluding them. `test:vite` is a focused subset of the default. Costly coverage remains available explicitly as `test:browser`, `test:integration` (all guards/Vite/browser projects), and the unchanged server/e2e/visual tasks. [Costs, prerequisites and stage follow-up](../../README.md#tests) are documented. No timeout, concurrency, assertion, dependency or lockfile change accompanies this separation. No production behavior changes.

On the preceding candidate, a single focused `vitest run --project vite-integration` passed **2 files / 6 tests**, duration **1.62 seconds**. It ran from 2026-10-22 23:35:50.576 UTC to 23:35:52.649 UTC; observed Node consumers terminated naturally, with no remaining owned PIDs. All six original test bodies and server teardown hooks remain unchanged. The config-only test is the only removed case from those suites.

On that preceding candidate, a single cheap `vitest run --project repository` found **12 files / 70 tests**: **69 passed, 1 failed**, in **664 ms**. The failure still lists `use_case_view_buddies` and `use_case_see_manual_credit`. The fast default is therefore **not green**, and no coverage metadata correction is justified by the retained assertions. Scoped Biome passed for all four changed code/config files. Initial type checking failed only because this fresh clone lacked generated Next route types (15 missing `PageProps`/`LayoutProps` errors). After one separately authorized local `next typegen`, type checking passed once. Both type-check logs remain preserved; no env file existed or was read/created for type generation.

This cheap-default correction has only static selection/discovery and scoped formatter/syntax/diff/hash checks; none of the completed suites, types, six Vite cases or known-red guard was rerun. Static discovery is not runtime pass evidence. The full web check, broad/browser suites, server/database, e2e, build/font and instruction-counter checks remain **unrun on this correction**. Their prior results below are historical, not new-candidate evidence. No flaky retry occurred. The configured operator wrapper still forces e2e until the parent approves and installs an external opt-in-aware proposal; this source change alone does not change the live wrapper or authorize a pipeline run.

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
- Server-config timeout checks and the config-only check that every browser project lists the syntax plugin. The timeouts and plugins stay active, and the plugins' in-process Vite tests are restored.
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

Runtime file counts include separate Chromium/WebKit and time-zone/touch instances. The ledger's removed declarations/templates (993 at `df84ab2f`, 987 after the restoration above) are static, not a runtime count. The table and validation describe the deletion candidate `df84ab2f`, before the fast-default separation. The corrected default selects 12 repository source files and both Vite-integration source files. The preceding candidate's measured focused counts appear above, not new runtime results for this correction. No new broad-suite total or exact deletion delta is claimed.

Validation on the deletion candidate `df84ab2f`:

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

Relevant historical files are `web-check.log`, `instruction-counter-check.log`, `typecheck.log`, `typecheck-with-browser-types.log`, `helper-closure.txt`, `retained-import-audit.json`, `deletion-manifest.json` and `title-ledger-counts.txt`. The directory was writable. Failed-run evidence was not erased.

The later fast-default preparation, patch, exact base/source hashes, focused Vite discovery/run/consumer receipt, cheap-guard failure, scoped Biome and both type-check logs are retained outside its fresh clone in:

```text
/Users/axolotl-logic/workspace/agent-handoffs/project-buddy/20261019-launch-ready/dispatch-20261022-four-lane-drain/pb508/
```

The report is `../pb508-report.md`. The external wrapper proposal is not installed. The two minimal replacement-case proposals remain external and unimplemented pending explicit Autumn approval.

## Matching ecosystem policy

Ecosystem #164 adoption remains pending. No ecosystem checkout or job was changed. The exact matching patch for its previously identical `docs/coding-practices.md` is `ecosystem-164-coding-practices.patch` in the durable evidence directory above. The complete resulting Project Buddy file has SHA-256:

```text
aee66734b3bf3f238b4717d4e8bc2218bcc4ec5936b26c9f0f8af2e2850c2d40
```

The patch changes only the shared test-policy paragraph. Its text explicitly permits real-dependency integration and feature-entrypoint tests without requiring full e2e. Source merge does not install, release or deploy this change.
