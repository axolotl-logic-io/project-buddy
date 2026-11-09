# Stable page geometry evidence

This directory contains capture checkpoints and a prepared final protocol for #795. It does **not** establish final candidate-budget acceptance. See [the frame rationale](frames.md) for implementation and tradeoffs, and [the manifest](manifest.json) for source/build identities.

## Cohorts and current status

| Cohort | Source and build | Observations | Interpretation |
| --- | --- | --- | --- |
| Initial checkpoint | Before `bb4d213c`, build `5ZJdzqfe5kTwOioEMjRk9` | 17 records: 12 completed, four editor capture failures, one failed editor diagnostic | Flat snapshot topology was wrong; retained separately in `checkpoint.json.gz` and `checkpoint-traces/` |
| Provisional v2 | Same before; after `737c914fa8e5f87a198430552c8dddb86d5b9d60`, build `Ab_dyq8SMB34B7XgLvl6P` | 48 completed, zero capture failures: before sample 1 and after samples 1–2, 16 cells per pass | Stopped after the active pass for review fixes and protocol corrections; isolated in `provisional/v2-737c914f/` |
| Fix round | After `07038f4`, build `nZtNbQzEfJ9A7y64XAnmf` | No performance captures | Product checks/build and focused browser evidence belong to the parent; this build is unmeasured here |
| Final v3 | Awaiting repair, Workshop drawer reconciliation and final paired source/build identities | Not started | Prepared protocol only; no final ten-run result or passing budget claim |

The initial checkpoint uses `geometry-commit-probe-v1`. The provisional cohort uses v2, with source-menu confirmation and a same-document guard, but its generic readiness/sampler selectors could match cached hidden content. These cohorts are not pooled into final confirmation. The historical #773 builds `242e3a1` and `9a8ab46` remain background evidence, not post-change measurements here.

The parent requested a stop while its one fresh-context implementation round addressed review findings. The active v2 pass closed its browser/server before the controller stopped and released the host lock. That intentional controller stop is not a product or capture failure. Counts remain unequal and insufficient for final confirmation.

## Provisional finding

The first pair supports a remaining desktop content-width change, while phone route totals still exceed the candidate transition limit. In both v2 builds, Quests→Home moves main from document Y 112 to Y 60 as the breadcrumb row disappears. That entry alone is approximately 0.05723 on phone, above 0.05. Home→Quests is also above the phone target. These shifts remain included despite recent input; the clicked-link rectangle is separate from affected source rectangles. The v2 frame change therefore does not satisfy that phone transition target.

The raw records also retain initial-load movement excluded from CLS by the browser’s recent-input flag. For example, provisional after phone Home cold-direct reports initial session-window CLS 0 while its all-shift diagnostic is approximately 0.04671. No route/control click is intentionally performed during a cold-direct observation. A zero initial metric does not mean the page had no visible movement, and the flag alone does not prove human input. No font or emulation cause is claimed from these geometry records alone.

## Shared capture conditions

Captures use synthetic accounts/data, an isolated guarded local database, mock models and file outbox. No production service is queried or changed. Sessions remain in a private temporary file and are never exported. The browser is Chrome for Testing 156.0.8078.4 with Puppeteer Core 24.12.1 and Node 24.6.0. Each successful v2 record retains its actual browser version.

Desktop uses 1440 × 900, device scale factor 1 and unthrottled CPU/network. Phone uses 390 × 844, mobile/touch enabled, scale factor 1, CPU slowdown 4, network latency 150 ms, download 200,000 bytes/s and upload 93,750 bytes/s. Both use the light theme. Each observation starts a fresh context. Direct navigation is browser-cache cold; client navigation warms only its declared source. Warm direct loads are outside this cohort. Server/database caches are not reset between paired batches. Each record includes host load averages, free memory and CPU count.

Source routes are Quests for Home, Home for Quests, Quests for the synthetic quest, and Workshop for the synthetic user's own-construct editor. Pair order alternates before/after then after/before by sample. The final plan starts with three runs per cell, then confirms to ten per variant/profile/journey/mode cell: 320 observations. No observation is removed because it is an outlier or follows a click.

## Metric windows

Initial-load session-window CLS excludes recent input. The reducer initializes the window at the first eligible shift and resets at a one-second gap or five-second window. The validator independently reconstructs this value. Transition all-shift sum includes recent-input shifts and is **not official CLS**. The candidate limits are initial ≤0.1 and transition ≤0.05.

A client observer resets immediately before activating the real visible link, after source preparation and safe-region scrolling. The record includes the activated region and its document-coordinate rectangle separately from affected shift sources. Observation continues through observed primary-content presence +2 seconds, with actual end time retained. This is a finite lab window, not a timed correctness assertion or permanent-stability claim. Paint/resource metrics from the source are not relabelled as destination metrics.

Raw shift-source viewport rectangles and observer-delivery scroll offset remain available. Converted document coordinates during scrolling are approximate because delivery scroll may differ from entry-time scroll. V2 sampled regions use document coordinates, including the normal-flow header. The earlier v1 checkpoint retains header viewport Y and must be read with its scroll timeline. Browser shift scores are unchanged.

## Visibility protocol v3

