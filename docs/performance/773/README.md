# Capture record

This directory supports the [signed-in performance assessment](../../performance-assessment.md). Captures ran on 2026-11-09 UTC (2026-11-08 America/New_York). JSON contains synthetic content geometry and allowlisted numeric observations, not session tokens, request/response headers, response bodies or prompts.

## Reproduce the capture

Run from a disposable issue worktree at source commit `242e3a1ac55de980c9eb3b6780f19db66816ed58`. The recipes are corrected reproducers, not byte-exact capture inputs or maintained application commands. Relative to the original run, they fix source readiness, the Lighthouse timespan serializer, screenshot category selection and screenshot sanitization/validation; tool and measured-build versions below remain the capture versions. They name this run's local paths and port; change those to your worktree's provisioned port and installed browser. Keep synthetic sessions in a private temporary file and never check it in.

1. Install workspace dependencies with `npm ci --no-audit --no-fund`.
2. In `apps/web`, run `npm run test-env:init`. Keep its worktree-specific environment; never copy another lane's database or production environment. Start the local test database/proxy using the repository setup if absent.
3. Reset only the worktree database with `npm run test-db:reset`. The command loads `.env.test` and enforces the repository's local/mock/outbox safety checks.
4. Copy `recipes/seed.mts.txt` to `apps/web/audit-seed.mts`, then run the following in `apps/web`:

   ```sh
   node --env-file=.env.test ../../node_modules/tsx/dist/cli.mjs audit-seed.mts
   ```

   This uses existing test-user/data kits to create synthetic fixtures and writes the private `/tmp/pb-773-session.json` with mode 0600. `tsx` is present transitively in this lockfile; a maintained workflow should declare its runner explicitly. Remove the temporary source file after capture. Avoid running tests that reset this database while the audit uses it.

5. Build with the test environment passed to the child process, then start it on the provisioned port. In `apps/web`:

   ```sh
   flock /tmp/project-buddy-unattended-full-suite.lock node -e 'process.loadEnvFile(".env.test"); const {spawnSync}=require("node:child_process"); process.exit(spawnSync("npm",["run","build"],{env:process.env,stdio:"inherit"}).status ?? 1)'
   node -e 'process.loadEnvFile(".env.test"); const {spawnSync}=require("node:child_process"); process.exit(spawnSync("npm",["run","start","--","--port","36447"],{env:process.env,stdio:"inherit"}).status ?? 1)'
   ```

   The first build attempt with `node --env-file=.env.test next build` compiled but its child worker rejected propagated `--env-file` in `NODE_OPTIONS`. The wrapper avoids that runner issue; the normal production build succeeded without changing Next config or checks. Record `.next/BUILD_ID` and `git rev-parse HEAD`.

6. Install audit-only tools outside the repository:

   ```sh
   npm install --prefix /tmp/pb-773-tools lighthouse@12.8.2 puppeteer-core@24.12.1 --no-audit --no-fund
   ```

   The retained captures use Google Chrome for Testing 156.0.8078.4, from Playwright's `chromium-1248`. An earlier Chrome 127.0.6533.88 attempt returned Lighthouse tab-crash warnings and no valid metrics; it is not a successful baseline. The initial pilot also exposed an incorrect request-timing API and an invisible duplicate menu link. Both capture defects were corrected before the retained matrix; no product test failure was retried or hidden.

7. Copy the `.mjs.txt` recipes into `/tmp/pb-773-tools/` without the `.txt` suffix. From the repository root, run each capture sequentially under the shared host lock:

   ```sh
   flock /tmp/project-buddy-unattended-full-suite.lock node /tmp/pb-773-tools/audit.mjs
   flock /tmp/project-buddy-unattended-full-suite.lock node /tmp/pb-773-tools/lighthouse.mjs
   flock /tmp/project-buddy-unattended-full-suite.lock node /tmp/pb-773-tools/controls.mjs
   ```

   Never overlap captures with builds/checks/browser/server suites in this host assignment. The production server may remain idle while waiting. Lighthouse opens each signed-in target before auditing and uses `disableStorageReset`, so authentication and asset caches are warm. It uses its default mobile simulated-throttling configuration, recorded in each report; it is a separate profile from the applied CDP phone matrix and must not be numerically pooled with it.

