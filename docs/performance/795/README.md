# Stable page geometry evidence

The final matched production-build cohort for [#795](https://github.com/axolotl-logic-io/project-buddy/issues/795) contains **320 observations, ten per variant in each of sixteen cells, with zero capture failures**. All 80 after direct-load observations meet initial session-window CLS ≤0.1; all 80 after client observations meet the separate all-shift transition sum ≤0.05. The largest after initial metric is 0.001360; every after transition sum is zero. These are finite local observations, not field percentiles, INP or a permanent-stability guarantee. Fresh independent Opus review accepts the revised product and completed evidence with no material blocker or recapture required. Protected integration merge remains pending.

[Results](results.md) include medians, min–max, IQR, paired differences, retained outliers and inclusive direct-load diagnostics. [The comparison chart](transition-comparison.png) shows transitions only. [Frame ownership](frames.md) explains implementation and tradeoffs. [The manifest](manifest.json), [build record](post808-builds.json), [confirmation summary](confirmation-summary.json) and [validator result](validation.json) identify this cohort. Historical #773 numbers are not reused as post-change measurements.

## Source and build lineage

| Variant | Exact source | Production build |
| --- | --- | --- |
| Before: integration including actual Workshop drawer, shared browser repairs and #794 | `70f0fc09a9d07ec3ffeafd7af8465a19c5bf324c` | `cSP-7V74N3htfQPMQq_cE` |
| After: same lineage plus #795 frames and current-page Home breadcrumb | `9f44f3c5a8060e11491ffc48489313c5fc8d6b0e` | `noCbIyhyy19Vp_A8gWb4O` |

The authorized dependency reconciliation happened once, after PR #808 actually merged. Both variants contain the real full-width editor and initially closed modal test drawer. Neither final variant uses the earlier side-by-side editor. Subsequent commits containing this record change documentation/artifacts only; they do not relabel the measured product source.

Both builds used identical root package inputs and the same guarded local test environment. The before app tree was verified against the integration source, built, and restored with an exit trap before building the verified after tree. [The archived build recipe](recipes/build-post808-pair.sh.txt) records that procedure. Snapshots preserve `apps/web/.next` and root `node_modules`, including runtime-module symlinks. No environment file is copied into a snapshot.

## Conditions and windows

Only synthetic accounts/data, isolated local test database, mock models and file outbox are used. No production access, live purchase, Marketplace activation or hosted collection occurs. The browser is Chrome for Testing 156.0.8078.4, Puppeteer Core 24.12.1, Node 24.6.0. Theme is light. Desktop is 1440 × 900, scale factor 1, unthrottled. Phone is 390 × 844, mobile/touch, scale factor 1, CPU slowdown 4, latency 150 ms, download 200,000 bytes/s and upload 93,750 bytes/s.

Each observation has a fresh browser context. Direct loads are browser-cache cold; client observations warm only their declared source. Warm direct loads are outside this cohort. Sources are Quests → Home, Home → Quests, Quests → synthetic quest, and Workshop → the synthetic user's own-construct editor. Server/database caches are not reset between paired batches. Sample order alternates before/after and after/before. Samples 1–3 are exploration; 4–10 confirmation. No failures or outliers are removed or blindly retried.

Source preparation uses the real visible shared menu, awaiting its open state, Escape closure and collapsed state. All readiness/busy/geometry selectors use `checkVisibility()` so hidden cached routes cannot satisfy them. Unchanged `performance.timeOrigin` proves same-document client navigation; native document fallback fails a client sample. This differs from older #773 main-only source preparation, so those cohorts are not pooled.

The observer resets immediately before activating the real visible link, including the automation boundary. Its activated region is derived from the actual ancestor and recorded with a document-coordinate rectangle and separate scroll timeline. The browser's affected source rectangles remain separate. Observation ends after visible primary-content presence +2 seconds; actual end times are retained. Initial-load CLS uses standard session windows and excludes recent input. Transition all-shift sum includes **every** shift, including recent input, and is **not official CLS**. No click-associated shift is excluded as deliberate movement.

Raw source rectangles use viewport coordinates with observer-delivery scroll offsets; derived document coordinates during scrolling are approximate. Sampled regions use document coordinates. Observer-local numeric node instances distinguish column replacement from movement of the same element; neither case removes browser shift entries. A nonzero visible header/main/column must exist. Every observation ends with at least 500 ms quiet in the observed shifts and sampled regions (minimum 1,350.4 ms here). This says nothing about unobserved descendants or future movement.

Host one-minute load at starts ranges 0.81–4.21. Capture began 2026-11-09 at 13:17:29.372Z and the last pass completed at 13:36:15.643Z. Controller wall time is 1,126.27 seconds, including server/browser lifecycle and capture serialization, excluding lock queue, snapshot preparation, reducer and validator. Alternation controls one ordering trend, not all host contention.

## Interpretation and remaining movement

Desktop Home client median falls from 0.25148 to zero, Quests client from 0.21674 to zero, and editor client from 0.09501 to zero. Phone Home and Quests client medians fall from 0.05723 and 0.05256 to zero. Quest client observations are zero in both variants. These improvements belong to this matched pair, not the older #767 header cleanup.

Static route frames remove content-dependent ancestor-width changes. The additional current-page Home breadcrumb uses the existing location-row policy and prevents its insertion/removal from moving main during shared navigation. It deliberately makes Home's initial header taller: 112 px in this fixture versus 64 px before. Its existing pinned location row is 52 px. This spends Home screen space on meaningful location content; it introduces no atlas-dependent header style, fake spacer or new scroll owner.

Phone Home direct-load all-shift movement is **0.04671467 in every before and after sample**. The after browser marks that entry as recent input in all ten samples, while before does so in two. No route/control click is intentionally made in cold-direct observations, and that flag alone proves no deliberate input. Therefore the official metric's apparent improvement is not an actual phone Home movement improvement. Footer/link/text rectangles still move. Responsive/font settlement is plausible, but these records do not establish its cause. The inclusive table preserves it.

Other small phone direct-load text/button movements remain, including two positive paired differences each for Quests and quest initial metrics. They remain within the candidate limits. The desktop editor before cold-load width shift appears once in ten samples; the median zero does not erase that failure. Detailed source inspection and uncertainty notes are in the results. Tied ten-run values and IQRs are descriptive, not confidence intervals or no-regression claims.

## Filmstrips and privacy

[Compressed geometry](geometry.json.gz) contains the complete numerical observations. [Numeric filmstrips](geometry-filmstrips.json.gz) and [32 SVG timelines](geometry-filmstrips/) cover sampled header/main/column/input geometry and source rectangles for each cell/variant. Editor/quest and the earliest client transition remain numeric-only; no editor text or source-page pixels are exported.

Only the eight declared `before|after/desktop|phone/cold-direct|client-navigation/home.trace.json.gz` paths may contain screenshots. Cold Home pixels cover startup through the observed window. Client Home screenshots begin after the **same visible primary-content criterion in both variants**, plus two rendering frames. They intentionally omit loading/earliest transition pixels; numeric observation still covers the full activation window. Only sample 1 is traced in each cell, identically in both variants.

The parent inspected every final frame on lossless contact sheets: 47 total (before desktop cold/client 7/2, before phone 7/4, after desktop 9/2, after phone 12/4). Only synthetic Home/blank startup and shared header appear. All 153 retained frames across final and historical cohorts have documented manual review. The validator checks structure, not pixel meaning; capture construction and manual review enforce that scope.

Numeric records allow only static enums, tags, rectangles, timings, booleans and local observer instance counters. No prompts, input text, account/domain identifiers, SQL, headers, cookies or sessions are retained. Non-screenshot trace events have no arguments; screenshot arguments allow only the image and known numeric compositor metadata. The strict compressed validator passes all 21 negative cases, including nested payloads, identifiers, unknown screenshot arguments and unauthorized screenshot paths. It independently recomputes metrics, exact cohort completeness and numeric filmstrips.

## Validation and reproduction

At measured after source `9f44f3c5`, fast checks pass 256 tests; focused Chromium/WebKit browser integrations pass 274 cases and phone/touch integrations pass 258, **532 affected cases total**. Both production builds and font guard pass. These are affected checks, not a duplicate full shared baseline. Canonical PR #812 owns the clean 1,232-case full browser baseline already merged into this lineage. Logs remain at `/tmp/pb-795/post808-validation.log` and matched-build logs under `/tmp/pb-795/`.

This record extends existing #773 capture recipes; #797 owns the maintained audit command/schema. Copy the archived `.txt` recipes into a private temporary directory, adjust absolute worktree/port/database paths, and provision the guarded local environment using existing test/seed kits. Keep the session file private. Build the two exact revisions, preserve snapshot topology, and use [the final pair configuration](recipes/final-pair-config.json.txt). The controller refuses an existing cohort and stops on any capture failure; preserve failures rather than repeating until green.

All expensive stages, including the complete server lifetime, run sequentially under `flock /tmp/project-buddy-unattended-full-suite.lock`. The final run held that lock for preparation and the whole paired cohort, then reduced and validated the artifacts. Do not overwrite this completed cohort. The validator rewrites its report in the supplied artifact directory. To reproduce validation without changing the checkout, use a scratch copy from the repository root:

```sh
capture_copy=$(mktemp -d /tmp/pb-795-validation.XXXXXX)
cp -a docs/performance/795/. "$capture_copy/"
python "$capture_copy/recipes/validate.py.txt" "$capture_copy"
```

`--preflight` validates retained artifacts without asserting final completeness. Final validation without flags reports 320 completed final records, 24 trace files across all cohorts, 153 screenshot frames and 21 passing negative cases. No hosted telemetry or service is introduced; collection stays off.

## Retained history and review disposition

[Preparation history](preparation-history.md) preserves the earlier pending-state narrative verbatim, explicitly superseded by this record. Initial checkpoint: 17 records, including four editor timeouts and one failed diagnostic caused by wrong flat snapshot topology; failures are retained, not product defects or erased retries. Fourteen source-inclusive screenshot events were removed and documented. The corrected runtime layout resolves filesystem modules relative to the original monorepo root.

The stopped provisional v2 cohort retains 48 observations, zero failures and unequal counts, before `bb4d213c` versus after `737c914f`. Its old side-by-side editor is not final evidence. The isolated Home location-row pilot retains 24 observations, three pairs across four client cells, reviewed fix `07038f4` versus `e6d2ab1e`. An initial symlink-copy preparation failure started no browser and produced zero observations; it is retained separately. Neither cohort is pooled into the final pair. Earlier `a29dbe28`/`fb065b53` builds are unmeasured prototypes; `07038f4` was measured as the pilot control.

Fresh Opus review at `6ee32fc3` requested changes. The one authorized fresh Codex implementation round committed `07038f4`, fixing cached Home decoration, Home error gutters, duplicate quest announcements and real frame tests. Its 249 fast and 390 focused browser cases passed. Parent inspection also corrected/validated the artifact pipeline and phone location-row alternative. [Final fresh Opus review](review.md) at `02ab280a` accepted the revised product and completed evidence with no material blockers or recapture requirement. The parent resolved its documentation notes without changing measured product source. The optional layout-prop typing consistency nit is deferred to avoid an unrelated product edit.

| Review concern | Resolution |
| --- | --- |
| B1 hidden/cached Home decoration | Loading renders inactive; HomeAtlas starts inactive and activates only through visible layout effects; hidden first-mount/cache tests |
| B2 Home error gutters | Real segment error wraps PageError in the ordinary inner frame; 320/390/1440 px retry/gutter tests |
| B3 duplicate status; T1/T2 weak/missing tests | One labelled quest loading status with decorative shapes; real loading/empty/populated/error frame geometry tests |
| E1/M6 screenshot validator | Known compositor metadata allowed; Home-only exact path allowlist; all retained traces and negative cases validated |
| M1/M2/M3 pixels/readiness/nominal regions | Matched visible primary pixel start; visibility-filtered selectors; node replacement and actual activated ancestor recorded; early client pixels intentionally absent |
| M4 actual drawer dependency | Actual PR #808 integration merged once; both final builds contain the real drawer-loaded editor |
| M5 uncertainty/outliers | Ten alternating pairs per cell, IQR/ranges/paired directions, retained source/load outlier notes and browser-flag caveat |
