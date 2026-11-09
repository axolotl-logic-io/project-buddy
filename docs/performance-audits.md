# Authenticated performance audits

The web maintainer owns the opt-in audit command, its browser and Lighthouse pins, fixtures, route controls and artifact schema. A feature's author owns matched before/after evidence for their change. The command extends the [#773 assessment](performance-assessment.md); it does not turn exploratory scores into required performance gates.

## Existing tools

The site already has centralized error logging in `apps/web/src/errors/error-log.ts`, with application, email, notification and model-call diagnostics. Those logs serve error diagnosis and accounting. They are not a field performance dataset and must not be copied into audit artifacts. The theme font tests and `npm run check:build-fonts` guard local font delivery. Repository, Vite, browser and server stages keep deterministic behavior checks; production-build performance captures remain opt-in.

The original captures measured `242e3a1` and `9a8ab46`. Their checked-in recipes contain historical paths and corrections. Neither is a measurement of current integration. The maintained command reuses their synthetic account/session and test-data kits and control actions. Its `commit-probe-v5` protocol records source-menu preparation, waits for a visible destination link and rejects full-document client fallbacks. After each observation window it checks that the page shows its state's own content (see [State content](#state-content)). Version 4 rows predate that check; the archived supplemental protocol remains `commit-probe-v2`. It adds repeated empty cells and validates the compressed artifacts that a reviewer receives.

## Run a local audit

From `apps/web`, provision this worktree's manual environment with `npm run test-env:init` and start its local database/proxy with `npm run test-db:up`. Use only the isolated synthetic/mock environment. Commit the source changes before capture so the recorded source and build are reviewable. Supply the pinned Chrome for Testing 156.0.8078.4 executable; a different browser version fails preflight.

```sh
npm run audit:performance -- --output /absolute/new-audit-directory --browser /absolute/path/to/chrome --samples 3
```

The output directory must be new. The runner holds `/tmp/project-buddy-unattended-full-suite.lock` through its expensive stages, so do not wrap it in the same lock. It builds and starts a production server on the worktree's port, seeds synthetic data with the existing kits and collects the matrix sequentially. It resets only that worktree's guarded test database. Do not run another test or audit against that database during capture. The alias-aware fixture subprocess writes session state into an owned temporary directory through an exclusive mode-0600 file. The native parent validates it and removes that directory before browser capture. Credentials otherwise remain in memory. Stop only the server owned by the run.

To revalidate an existing output without building or starting the site, run:

```sh
flock /tmp/project-buddy-unattended-full-suite.lock npm run audit:validate -- --output /absolute/audit-directory --samples 3
```

This command validates the actual gzip bytes and required trace set, then requires a strict manifest of a complete full audit at that sample count, a `summary.json` equal to the one its gzip rows produce, and every sample's verified Lighthouse navigations and timespan from the manifest's Lighthouse version. Unknown fields fail. It does not certify screenshot pixels, and it rejects a diagnostic cohort or a partial Lighthouse run.

For a larger confirmation cohort, pass `--confirmation` (ten samples by default). Confirmation alone is not a before/after experiment: the changing feature's owner must alternate matched builds and preserve every failed attempt. Inspect the compressed numeric output, summary, conditions and failures before sharing. Manually review any allowed filmstrip pixels.

## Comparison protocol

Use production builds and match fixture size and lineage, pinned browser and Lighthouse, viewport, theme, network/CPU throttle, cache state, source route and observation window. Record source commit, build ID and host load. A fresh browser context makes the browser cache cold; it does not reset database or server caches. Warm direct loads reuse the browser context. Client navigation first confirms the shared menu on its authenticated source and closes it, then waits for a visible destination link and resets observers before activating it. The shared menu may hydrate before a streamed detail link exists. This unmeasured preparation warms the source and establishes a trusted control response. A changed document time origin fails the client sample. Include source-page prefetch separately; do not pool this source preparation with older recipes that only waited for main content.

Start with at least three independent runs of every accessible scenario. Report median and min–max, including outliers and failed captures. For decisions about a change, alternate before/after order and collect at least ten confirmations per affected cell. Explain outliers and uncertainty. Do not infer a percentile or declare no regression from three samples. Never rerun a failed capture until green; retain its failure and correct the cause or protocol explicitly.

The accessible matrix covers populated Home, Quests, quest, Adventures, 200-message adventure, Activities, Workshop and an own construct editor. Empty accounts cover the five list pages; a separate synthetic owner has an empty quest and zero-message adventure. Desktop and phone each cover cold direct, warm direct and client navigation. An inaccessible detail page is a capture failure, not an empty-content result.