8. Stop the production server you started. Remove the private session file. Delete the synthetic accounts or reset only this worktree's database through the guarded reset command. Never attach raw HARs, browser profiles, authentication state or unsanitized traces to GitHub.

## Artifact interpretation

`baseline.json.gz` records the matrix's single observations, request response timings, resource start/duration/transfer sizes, buffered paint/largest contentful paint (LCP) entries, layout-shift source rectangles and long-task durations. URLs use route templates in place of UUIDs and omit query strings. Navigation metrics on client transitions refer to the source document; use the transition's `contentMs`, cleared shift/long-task arrays and request records instead. Resource/paint arrays remain cumulative within that document. `contentMs` is host wall time through the browser automation boundary, not a precise User Timing mark.

`*.trace.json.gz` are sanitized DevTools trace event timelines: event names, categories, timestamps, durations and process/thread IDs. Event arguments are intentionally stripped; screenshots are retained only for synthetic Home and adventure streaming. Other routes omit screenshot data to exclude definition prompt text. Layout attribution is in `baseline.json.gz`, not the stripped event arguments. Decompress before importing into DevTools if the installed DevTools does not accept gzip. These are reduced traces, not full raw debugging archives.

`lighthouse.json` and `lighthouse-flow.json` retain audit scores/numeric values and settings, not DOM snippets or screenshot details that could contain prompts. Failed audit warnings remain failures. `controls.json` adds a small phone-only shell/primary/geometry timeline and a trusted menu interaction plus a mock streaming reply in the long adventure. Event Timing entries are individual lab events, not field interaction to next paint (INP). The mock reply exercise is separate from the 200-message baseline and does not represent real-provider latency.

A fixed two-second observation delay belongs to the lab capture protocol. It is not a behavior-test synchronization technique or evidence that all later work has stopped. The geometry observer covers selected shell/main/composer rectangles; it does not prove every descendant is stable. The larger follow-up workflow must measure route-specific control readiness and use longer interaction windows where warranted.

## Interrupted source-page capture

The first current-Chromium matrix retained 53 valid observations, then the editor's client-navigation setup exceeded Puppeteer's unchanged 30-second `networkidle0` navigation deadline on its Workshop source page. No editor transition result was recorded for that attempt. Network idle is a poor readiness milestone when unrelated prefetches continue; it is not evidence that the editor itself took 30 seconds to render.

`recipes/audit-supplement.mjs.txt` preserves those observations and attempts only missing cells. Its source-page preparation waits for DOM content and the absence of a busy skeleton instead of global network idle. It keeps the original direct-load capture behavior and 30-second deadline. This is a documented capture-protocol correction, not a retry of a failed product assertion. Run it with the same lock after `audit.mjs` if that source-preparation failure occurs. Record failures rather than treating every invocation as a completed matrix.

## Lighthouse flow serializer correction

The current-browser navigation reports completed without warnings. The first timespan completed its capture but the reduced-report serializer assumed `requestedUrl` existed, which is not true of a timespan report. The corrected serializer uses an optional URL; `recipes/flow.mjs.txt` repeats only the Home-to-Quests timespan, not the successful navigation audits. This is a tooling error, not a product performance result. URL absence in a timespan does not waive the explicit signed-in source and destination checks.

The menu probe starts after network idle, so it establishes responsiveness at that later point, not the first instant controls become ready. Viewport-relative rectangles can change because of scroll; correlate `lastGeometry` with the separate scroll timeline instead of treating it as cumulative layout shift (CLS) or a proven stable-page milestone. The streaming probe follows the latest content and does not test the user's attempt to read earlier messages.

## Validate the shared artifacts