V3 extends the [#773 supplemental readiness recipe](../773/current/README.md). Every busy/readiness/menu/column/input candidate passes browser `checkVisibility()`, including CSS visibility and opacity. Source preparation awaits a trusted menu click opening the visible dialog, Escape closing it, and the expanded state becoming false. These states are awaited directly, with no source-readiness sleeps. Destination `performance.timeOrigin` must equal the source value; a full-document fallback fails a client observation.

Both variants require the same visible primary surface. The activated-region enum comes from the actual shared-header, navigation or main-content ancestor. Sampled regions carry observer-local numeric instance counters; column replacement is labelled separately from movement of one node. These counters are not domain or DOM identifiers and never exclude a browser shift. A nonzero visible header, main and column must exist at completion. Missing header samples cannot pass a geometry invariant vacuously.

The prepared reducer reports medians, min–max ranges, descriptive IQR widths, paired deltas/ranges and direction counts. These describe measured spread, not confidence bounds or field percentiles. Tied values do not establish no regression. Samples outside a descriptive 1.5-IQR fence remain in every summary and receive source/load notes; a load association alone does not establish a cause. Editor results remain nonfinal until the Workshop drawer change is reconciled.

## Pixel privacy and filmstrips

Only `home.trace.json.gz` in the declared before/after × desktop/phone × cold-direct/client-navigation directories can retain screenshot events. Stream/editor/quest filenames and unknown directories are rejected. Non-screenshot events retain timing/category fields without arguments; screenshot arguments allow only the image plus known numeric compositor metadata. Numeric artifacts use static enums, tags, rectangles, timing values and booleans, without prompts, input text, account/domain identifiers, headers, cookies or sessions.

Cold-direct Home pixels cover the document window. Provisional v2 client pixels began after a visible atlas plus two rendering frames. That was asymmetric: the old before fallback has no atlas, while the after fallback does. V3 instead starts client pixels only after the **same visible primary Home link criterion in both builds**, followed by two rendering frames. These delayed pixels intentionally omit loading and earliest transition frames; the numeric observer still covers the complete activation window. Screenshot scope and pixel start remain explicit. Only sample 1 is traced, identically in each paired variant; later numeric samples omit tracing.

All 44 retained v2 client frames were manually inspected: before desktop 2, before phone 4, after desktop 17, after phone 21. They show only synthetic Home/loading UI and shared-header pixels, with no source Quests pixels, prompts, identifiers or sessions. Review counts are in the provisional manifest. Every final client frame must receive the same review. Quest/editor and complete transition filmstrips use numeric region rectangles rather than page pixels, preserving the no-prompts rule. This limits their visual coverage deliberately.

The initial v1 Home transition traces mistakenly began screenshot capture on the Quests source. All 14 screenshot events that could include source pixels were removed: five desktop and nine phone frames. Other events and numeric observations are unchanged. The corrected traces remain under `checkpoint-traces/`; this is a recorded privacy correction, not a performance rerun.

## Snapshot topology correction

Flat temporary snapshots (`before-app/.next`) answered editor HTTP 200 and then terminated before main/textarea content. Four captures and a separate browser diagnostic failed at the unchanged 30-second readiness deadline. An authenticated document-only probe also retained a transport failure. No product fix or passing retry is inferred from these failures.

The compiled Turbopack runtime resolves filesystem modules three directories above `.next`, matching `apps/web/.next`. A flat snapshot changed that project root to `/tmp`. Corrected snapshots preserve `before-app/apps/web/.next` and `after-app/apps/web/.next`, with root `node_modules`, app-level config/public files and the app directory as cwd. Before further capture, document verification returned complete HTTP 200 editor content with main/textarea/title and complete Home content with main/title/atlas. This confirmed the snapshot setup defect without a product change.

## Validation and reproduction

The [lightweight preflight report](preflight.json) validates the actual compressed v1/v2 artifacts through the same schema/trace functions used by final validation, with `complete=False`. It checks retained failures as well as completed records, strict nested field/type allowlists, source rectangles, independent metric reduction and every compressed trace. Negative copies cover nested payload fields, an unredacted identifier, unauthorized screenshots with and without arguments, the forbidden stream filename and unknown screenshot arguments. It does not synthesize a final cohort or check final completeness.

To repeat that light preflight, copy `recipes/validate.py.txt` to a temporary `.py` file and run `python TEMP_VALIDATOR.py --preflight` from the repository root. Final validation uses the same file without `--preflight` and requires the actual 320-run v3 cohort, matched build identities and exact derived numeric filmstrips. This local recipe supplements the maintained #797 audit tooling; it is not a second shipped audit command.

For new captures, provision the worktree's guarded environment and existing #773 synthetic seed kits. Keep sessions private. Build each supplied revision with that environment, preserving separate snapshots with the original monorepo topology. Correct absolute recipe paths and unique port/database when reproducing elsewhere. Copy archived recipes without `.txt` into a private temporary directory.

Run every expensive build/server/browser/capture stage sequentially under `flock /tmp/project-buddy-unattended-full-suite.lock`, including server lifetime. Follow coordinator reservations before queueing work. The prepared controller stops after a completed pass when requested, stops on capture failure, and refuses to overwrite an existing cohort. No blind retries are permitted. After capture, run the reducer and compressed-artifact validator, stop owned servers/browsers, remove the private session file and reset only the guarded worktree database once the parent no longer needs it. No hosted telemetry or collection endpoint is introduced.
