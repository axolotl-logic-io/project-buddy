# Real-dependency test policy: #508

## Scope and decision

Autumn's 2026-10-22 decision removes direct-call unit tests and all 70 jsdom rendered-UI test files. It permits integration and feature-entrypoint tests through real dependencies, including browser-mode component integrations. It does not require an entire application flow. See [`real-dependency-tests`](../Decisions-Code-and-tooling.md#real-dependency-tests).

The deletion uses the preserved inventory at integration `29065aa2131595175cab9670160a616b518b08b9`, the source parent of this branch. No branch synchronization or production source change is part of this work. The deletion added no replacement tests; the separately approved two-case additions are recorded below.

- Deleted 202 complete test files, including the 70 approved jsdom rendered-UI files. Their paths and removed assertions are in the [complete deleted-behavior ledger](issue-508-deleted-behaviors.md). This list belongs with the PR's coverage-loss disclosure.
- Removed direct-call checks from five mixed suites, preserving the actual-filesystem checks in flags, quota terms, quota grants, error-log imports and Streamdown names.
- Deleted 17 exclusively used helper files after a retained-consumer audit, plus the jsdom setup. Pruned unused fixture values and stream helpers from shared test kits, without changing their retained behavior.
- Retained 12 filesystem-guard files in a Node `repository` project. They validate release configuration, test-code placement, Drizzle's suppression, theme token contracts, WCAG AA, Streamdown names, self-hosted fonts, use-case coverage and scope, hiding stylesheets, quota module imports and error-folder dependencies. The two restored in-process Vite plugin suites below have a separate project selected by default too.
- At deletion, retained all 57 server/database test files, 22 real-browser test files, 21 Playwright specs, both shell-script suites and all four instruction-counter subprocess test files. A browser or server test can use a fixture or mock where its real dependency is still what proves the behavior.
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

On that preceding candidate, a single cheap `vitest run --project repository` found **12 files / 70 tests**: **69 passed, 1 failed**, in **664 ms**. The failure listed `use_case_view_buddies` and `use_case_see_manual_credit`. That candidate's fast default was **not green**; retained assertions did not justify a coverage metadata correction. This historical result is separate from the later focused results below. Scoped Biome passed for all four changed code/config files. Initial type checking failed only because this fresh clone lacked generated Next route types (15 missing `PageProps`/`LayoutProps` errors). After one separately authorized local `next typegen`, type checking passed once. Both type-check logs remain preserved; no env file existed or was read/created for type generation.

The cheap-default-only correction had only static selection/discovery and scoped formatter/syntax/diff/hash checks; none of the completed suites, types, six Vite cases or known-red guard was rerun. Static discovery is not runtime pass evidence. The full web check, broad/browser suites, server/database, e2e, build/font and instruction-counter checks remain **unrun on this correction**. Their prior results below are historical, not new-candidate evidence. No flaky retry occurred. At that preparation, the configured operator wrapper still forced e2e pending approval and installation of an external opt-in-aware proposal. Source changes alone do not establish wrapper adoption or authorize a pipeline run.

## Approved coverage and remaining gaps

Autumn separately approved two genuine real-dependency cases on 2026-10-23. They add the following narrow coverage through the established browser harness, without changing the guard, scanner, case definitions, auth-case list or empty pending-case list. There are no new skip, todo or pending entries.

- `use_case_view_buddies`: the [buddy-list browser feature test](../../apps/web/test/buddies/buddy-list.browser.test.tsx) renders the actual async page. It asserts the heading, all six named built-ins before own buddies, supplied own-buddy order, detail/Tweak destinations, enabled Customize/Clone controls, and the empty-own-list display with built-ins retained. Current-user, store and unsubmitted action boundaries are mocked. It does not prove database ordering or owner isolation, header navigation, legacy `/personas` redirects or action submissions; the full use-case contract remains unproved by this case.
- `use_case_see_manual_credit`: the [footer browser component integration](../../apps/web/test/components/site-footer.browser.test.tsx) renders the real shared header/main/footer with signed-out Login and NotFound components and signed-in Home. It asserts visible Blender Reference Manual and CC BY-SA 4.0 labels, exactly two links, exact destinations `https://docs.blender.org/manual/en/latest/` and `https://creativecommons.org/licenses/by-sa/4.0/`, `rel="license"`, and placement after main content. Auth and unsubmitted action boundaries are mocked; destinations are inspected without external navigation. These representative frames do not boot Next's root layout or prove universal-route rendering, navigation or real sessions.

Saved local results on snapshot `657fc2ecbddf9deabf02cd6710599597fcfa4dce`:

| Check | Observed result | Limit |
| --- | --- | --- |
| Two new browser cases | Four results passed: both cases in Chromium and WebKit, 2.79 seconds | Only these cases and mocked boundaries |
| Unchanged use-case guard | 11 tests passed, 354 ms | Slug/scanner evidence, not every behavioral clause |
| Final two-test-file lint | Passed, 397 ms; no fixes applied | Only the two new test files |

The earlier wrong-package inspection (`MODULE_NOT_FOUND` for `@rolldown/binding`) and initial draft's seven-diagnostic lint failure remain historical failures. The corrected-name inspection and final revised-source lint are distinct evidence, not retroactive passes. The 69-pass/1-failure result above is unchanged; none of these focused results establishes root/full lint, types, a configured gate, Security or delivery. Historical full-check results below are not inherited as current green results.

Before delivery, bind the actual committed candidate, target, effective policy and configured stages, then establish the applicable configured checks and exact-subject pre-Land Security. Delivery and installation acceptance remain separate; these local results grant neither.

`use_case_chat_project_badge` already has genuine real-browser assertions. `test/components/chat-list.browser.test.tsx` checks badge visibility with chat names hidden, placement outside accessible links, rendered colors, long-name ellipsis, containment on 320/390 px screens and accessible chat names across themes and modes. The containment group's metadata now names this slug, with every assertion unchanged. `test/app/(workspace)/chat/page.touch.browser.test.tsx` also checks the badge in the composed all-chats page. This metadata correction does not claim that every deleted jsdom badge assertion survives.

## Lost sole or branch-specific coverage

The [ledger](issue-508-deleted-behaviors.md) lists every removed test title or parameterized template, including all 70 rendered-UI files. Treat those checks as lost coverage except for the specific retained or new assertions identified above; the two additions do not restore every removed title or branch. Same-subject server or browser filenames alone are not evidence that a deleted branch remains covered. Autumn can use this list to decide which real-dependency tests to authorize.

The highest-risk lost dedicated checks are:

- Environment accessor validation beyond the production refusals below. Deletion does not repair #512's unrelated test-setup conflict or change its product code.
- Restored: test-database safety refusals and the production refusal of `TUTOR_MODEL=mock`. [`scripts/test-db/reset-refusals.test.ts`](../../apps/web/scripts/test-db/reset-refusals.test.ts) runs the real `test-db:reset` command in a child process with only the environment each case names, and checks it exits with the specific refusal before connecting: Neon and remote hosts, missing, blank and malformed URLs, non-Postgres schemes, driver routing overrides and repeated options, missing credentials, the server's own and encoded-reserved names, quoted and truncated names, the real or unset tutor, a production deployment, and a missing or non-file outbox. It runs in the fast default. The `EMAIL_TRANSPORT=outbox` production refusal is not reachable through the reset, because the mock tutor's production refusal comes first; the deleted in-process test that expected it failed on `integration` for that reason.
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
- Account/settings/login/setup/signup content and form feedback, memory conflict/restore UI, rename-chat, ChatView refusal restoring typed text, tool-failure lines, error boundaries, not-found content, first-HTML header/theme behavior, and footer behavior beyond the scoped attribution assertions above. Browser layout/visual counterparts do not establish each removed functional assertion.

Production comments still mention removed coverage or helpers in `src/flags/flags.ts`, `src/themes/themes.ts`, `src/themes/theme-font-urls.ts`, `src/themes/theme-fonts.ts`, `src/quota/quota-grant.ts` and `src/email/send-email.ts`. They are flagged here rather than edited outside the authorized production-source scope. Historical decision records and `docs/visual-evidence/issue-506/` remain historical evidence.

## Counts and validation

Measured on 2026-10-23 on Linux, with every browser in the shared browser server (`os-neutral-browsers`), on this branch rebased onto #527:

| Check | Result |
| --- | --- |
| `npm run check` (fast default) | Biome, types, both shell suites; 16 files, 94 tests passed, including the use-case guard and the subprocess refusals |
| `npm run test:integration` | 65 files, 635 tests passed in Chromium and WebKit |
| `npm run test:server` | 57 files, 209 tests passed |
| `npm run test:playwright` | 334 passed, visual baselines included |

Before the deletion, the default Vitest run at `integration` measured 263 files and 2,079 tests. The deletion's removed declarations and templates (987) are listed in the [ledger](issue-508-deleted-behaviors.md).

## Matching ecosystem policy

Ecosystem #164 adoption remains pending. No ecosystem checkout or job was changed. Its `docs/coding-practices.md` should match this repository's copy. The complete resulting Project Buddy file has SHA-256:

```text
aee66734b3bf3f238b4717d4e8bc2218bcc4ec5936b26c9f0f8af2e2850c2d40
```

The patch changes only the shared test-policy paragraph. Its text explicitly permits real-dependency integration and feature-entrypoint tests without requiring full e2e. Source merge does not install, release or deploy this change.