Copy `recipes/check-artifacts.py.txt` to a temporary `.py` file and run it from the repository root after capture. It validates the committed gzip inputs directly, checks JSON parsing, 78 unique observations, authenticated destinations, nonnegative content milestones, UUID templating, forbidden payload fields and the trace event field allowlist. Optional local raw JSON is validated before compression. It rejects every Screenshot event outside `home.trace.json.gz` and `stream.trace.json.gz`, even an event with no arguments, and checks manifest frame counts.

These are artifact integrity/privacy checks, not product behavior tests or proof that screenshot pixels contain no private content; the synthetic fixture and manual review remain necessary. Only screenshots of synthetic Home/adventure content are retained. Shared artifacts use `baseline.json.gz`; the uncompressed working JSON stays local. Decompress it locally when using the supplement recipe, which reads and writes raw `baseline.json`. The readable table is the review entry point.

The normal production build and `npm run check --workspace apps/web` passed. The fast check reported 40 files and 199 tests passing; no full browser/server/e2e suite was run for this documentation-only change. The captures are opt-in investigations rather than a new correctness suite. Required PR CI also passed the initial draft head; final-head status must be checked separately before merge.

All 78 planned accessible matrix cells were retained. The final authenticated Home-to-Quests timespan completed without warnings. Its applied DevTools-throttling settings differ from the navigation reports' simulated throttling, so interpret each mode separately. The local server was stopped, the private session file removed, and the guarded worktree database reset after capture. The intentionally retained screenshot frames were inspected: Home and the synthetic adventure contain no private definition prompt or session credential. Historical screenshot copy reflects the measured build, before Batteries terminology work.

## Screenshot privacy correction

Review found that the original capture explicitly included `disabled-by-default-devtools.screenshot` on every route. That category overrode the intended `screenshots: false` policy. The earlier claim that only Home and streaming screenshots were present was false; initial manual review covered only those two filmstrips.

The current artifacts remove entire Screenshot events from Activities (6), Adventures (6), editor (6), long adventure (8), quest (6), Quests (6) and Workshop (10). Home retains 7 frames and stream retains 49. The editor frames showed Vellum's built-in definition prompt, already public in `apps/web/src/constructs/vellum.ts`; this still violated the issue's no-prompts rule. This correction removes the frames from current artifacts without rewriting history. No secret exposure or credential rotation is indicated by that public prompt.

The corrected recipes only add the screenshot category for Home, and the sanitizer independently drops Screenshot events elsewhere. The committed-gzip validator enforces the same file allowlist. Numeric observations and non-screenshot trace events are unchanged. This is a privacy correction to existing evidence, not a new measurement.

## Review resolution validation

The correction was checked against the original committed gzip inputs: exactly 48 forbidden Screenshot events were removed, with every other event unchanged. Home/stream and `baseline.json.gz` are unchanged. The gzip validator passes all 78 observations and nine traces; negative checks on temporary copies reject editor Screenshot events both with image arguments and with no arguments. All 26 transition-table totals were independently compared with the numeric archive. Corrected JavaScript recipes pass Node syntax checks. No new browser capture, build or product suite was needed for this docs/evidence correction.

| Review finding | Resolution evidence |
| --- | --- |
| Privacy | Seven traces have zero frames; manifest records removed/retained counts; category selection, sanitizer and gzip validation enforce the policy |
| Transition blind spot | Baseline table includes every transition's all-shift/recent-input totals, source tags and long tasks; #795 bullet 3 includes recent input |
| Phone evidence | Assessment documents script/font completion and correlation limits, 1,504 ms transition/1,278 ms tasks; #796/#797 own delivery and prefetch work |
| Budgets | Separate field/lab table, honest response-header label, unmeasured controls target and realistic-latency server targets; #794–#797 updated |
| Scroll reset | Assessment and #796 document menu-associated reset for #771 coordination without assigning a cause |
| Accuracy/style | Corrected-recipe provenance, historical #767 header rules, glossary terms, metric definitions and uncertain Lighthouse flow scope documented |

Per-route control readiness, repeated-run confidence, realistic server attribution and post-#767 measurements remain open evidence limits. This correction does not claim full #773 measurement acceptance.
