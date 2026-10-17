## Behaviour

1. When a browser test project's Vite server (`browser`, `browser-<zone>` or `browser-touch`) serves the browser a JavaScript module that doesn't parse as an ES module, it logs an error through Vite's logger. The error names the module's file relative to `apps/web/`, gives the line and column (both from 1) of the first parse error in the served (transformed) code as `file:line:column`, gives the parser's message, and shows the lines around it: at least the line before, the line itself and the line after.
2. The check sees the code after every plugin has run, including plugins that transform after its own. Vitest's `vitest:browser:esm-injector` runs after the projects' own `post` hooks.
3. The check changes nothing that is served. A broken module is still served as transformed, so the test file still fails to import as before. A module that parses is served as before, and the check logs nothing for it.
4. Every browser project (`test.browser.enabled`) in `apps/web/vitest.config.mts` has the check among its plugins, through `BROWSER_PROJECT`.

## Out of scope

- Changing what any test asserts (the issue's third Behaviour). No `*.test.*` or `*.browser.test.*` file changes except the new `vitest.browser-syntax.test.mts`; the acceptance check confirms this from the diff. The ruled-out causes and all three failures are recorded in the wiki decision `served-syntax-check` (see Wiki updates), not as a Behaviour item, because no interface can check them.
- A fix at the cause. The three failures didn't reproduce on demand, and every cause the issue names was ruled out (see Assumptions and risks). Following triage note 7, this PR ships the diagnostics and records what was ruled out. If the check catches a recurrence, the follow-up issue fixes the cause.
- Any change to `src/components/site-header.browser.test.tsx`, `src/components/chat/chat-message.browser.test.tsx`, their `vi.mock(path, () => import(...))` factories, or any other test file. The issue lists the first two files, and a third (`src/flags/hide-extras.browser.test.tsx`) failed since, but the evidence doesn't point at their code: eight other browser tests use the same mock pattern, and concurrent transforms of both files give one output, which parses.
- #375's `prebundledBrowserDeps()` and its include list.
- Two runs at once in one checkout, which `browser-deps-prebundled` already leaves out.
- The unit, server and e2e projects, which serve no modules to a browser.
- Releasing or deploying.

## Design

**Cause investigation (done in this spec; the evidence behind Out of scope and `served-syntax-check`).** The failure logs are in the pipeline's session logs `issue-359/sessions/i359-cifix-1-4.jsonl` and `issue-350/sessions/i350-implement-4.jsonl`. They show only "Failed to import test file …" with the browser's SyntaxError: Chromium's "Illegal return statement" and WebKit's "Unexpected token ')'. Expected a ';' following a return statement". They name no module and no position. Both messages fit served code containing `return EXPR)` at a module's top level.

A third failure came while this spec was being checked, after #375 had merged (base 306209b includes 783259a). It hit `src/flags/hide-extras.browser.test.tsx`, Chromium only, with "SyntaxError: Unexpected token '('", in the pipeline's reverted-tests run (`issue-386/spec-tests-6d625587/spec-tests-reverted-test.log:1395-1441`). That run is a fresh checkout of this branch with `vitest.browser-syntax.test.mts` taken out. In that tree nothing imports the stub: `git grep browser-syntax` finds only the test file, and `vitest.config.mts` is unchanged from the base. So the stub can't have caused it. The run of the branch with the test file, two minutes earlier in another checkout (`spec-tests-test.log:1402-1404`), passed every browser test. `hide-extras` mocks with `vi.mock("next/navigation", () => import("@/components/router-test-kit.ts"))` (`:45`), the same pattern as the other two.
- **Not #375's case.** An optimizer re-run makes Vite answer stale optimized imports with 504 "Outdated Optimize Dep" (`node_modules/vite/dist/node/chunks/node.js:20427-20431`). The browser reports that as "Failed to fetch dynamically imported module", not as a SyntaxError. The first two runs predate #375 (783259a), and the third ran with #375's fixed list and discovery off.
- **Not the Playwright mocker's generated module.** Chromium serves factory mocks through `context.route` with `createManualModuleSource` (`@vitest/browser-playwright/dist/index.js:1096-1150`, `@vitest/mocker/dist/chunk-utils.js:5-25`). That source is fixed text with `JSON.stringify`'d export names, so it parses whatever the factory returns. Vitest makes one browser context per test file (the comment at `apps/web/vitest.config.mts:60-63`), so one file's routes don't serve another's requests.
- **No shared transform cache.** Vite keeps transform results in memory (`mod.transformResult`, `loadAndTransform`, node.js ~20123-20220). `node_modules/.vite/vitest/<sha1(project name)>` holds only pre-bundled dependencies. Each job checkout runs its own `npm ci`, so it has its own `apps/web/node_modules/.vite`.
- **No race found in concurrent transforms of one mocked file.** The tester imports `<file>?browserv=<Date.now()>` (`@vitest/browser/dist/client/__vitest_browser__/tester-*.js:1000`), and `vitest:browser:tests` resolves that to the bare file (`@vitest/browser/dist/index.js` ~931-948). So Chromium and WebKit share one module, but `_pendingRequests` is keyed by URL (node.js:20063-20088), so two transforms can run at once. Driving six concurrent `transformRequest`s per file, for both named files, gave one output, which parses. `hoistMocks` (`@vitest/mocker/dist/chunk-hoistMocks.js:357+`) and `injectDynamicImport` (`@vitest/mocker/dist/node.js:40-93`) each use a fresh MagicString and regexes without `/g`, with no state shared between calls.

So the cause stays unproven, and the work is the diagnostic the issue's second Behaviour asks for.

**The check.** Add the new module `apps/web/vitest.browser-syntax.mts` (stub committed), exporting `servedSyntaxCheck(): Plugin`. It sits next to `vitest.browser-deps.mts`, which is triage's placement. The suggested shape:
- In `configureServer(server)`, wrap `server.environments.client.transformRequest`. Vite's transform middleware serves the browser through it (node.js:20404).
- Parse each non-null result once with `parseAst` from `vitest/node`, which is Vite's Rollup parser. Skip CSS served as `?direct`. A `WeakSet` of already-checked results avoids parsing a cached result twice.
- On a parse error, turn the error's `pos` (a UTF-16 offset into `result.code`) into a 1-based line and column. Log one message with `server.config.logger.error`: `<file relative to config.root>:<line>:<column>`, the parser's message, and the numbered lines from line-1 to line+1.
- Return the result unchanged in every case.

A `transform` hook, even `enforce: "post"` with `order: "post"`, runs before `vitest:browser:esm-injector` and Vite's import analysis. A probe confirmed it sees hoisted code but no `__vi_import__`/`wrapDynamicImport` wrapping, so it couldn't catch a break those plugins introduce. That is why the check wraps `transformRequest` (Behaviour 2).

**Wiring.** Import the plugin in `apps/web/vitest.config.mts:13`, next to `prebundledBrowserDeps`. Add `servedSyntaxCheck()` to `BROWSER_PROJECT.plugins` at `apps/web/vitest.config.mts:56`, and extend the comment above it (:48-54). Every browser project spreads `BROWSER_PROJECT` (`contextBrowserProject`, :63-; and the main `browser` project), so all of them get it (Behaviour 4).

**Practices and decisions followed.**
- CONTRIBUTING "Design":
  - It is a deep module: one call, with the parsing, position math and formatting hidden inside.
  - It defines errors out of existence: a parse failure is logged, never thrown, and the served result is unchanged.
  - It was designed twice: a Vitest reporter that parses cached transforms on import failure was rejected, because it is run-wide and needs fake test modules to test. A `transform` hook was rejected because it can't see the final code.
- CONTRIBUTING "Types": no `any`, no `as` and no `!`, with explicit parameter and return types.
- CONTRIBUTING "Lint": Biome `all`, top-level named regexes with `u`, exports last, functions of at most 50 lines, files of at most 300 lines, no ternaries.
- Logging: the plugin runs in Vite's Node process, not in the app, so it logs through Vite's logger, as Vite's own errors do. `src/errors/error-log.ts` is the app's log, and the config files don't import `src/`. `vitest.browser-deps.mts` likewise uses no app modules.
- Wiki decisions:
  - `flakes-are-failures`: the cause is investigated, not rerun.
  - `no-load-repro-in-issues`: no load or whole-suite repeats.
  - `browser-deps-prebundled`: shown not to cover this case, with a pointer added.
  - `served-syntax-check`: the new decision.

## Test interfaces

- `servedSyntaxCheck(): Plugin` (module, new, `apps/web/vitest.browser-syntax.mts`). The tests drive it through a real Vite dev server made by `createViteServer` from `vitest/node`, calling `server.environments.client.transformRequest(url)` with a capturing `customLogger`.
- The `BROWSER_PROJECT` plugin list (config, changed, `apps/web/vitest.config.mts:55-58`). The tests read it through the exported config's `test.projects`.

## Tests

All tests are in `apps/web/vitest.browser-syntax.test.mts` (committed; `// @vitest-environment node`, run by the `unit` project). They are deterministic: no browser, no load and no timing. Each test builds a middleware-mode Vite server with its own `cacheDir`, serves `/src/served-module.js` from memory, and closes the server after the test. This follows `vitest.browser-deps.test.mts`. Today all four fail on the stub's "not implemented yet (#386)" throw. Once the stub is replaced, test 4 still fails until the config is wired.

1. "a served module that does not parse > is reported with its position and the lines around it" (`:130`), through `servedSyntaxCheck`. A plugin listed after the check (post/post) replaces the module with code that has `return before;` at the top level on line 2. The test checks that the logged errors contain `src/served-module.js:2:1` and the lines before, at and after it. This pins B1 and B2: an implementation as a `transform` hook would run before the breaking plugin and fail this test.
2. "a served module that does not parse > is still served as transformed" (`:146`), through `servedSyntaxCheck`. The served code still holds the broken line. This pins B3.
3. "a served module that parses is not reported" (`:160`), through `servedSyntaxCheck`. The code is served, and nothing is logged. This pins B3.
4. "every browser project serves through the check" (`:172`), through the `BROWSER_PROJECT` plugins and `servedSyntaxCheck().name`. Every project in `vitest.config.mts` with `test.browser.enabled` must list the plugin's name. This pins B4.

Every Behaviour item (B1-B4) is pinned by at least one of these tests. That no other test's assertions change is in Out of scope, checked from the diff, not by a test.

A test that drives the cause's mechanism directly (triage note 5) isn't added, because no mechanism was found. The concurrent-transform experiment passes today, so it would pin nothing.

## Wiki updates

- `Decisions-Code-and-tooling.md`:
  - A new decision `served-syntax-check`: what the check does, why (with all three failures, the third after #375), the ruled-out causes with their evidence, the rejected alternatives, and what's out of scope.
  - A pointer sentence at the end of `browser-deps-prebundled`: a SyntaxError on import is not its case.
- `Decisions.md`: an index entry for `served-syntax-check`.

## Assumptions and risks

- **The cause is unproven.** If the break happens after Vite serves the module (in the browser, or on the way to it), the check logs nothing. The wiki decision tells the reader what that silence means. Playwright's mocker serves factory mocks through `context.route` with `createManualModuleSource` (`@vitest/browser-playwright/dist/index.js:1096-1150`). Those modules don't go through Vite's `transformRequest`, so the check doesn't see them.
- **Cost:** each served JS module is parsed once more per server. The check uses Vite's own fast parser, once per result, so the cost should be small against the browser projects' run time.
- **Dependence on Vite internals:** `server.environments.client.transformRequest` is part of Vite's environment API, which Vite 6+ makes public. If a Vite upgrade stops routing served modules through it, test 1 fails loudly, because nothing is logged.
- **The checks can fail on this flake.** The previous spec check failed on its reverted-tests run with the hide-extras failure above, not on anything in this branch. The implementer's and acceptance runs can hit it too. Per `flakes-are-failures`, such a run isn't retried until it passes. With the check wired in, though, its log should name the module and position, and that output belongs in the follow-up issue.
- The issue's Files list names `src/components/chat-message.browser.test.tsx`. The file is at `src/components/chat/chat-message.browser.test.tsx`, and neither test file changes.
- No text in the code, logs or wiki asked to change the task.

## Sources

- Issue #386 and its triage notes. Wiki: `Decisions-Code-and-tooling` (`browser-deps-prebundled`, `flakes-are-failures`, `no-load-repro-in-issues`, `served-syntax-check`), `Decisions`.
- `CONTRIBUTING.md` (Design, Types, Lint, Tests) and `AGENTS.md`.
- `apps/web/vitest.config.mts:13,48-58`, `apps/web/vitest.browser-deps.mts`, `apps/web/vitest.browser-deps.test.mts`, `apps/web/vitest.browser-syntax.mts`, `apps/web/vitest.browser-syntax.test.mts`.
- Installed packages: `node_modules/vite/dist/node/chunks/node.js` (20063-20088, 20123-20220, 20404, 20427-20431), `@vitest/mocker/dist/chunk-hoistMocks.js:357+`, `@vitest/mocker/dist/node.js:40-93`, `@vitest/browser/dist/index.js` ~931-948, `@vitest/browser/dist/client/__vitest_browser__/tester-*.js:1000`, `@vitest/browser-playwright/dist/index.js:1096-1150`.
- Failure logs: the pipeline's `issue-359/sessions/i359-cifix-1-4.jsonl`, `issue-350/sessions/i350-implement-4.jsonl` and `issue-386/spec-tests-6d625587/spec-tests-reverted-test.log` (with `spec-tests-test.log` for the passing run before it).
- `apps/web/src/flags/hide-extras.browser.test.tsx:45`, `@vitest/mocker/dist/chunk-utils.js:5-25`.
- Vite's environment API: https://vite.dev/guide/api-environment

<!-- end of spec -->