The summary names `primaryControlProxy`: when the journey's primary control was present, not when its content finished.

Controls must confirm route-specific state: a menu/dialog opens, a status tab changes, Send becomes enabled, or a unique edit marker reaches local draft storage. Native textarea values alone do not prove React handled input. Probes use a fixed 100 ms resolution and 42-character input actions. Confirmation is an upper bound including action and automation work; match action length before comparing results. Disconnect prior observers before resetting transition arrays. Reject duplicate shifts and stale-marker draft confirmations.

Direct measurements use navigation start; transitions use the observer reset immediately before route-link activation, including the automation boundary before the click. Keep shell arrival, useful-content presence, confirmed controls, activated-link geometry and affected shift-source rectangles separate. Geometry uses document coordinates and scroll is recorded separately. Observe at least five seconds and at least two seconds after confirmation; report whether the final 500 ms is quiet. A quiet window means no geometry change or layout shift; it says nothing about the network. The summary's `network` block reports completed requests, prefetch requests and bytes per cell over the whole observation, and counts rows still starting requests in the final 500 ms. Finite quiet intervals do not prove permanent stability. In client navigation the shell time is the persisting header, which was already present before activation; it is not a new arrival.

Initial-load CLS uses maximum session windows excluding recent input, with gaps under one second and duration under five seconds, following the [web-vitals session algorithm](https://github.com/GoogleChrome/web-vitals/blob/main/src/lib/LayoutShiftManager.ts). The pinned Lighthouse version has its own trace reducer; keep its reported value separate. Transition diagnostics sum all shifts, including recent input, and are not CLS. A Lighthouse timespan may include source-document lifetime contribution: #773's flow CLS exactly matched Home navigation CLS. Until mode attribution is established, retain that limitation and use the cleared observer series for transition movement. Navigation and timespan support different metrics and throttle configurations. Failed, warned, redirected or unauthenticated Lighthouse audits fail capture, and so does an audit with any errored audit.

Lighthouse drives the same page whose content the runner checks. The runner passes that page to Lighthouse, requires its time origin to change during the audit, the last main-frame commit and final address to be the requested page, and the content check to run in the document Lighthouse left. The `bf-cache` audit is skipped: its gatherer leaves the audited page and returns, which would leave the tab holding a different document. Lighthouse's mobile screen and user agent are applied before each source page loads, and a timespan whose viewport changes when it starts fails. Each retained report records these checks. TBT and individual lab Event Timing entries never represent field INP.

Byte and long-task comparisons use a fixed first-five-second window from the appropriate origin. Byte summaries count resources started and completed inside that window; long-task busy time clips overlap at its boundaries. Keep full variable-window arrays for readiness and post-interaction diagnostics, and source-page prefetch before activation as a separate diagnostic. The full window ends at the later of five seconds after observer start and two seconds after control confirmation, so its total work is not a matched-time budget.

Report first-load JavaScript/font bytes, CSS-initiated artwork and prefetch requests/bytes separately. Keep source-document cumulative resources out of destination-only transition totals. Resource completion is not proof of script execution or hydration. Transfer sizes may be zero for cached resources. Keep the waterfall as a diagnostic, not a critical-route bundle budget.

## Artifact privacy

Share reduced numeric observations, static route templates and sanitized traces only. Never attach raw traces, browser profiles, HARs, cookies, session files, request/response bodies, prompts, message text, query strings, user/quest/adventure IDs or raw DOM selectors. Validate `.json.gz` files directly after compression; validating only local raw JSON is insufficient.

Only `home.trace.json.gz` and `stream.trace.json.gz` may contain Screenshot events. All other traces reject the whole Screenshot event even when its arguments were stripped. Do not enable the screenshot trace category on disallowed routes: it overrides `screenshots: false`. Review every retained Home/adventure filmstrip manually before sharing, including pixels and incidental overlays. An allowlisted filename does not prove its image content is safe. Negative validator tests cover forbidden frames with and without image arguments. The ordinary repository stage validates all nine existing #773 compressed traces against this policy.

## Field attribution proposal

Collection remains off. No package observer, endpoint, hosted service or transport is installed for field measurement. The local schema is a reviewable design boundary for a possible `web-vitals/attribution` adapter. It accepts only metric (`LCP`, `INP`, `CLS`), finite nonnegative value, rating, release commit, coarse device class and an allowlisted route template. Unknown fields fail validation. Rich attribution must be reduced locally, never forwarded wholesale. Raw selectors, targets and resource URLs are excluded.

Before authorizing a rollout, the web maintainer and privacy reviewer must approve collection purpose, consent/opt-in interface, destination, permitted readers and deletion enforcement. Proposed rollout limits are opt-in sessions only, at most 10% of those sessions, raw reduced records retained for at most seven days, and access limited to maintainers investigating performance. These are proposed bounds, not an active collection policy. Sampling state and session identifiers must not appear in payloads; approval must establish how sampling works without exporting identity. No collection may begin until those decisions and a payload review are recorded.

Field goals remain p75 LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1. They require separately authorized real-user sampling. Local lab captures cannot establish them. Performance trends warn until variability supports a justified gate; there is no blanket Lighthouse-score gate.

## Focused diagnostics

For a focused confirmation without repeating unrelated routes, run:

```sh
npm run audit:performance -- --output /absolute/new-diagnostic-directory --browser /absolute/path/to/chrome --confirmation --diagnostic-state populated --diagnostic-profile desktop --diagnostic-journey long-adventure
```

All three diagnostic flags are required together. This captures ten samples for each cache mode of the selected journey, validates the written gzip observations and a representative trace, and cleans up the isolated fixture/server. The manifest retains `complete: false`, `scope: diagnostic` and a separate `diagnosticComplete` flag. Lighthouse and the full matrix are not run. A diagnostic can finish successfully without being acceptance evidence for the complete audit.

The capture kit's `captureMatrix` and `validateReadinessRows` APIs accept an explicit `{state, profile, name}` selection for isolated local diagnostics. All three values must be supported; inaccessible empty detail pages are rejected. A diagnostic must validate every selected sample and cache mode. Label its artifacts as diagnostic and never merge its rows into a different cohort. The public audit command and compressed-directory validator continue to require the complete matrix by default. Use at least ten selected samples to confirm a measurement correction; this is lab validation, not a field percentile.

Event Timing names follow an explicit list of [standard discrete events](https://w3c.github.io/event-timing/#sec-events-exposed). The capture retains names and numeric timing only, never targets, selectors or input contents. Continuous-event exclusions and the finite observation window remain limits of this diagnostic.

## State content

A present control does not prove the page shows its state. After each observation window, outside every measured interval, the runner checks one condition and keeps only its name in `contentCheck`, never the content:

- `fixture-link`: the fixture's own quest, adventure or construct is linked.
- `message-count`: the long adventure lists exactly its 200 messages; the empty adventure lists none.
- `no-owned-entities`: an empty account's page links no quest or adventure of its own.
- `built-in-activities-only`: Activities offers built-in cards and no own-activity editor link; neither synthetic account owns an activity.
- `edited-prompt`: the editor shows the edited construct's prompt. The probe replaces that text, so this one check runs before the probe.

The fixture reports its counts, and the manifest records them with the installed browser, puppeteer-core, Lighthouse and Lighthouse's own nested puppeteer-core versions.

## Trace limits

Retained traces keep event names, categories, phases and timing, but no event arguments except allowed screenshots. They show where time went, not which script, URL or node did the work, and DevTools cannot explore them as complete timelines.

## Script attribution limits

A lower five-second script total does not establish a smaller initial payload. Late unmarked background graph work can vary while early scripts grow. Summary version 2 names Resource Timing totals `completedWindowJavaScript`, `completedWindowFonts` and `destinationWindowResources`; these are completed-window diagnostics, not critical payload or exclusive destination ownership.

`networkResources` records completed CDP requests with a categorical path, method, resource type, finite timing/byte/status values, failure flag, known-prefetch flag and initiator category (`parser`, `script`, `preload`, `other`). Request IDs, raw URLs, headers and initiator stacks are never exported. Initiator categories come from each request, not a URL-only association. Timing is normalized to the document time origin; startup buckets include only requests begun and completed in the fixed five-second window.

Network script buckets separate early parser, preload, script dependency and unattributed work from late scripts. Early means request start at or before primary-content presence; it does not prove essential work. Late requests may still be required: timing and initiator categories are not a causal dependency graph. Known prefetch and failed requests stay separate. Client windows exclude prior source requests, but a late background request can still originate from the source graph. Historical artifacts without CDP attribution remain unavailable for these buckets, rather than being reported as zero. Do not pool Resource Timing transfer sizes with CDP encoded-byte counts.
