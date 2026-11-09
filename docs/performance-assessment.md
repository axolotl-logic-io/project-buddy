# Signed-in performance assessment

Issue [#773](https://github.com/axolotl-logic-io/project-buddy/issues/773) asks why page loads feel slow, arrive in pieces and jump. This assessment records a local production-build investigation and a prioritized design plan. It changes no product behavior or production instrumentation. The capture covers 78 accessible journey/state/profile/mode cells, one observation each. The baseline is exploratory lab evidence; it does not establish real-user performance or prove every reported symptom has one cause.

The [#796 renderer follow-up](performance/796/README.md) records a separate matched production-build experiment on the post-#806 lineage. Its cold editor gains, navigation tradeoff and unresolved adventure budgets are tied to the sources named there; they are not measurements of the current release head.

## Final integration reconciliation

The PR reconciles integration at `1810793539c72b9703ec9a63275bda6a0dabd79f`, after the other issue assignments merged. The evidence remains tied to the two measured revisions below. Later Batteries/orb, header-balance, breadcrumb, scrolling, editor and Library changes are included in the merge source but were not measured by this assessment. Do not treat either recorded baseline as a performance result for the final PR or current integration head. Source-level observations describe their recorded revision; implementation follow-ups must reproduce relevant findings on the then-current source before changing it.

## Evidence and conditions

The measured source is commit `242e3a1ac55de980c9eb3b6780f19db66816ed58`, including the responsive artwork change in #763. The production build ID is `_KA3WaPrXszi9invOlrvUL`. Measurements use Next 16.4.3, React 19.3.0 and Node 24.6.0 on Linux x86_64, AMD Ryzen 9 7950X (32 logical CPUs), 32 GB RAM. The host also serves other issue worktrees; resource contention remains a confounder. No production database, deployment or real model was used. The checkout later merged newer integration source, but every browser capture continued to use the unchanged running production build identified above.

The isolated worktree database is `pb_wt_441676447`, with site port 36447. The local Neon-compatible proxy and mock model differ from production database distance and provider latency. Two synthetic accounts represent no user-created data and populated data. The populated account owns one quest, an adventure containing 100 exchanges (200 messages), and one customized construct. Each answer repeats a short synthetic paragraph 20 times.

Built-in activities/constructs remain available to the otherwise empty account. An inaccessible detail page under the empty account is not counted as an empty successful page.

The desktop viewport is 1440 × 900 with 1× CPU and no added network delay. The phone viewport is 390 × 844, touch enabled, device scale factor 1, 4× CPU slowdown, 150 ms added latency, 200,000 bytes/s download and 93,750 bytes/s upload. This is phone emulation, not physical-device evidence. The fixed two-second post-content observation window can miss later shifts, font loads or ongoing work. Browser/tool versions and failed captures are recorded with the artifacts below.

Cold direct loads start in a fresh authenticated browser context; they do not reset the server process, database caches or image optimizer. Warm direct loads reuse that context. Client navigation starts from an already loaded source page and clicks a visible real link. Prefetch may already have occurred; it is part of that warm journey, not a cold transition. Browser cache, router cache and server cache are distinct.

Each cell has one run, sufficient to discover candidates but insufficient to estimate percentiles or regression thresholds. Run order is fixed, so time-of-run drift is possible.

Abbreviations: first contentful paint (FCP), largest contentful paint (LCP), cumulative layout shift (CLS), time to first byte (TTFB), total blocking time (TBT), and interaction to next paint (INP). CLS here means the initial-load session-window metric excluding recent input; the all-shift transition diagnostic below is separate.

## Journey milestones

Time origins differ: direct loads use document navigation start; client transitions use the initiating click. Keep both series separate. Do not reuse document FCP/LCP/TTFB from the source page as transition metrics.

| Journey | Primary useful content | Controls and stable usability | Navigation source |
| --- | --- | --- | --- |
| Home | Atlas destinations plus continue/start quest | Destination links respond and atlas/header geometry settles | Quests |
| Quests | Own/shared quest list or explicit empty state | New quest control opens; list actions usable | Home |
| Quest | Quest identity and adventure list | Open adventure and permitted quest controls usable | Quests |
| Adventures | Adventure list or explicit empty state | Filter and New adventure respond | Home |
| Long adventure | Saved message history at intended reading position | Composer accepts input; scroll ownership stable | Quest |
| Activities | Built-in and own activity choices | Start/customize controls respond | Home |
| Workshop | Selected kind's definitions | Tabs and definition links respond | Home |
| Definition editor | Own definition form and Workshop pane | Draft input accepts edits; save/test controls ready | Workshop |

The automated `contentMs` is a **content-presence proxy**, not full control readiness or a stable-page metric. It waits for loading skeletons to disappear and main content to exist; Home additionally requires its quest link, and adventure/editor require a textarea. It can precede hydration or secondary content. Control interaction and stable geometry require the dedicated workflow in the plan below. The two-second window is observation, not a claim that a page stabilizes at two seconds.

## Measured findings

**Verified Home shell movement:** both empty and populated desktop cold loads record an unexpected layout-shift entry of 0.2333. On the populated load at 318 ms, the main region moves from y=64 to y=88; the header changes from (0,0,1440,108) to (16,16,1408,74). The source rectangles identify layout movement, not automatic scroll. In `src/app/page-roles.css`, `.site-header:has(~ main .atlas:not([data-inactive]))` introduced margins/padding and hid shortcuts when the atlas replaced the short Home loading state. This source/trace correlation explains a concrete shared-shell jump on Home; a controlled CSS counterfactual is still needed to quantify each rule's contribution.

This baseline predates #767: PR #788 subsequently removed all atlas-dependent header rules (integration merge `b3fa60583f78fa6ff8002492de1d55f42fdadc61`). Its focused geometry tests passed, but no post-fix cold-load CLS measurement is included here. Do not claim a measured improvement or duplicate that implementation in #795. Remaining Home loading/atlas and inner-column geometry still require measurement.

**Verified editor width movement:** the populated desktop own-definition cold load records a 0.1008 unexpected shift at 491 ms. Its column DIV changes from x=336, width=768 to x=134, width=1172, while y remains 64. The shared `.page-column:has(.workshop)` rule expands the column when Workshop content appears; the generic loading panel does not reserve that width. This is a second concrete loading-boundary/ancestor-geometry mismatch, independent of the Home header fix. #795 should preserve the editor frame width through loading and error states.

**Verified deferred request work:** Home's capture includes many destination fetches after the primary content appears. These match visible Next links and partial prefetching; the preferences Server Action adds another request candidate. Request counts alone cannot distinguish redundant work from useful prefetch. The Home image `/atlas/parchment.webp` transfers approximately 784 kB in the populated desktop cold observation. That is a useful resource-size lead, but it is not the identified LCP element or proof that the image blocks primary content. Separate critical bytes from prefetch and decorative bytes before changing priorities.

**Client-transition movement:** all captured client-navigation shifts have `hadRecentInput: true`; the official CLS exclusion would hide every measured jump. The [per-cell transition table](performance/773/baseline.md#client-transition-movement-and-work) sums all entries and lists source tags and main-thread work. Desktop Quests → Home records 0.5514 (MAIN + HEADER), Home → Quests/other shared navigation 0.2333, and Workshop → editor 0.1008 (DIV). Nonzero phone totals are 0.0243–0.0704. These are route-jump diagnostics, not summed official CLS; activated-link geometry was not retained, while affected source rectangles were.

**Phone delivery and CPU observations:** cold content proxies cluster at 720–741 ms, but scripts initiated before that proxy finish at 2,223–2,669 ms. The last WOFF2 resource finishes at 1,338–1,410 ms. Small shifts on several routes occur at 1,344–1,361 ms, near font arrivals. This timing is correlation, not proof of font causation or evidence that controls hydrate at 2.5 s.

The populated phone long-adventure transition is the slowest phone cell: 1,504 ms content proxy, 1,278 ms total long-task duration, maximum 234 ms. The editor transition takes 917 ms (104 ms long-task duration). These are stronger client-work leads than the local response-header interval, but no production server spans exist to rank client delivery against production database cost. #796 owns initial-load JavaScript/font bytes, renderer CPU, and the CSS-initiated 784,106-byte `/atlas/parchment.webp`; #797 owns separating critical bytes from destination-prefetch volume and maintaining the waterfall experiment. Resource initiator `css` identifies the artwork request, not a 784 kB CSS stylesheet.

**Server attribution limit:** local response timings cannot establish production auth/database latency. Shared session validation is on the architecture's request path, but there is no query-duration decomposition yet. Server bottleneck rankings remain hypotheses for #794.

The largest verified shared design problem is geometry controlled by asynchronously arriving descendants: the Home shell and editor column both change their ancestor frame. The largest single captured shift is the desktop Quests → Home transition (0.5514), not the cold Home shift (0.2333). The original sample did not establish the largest shared latency bottleneck. The additional controlled-lab measurements below identify a repeated content-to-control gap associated with client startup; production ranking still requires field/server evidence. Reported general slowness and awkward staged content still need repeated causal experiments, rather than being attributed wholesale to authentication or React.

## Verified architecture and hypotheses

Source paths in this section are relative to `apps/web/`. The following are verified from the measured source; runtime contribution must be determined from the baseline and targeted spans before implementation:

- `src/app/layout.tsx` opts out of a static shell (`instant = false`). The header's `SignedInLinks` calls `currentUser` before it can arrive whole. This deliberately avoids a signed-out menu flashing before signed-in links. The tradeoff is an authenticated request on the shared shell path. `src/auth/current-user.ts` already uses React request-local `cache`; repeated callers do **not** establish duplicate session database reads. Preserve session epoch revocation and access semantics.
- Home awaits `readToday` but renders only the first quest and whether quests/adventures are empty. `src/today/today-store.ts` performs two parallel activity queries, then reads Journals for up to three quests. This is a concrete mismatch between fetched and displayed data, not proof that those queries dominate load time. Prefer a purpose-specific summary over caching the entire private Today result globally.
- Quest and Adventures pages already parallelize groups of independent reads after authentication/access validation. Do not replace every `await` with parallel work: access validation is a security dependency. The own construct editor awaits Workshop options, then its definition, then sale state; metadata also reads the definition. Query timing and request-local deduplication experiments should decide whether these are material.
- `RefreshPreferences` remounts by pathname and invokes a Server Action after mount, as well as on tab visibility. This adds a post-hydration freshness request to workspace navigation. Its overlap with the page request is a candidate for awkward sequencing, not evidence that the request moves layout. Removing it would trade off cross-device preference freshness.
- Most routes use `LoadingSkeleton`; its generic cards/panel/messages shapes do not encode the final page's geometry. Home instead displays a heading and a short status paragraph before the atlas. After #767, the header portion has changed, while the short Home placeholder and `.page-column:has(> .atlas:not([data-inactive]))` inner-column rules still make content geometry mismatch plausible. Measure source rectangles and filmstrips before assigning CLS to these boundaries.
- Fonts are local WOFF2 with `display: swap`; Next font preloads are disabled and the proxy supplies theme-specific hints. Existing build-font guards check delivery. Artwork already uses Next Image, explicit intrinsic dimensions and a shared loader after #763. Another blanket preload or image compression change is not justified by inspection alone.
- The adventure renders saved messages into a client runtime. Long-history hydration, Markdown/code rendering and streaming updates are candidates for main-thread cost. The custom scroll controller is separate from layout geometry; #771 owns follow-versus-read behavior. A document scrollY change is not a layout-shift entry and a zero CLS value does not prove there was no visible jump.

There is no application `web-vitals` reporter, React Profiler wrapper or `Server-Timing` instrumentation in `src/` at this commit. Existing centralized error logging, reply accounting, font guards and browser behavior tests serve other purposes. Installed transitive telemetry packages are not proof that application real-user measurements exist. No new hosted service is required for the first experiments.

**Authenticated Lighthouse diagnostics:** retained navigation audits successfully measured `/home` and `/chats/:id`, with no run warnings. Home reports simulated-mobile FCP 625 ms, LCP 911 ms, CLS 0.0249 and TBT 0 ms; the long adventure reports FCP 760 ms, LCP 1,652 ms, CLS 0 and TBT 448 ms. Authentication and asset cache were retained (`disableStorageReset`), and each target was opened before the audit, so these are warm-asset diagnostics. They cannot be pooled with cold CDP measurements or used to declare the Home header shift absent. The long-adventure blocking-time result justifies prioritizing renderer profiling, but does not identify React as the cause or measure field INP.

The authenticated Home-to-Quests user-flow timespan also completed without warnings; its settings use applied DevTools throttling rather than navigation-mode simulation. The flow report retains only the metrics supported by that mode. Its CLS is exactly 0.02490886998784933, identical to the Home navigation audit. The recipe opens Home before starting the timespan and clicks through within the same document; the reduced report cannot establish whether lifetime/source-page entries contribute. Treat this value as uncertain in scope, not an independent measure of transition movement.

Use the cleared observer arrays for the transition diagnostic.

**Lab interaction and streaming:** a separate phone probe observes Home shell/primary presence at 717/740 ms and long-adventure shell/composer presence at 717/788 ms. A later trusted menu probe responds in 48 ms on Home and 63 ms in the adventure. These probes start after network idle and are not earliest control-readiness measurements. Typing a synthetic message in the long adventure produces an Event Timing keyboard entry of 344 ms; the mock reply text appears 995 ms after Enter.

The timeline also records an unexplained reset from scrollY 76,486 to 0 at 7,114 ms, just after the menu click near 7,083 ms; it returns to 76,562 at 7,832 ms after the reply. Later movement may include following activity, but the entire timeline cannot be called normal following. The `html:has(.site-menu[open])` overflow rule is only an unverified candidate; #796 must coordinate this anomaly with #771. This probe does not test reading earlier history.

These observations justify #796 profiling and #771 coordination without assigning all cost to hydration or treating expected follow-scroll as CLS. The geometry observer's viewport-relative rectangles also move on scroll, so its last-change timestamp is not a standalone layout-stability metric.

## Additional measurements after review

The [additional capture record](performance/773/current/README.md) uses production build `eDoFyCX3Cc1n4DFG0OaCq` at source `9a8ab46089fdbe8086efd2988a8cbc2e058b0e6c`, which contains #767. It adds first-confirmed trusted control responses, observed stabilization, repeated populated cells and dedicated empty quest/adventure fixtures. These are new measurements, rather than a claim that the earlier content proxy measured usability. The [per-cell table](performance/773/current/readiness.md) reports medians and ranges; empty cells remain single observations.

Control readiness is a sampled upper bound: each journey verifies a meaningful state change, with 100 ms sampling pauses and browser-automation overhead. Document commit starts direct probes; navigation start is their time origin. Transition probes use route-link activation. Geometry records use document coordinates for content, keep scroll movement separate, and combine shift attribution with the last observed geometric change. Stabilization requires a final 500 ms quiet interval within a window of at least five seconds; it is not a promise of permanent stability. Capture corrections and normalized duplicate-observer entries are documented rather than hidden.

**Repeated phone readiness:** on Home, three cold samples show primary presence at a median 737 ms but menu response confirmation at 2,878 ms (2,869–2,909 ms). Warm confirmation is 691 ms and client navigation 442 ms. For the 200-message adventure, cold primary presence is 790 ms while composer confirmation is 5,826 ms; warm and client confirmations are 1,673 and 1,543 ms. Cold long-task duration totals 1,704 ms versus Home's 149 ms. These results identify shared startup and extra adventure rendering/input work as high-impact client leads. The input probe types 42 characters before checking state, so the difference is not a pure hydration-delay measurement. The empty-history phone adventure single sample still confirms at 5,141 ms (872 ms warm), with 607 ms of cold long tasks. Much of the cold adventure cost therefore exists without 200 messages; additional history work is a separate profiling candidate. Matched input probes use the same action, though the empty-detail sample has no repeated-run confidence.

**Post-#767 geometry:** repeated desktop Home captures keep the shared header at x=0, y=0, width=1440 and height=64. A separate DIV still expands from x=336, width=768 to x=0, width=1440 and records a 0.2167 shift. Its sources match the remaining atlas-dependent inner-column rule. This confirms #767 fixed a different region; #795 still owns the loading/content frame. The new protocol includes interactions and a longer observation window, so its aggregate metrics are not a controlled before/after latency score against the original build.

The [database-distance sensitivity experiment](performance/773/current/server-paths.md) isolates document requests from browser prefetch and client effects. Across three samples per route and condition, adding 50 ms per local database HTTP call leaves response-header time near 2 ms, while complete-document medians rise: Home 29→178 ms, quest 29→183 ms, editor 33→241 ms and long adventure 113→267 ms. The route cohorts make 4–9 database HTTP calls; their overlap means call count and summed spans do not equal serial latency. This is causal evidence for dependency-distance sensitivity of streamed document completion, not an estimate of production database distance.

The [stream-transport experiment](performance/773/current/server-streams.md) further separates response headers, first body chunk, shell/main markup availability and complete body. With added dependency delay, shell markup moves from about 13–16 ms to 64–66 ms; editor textarea markup moves from 31 to 236 ms while response headers remain about 2 ms. These transport markers do not establish paint or hydration. Detailed static-name transport spans support server attribution without logging SQL, parameters, prompts or credentials. Mapping those calls to individual auth/domain operations remains a scoped #794 implementation experiment, rather than a fabricated diagnosis.

## Design priorities and alternatives

1. **Measure shared server work and remove unused reads.** Add opt-in static-name duration/query-count spans around session, summary and editor operations. Prefer a narrow owner-scoped Home summary and request-local reuse of definition reads when measured. Longer-lived private caching may reduce latency further, but requires explicit user/membership keys and invalidation after edits, retirement, membership loss and session revocation. Never trade isolation for a faster hit rate.
2. **Use stable progressive page frames.** Extend existing segment loading patterns rather than importing Suspense or delaying all content. A quest frame reserves its identity/actions row, primary adventure region and secondary slots; an editor frame reserves its form and Workshop test pane; Home reserves atlas geometry. Loading, empty, error and populated states share the same semantic regions and responsive tokens. Primary controls may become usable before slow secondary information. Preserve native navigation where it already works, and communicate the readiness of JavaScript-only controls so early input is not silently lost. Avoid giant fixed-height placeholders or a spinner that hides completed content.
3. **Reduce client cost where traces identify it.** Compare lazy secondary editor tools, renderer update isolation and bounded long-history rendering. Windowing may help large adventures but complicates search, accessibility, scroll anchoring and earlier-message access; coordinate #771 before choosing it. Keep draft persistence and composer behavior. Add font/media priority changes only for demonstrated waterfall delays or shift sources.
4. **Make audits repeatable before making them gates.** Maintain an opt-in authenticated production-build capture workflow with synthetic fixtures, then evaluate privacy-safe field attribution. Keep deterministic UI behavior in browser component integrations, database/access checks in server tests, and Playwright e2e restricted to auth workflows. Performance investigation is not a new non-auth e2e correctness suite.

## Provisional budgets and comparisons

[Web Vitals guidance](https://web.dev/articles/vitals) defines good field experience as LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 at the 75th percentile, separated by mobile/desktop. Those are field targets, not claims from this one-run lab sample. Lighthouse total blocking time is diagnostic and cannot stand in for field INP.

Candidate lab budgets are experiment targets, not CI gates or measured passes:

| Measure | Candidate target and baseline limit | Owner |
| --- | --- | --- |
| Initial-load session-window CLS | ≤0.1 per controlled cell; old desktop Home 0.2333 and editor 0.1008 fail | #795 |
| All-shift transition sum | ≤0.05 including recent input, from route-link activation through content +2 s; attribute activated element separately from shared-frame movement | #795 |
| Phone useful-content proxy | ≥20% lower median on affected journeys; prioritize 1,504 ms long-adventure transition and 917 ms editor transition; no inference of control readiness | #796 |
| Phone lab keyboard responsiveness | ≥20% lower repeated-run worst keyboard-event duration relative to the exploratory 344 ms event (candidate ≤275 ms); not field INP | #796 |
| Long-adventure Lighthouse TBT | ≥20% lower median under the same warm/simulated profile, candidate ≤358 ms relative to 448 ms | #796 |
| Essential controls ready | Cold-phone single-click median ≤2,300 ms (about 20% below measured Home 2,878 ms); warm/client single-click ≤1,000 ms. For matched 42-character input probes, reduce cold confirmation ≥20% (long adventure candidate ≤4,661 ms from 5,826; editor ≤3,424 ms from 4,280), with warm/client input ≤1,500 ms. These are sampled completion bounds, not exact hydration timestamps | #796/#797 |
| Server dependency response | Under the same recorded dependency latency, target ≥20% lower median dependency-bound route completion or domain-operation critical span, and ≥10% lower dependent shell/primary-markup availability. Report early response headers separately; they can flush before dependency work | #794 |
| First-load bytes | No increase under matched cache/window conditions; classify initial JS, fonts, CSS-initiated artwork and destination prefetch separately before choosing reductions | #796/#797 |

The local 2–5 ms `nav.ttfb` is requestStart-to-responseStart, not end-to-end navigation response and not a server-span decomposition. Its archive lacks navigation-start response timing. A 20% useful-content goal cannot be attributed to those local response values. The additional synthetic-distance experiment establishes local sensitivity; actual production distance and operation-level timing remain unknown. #794 must use a recorded, matched latency condition for implementation comparisons, with dependent-content timing rather than early headers as its target. No automatic scroll displacement while reading earlier history remains a separate #771 goal.

Compare the same fixtures, release/build, browser, viewport, theme, throttle, source route, cache policy and observation window. Use at least three independent runs per cell and report median and min–max; three samples do not establish p75 or p90. Alternate before/after run order, record host load and reject measurement failures explicitly. For an implementation decision use a larger confirmation sample (at least ten per affected cell), inspect outliers rather than rerunning until green, and document uncertainty.

Include shell arrival, primary-content presence, control-ready interaction, source geometry, request-to-response headers, separately instrumented end-to-end TTFB, FCP/LCP, shifts, blocking work, bytes and request dependencies. A Lighthouse score alone is never the acceptance target.

## Practices and ownership

The feature author supplies before/after evidence for changes to shared header/loading, data access, navigation or heavy renderers. The web maintainer owns the fixture/capture recipe, browser/tool pins and periodic review of budgets. These are proposed responsibilities, not a new claim about an existing on-call team.

Reviewers ask which region becomes useful first, whether placeholders reserve the final geometry, whether controls work before hydration completes, what invalidates cached private data, and whether scroll movement was separated from CLS. A shared pattern example is a quest identity/actions region retained through loading, an adventure-list placeholder replaced in place, and secondary members/Quick Notes that fill reserved slots independently. Use the same roles and theme tokens across states and retain accessible status/error announcements.

Add proportionate behavior regressions for discovered defects using existing kits. Run expensive production-build audits opt-in and serialize them on a shared host. Start performance checks as recorded trend warnings; do not add unstable wall-clock gates to the fast default or weaken its current checks. This extends existing stages because authenticated performance needs a built application and controlled browser, while repository/Vite guards cannot measure it.

For field measurement, evaluate `web-vitals/attribution` only after defining collection ownership, access, sampling and retention. Allowlist metric/value/rating, release, coarse device class and route template. Do not send user IDs, raw route IDs/query strings, session credentials, prompt/message/Journal text, raw selectors or resource URLs. Derive safe region names locally instead of exporting arbitrary attribution targets.

Add payload tests before collection. Server spans should contain static operation names and durations, not query parameters or SQL payloads. Use a separate profiling-enabled production build for React; its overhead is not comparable with the normal baseline.

## Tool references

- [Lighthouse authenticated pages](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md): retain authentication while controlling storage resets; verify the intended page.
- [Lighthouse user flows](https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md): navigation and timespan audits support different metrics. Snapshot mode cannot measure a loading timeline.
- [DevTools Performance reference](https://developer.chrome.com/docs/devtools/performance/reference): correlate main-thread work, frames and layout-shift attribution with the waterfall.
- [web-vitals attribution](https://github.com/GoogleChrome/web-vitals): evaluate real-user metrics; never infer population INP from a lab score.
- [React Profiler](https://react.dev/reference/react/Profiler): production profiling needs a special build and adds overhead.

## Implementation follow-ups

Priorities are provisional until repeated measurements attribute the largest shared cost. Each ticket includes scope, access/privacy constraints, acceptance criteria and a before/after measurement plan.

| Priority | Ticket | Impact / effort | Dependency |
| --- | --- | --- | --- |
| P1 | [#794: shared server critical paths](https://github.com/axolotl-logic-io/project-buddy/issues/794) | Shared request latency and unused Home data / medium | Baseline spans; preserve access checks |
| P1 | [#795: stable shared loading geometry](https://github.com/axolotl-logic-io/project-buddy/issues/795) | Staged rendering across journeys / medium | Baseline shift attribution; #767/#765/#775 header coordination; #771 scroll ownership |
| P1 audit, P2 field rollout | [#797: authenticated audits and safe field attribution](https://github.com/axolotl-logic-io/project-buddy/issues/797) | Confidence and regression prevention across pages / medium | Repeated baseline; privacy/retention design before collection |
| P1 startup, P2 renderer | [#796: long-adventure and Workshop client work](https://github.com/axolotl-logic-io/project-buddy/issues/796) | Large histories and phone responsiveness / medium to large | Main-thread evidence; #771; retain #763 media gains |

These tickets do not implement the recommendations as part of this assessment. Batteries (#782) and Marketplace orbs (#779) remain independent product changes; no accounting or compatibility field is renamed here.

## Baseline artifacts and validation limits

- [The page-frame follow-up](performance/795/README.md) records #795 implementation and a completed 320-observation matched post-Workshop production-build cohort, with finite-window results, retained history and privacy validation. Its newer source/build numbers remain separate from this assessment; its accepted final review and pending protected merge are tracked there.

- [Additional readiness, stabilization and repeated-run evidence](performance/773/current/readiness.md) covers a build containing #767.
- [Phone startup sequence](performance/773/current/startup.md) separates content, resource completion and control confirmation.
- [Synthetic database-distance experiment](performance/773/current/server-paths.md) and [transport milestones](performance/773/current/server-streams.md) separate early headers from dependent content.

- [Per-journey table](performance/773/baseline.md) separates cold direct, warm direct and client-transition observations for each accessible journey/state/profile.
- [Capture record and reproducible commands](performance/773/README.md) names fixtures, browser/tool pins, cache state, failures, sanitization and cleanup. Archived recipes are corrected reproducers; their privacy and tooling differences from the original capture are documented.
- The capture directory contains the reduced numeric baseline, Lighthouse navigation/timespan reports and sanitized DevTools event timelines. Use the capture record to distinguish successful artifacts from failed attempts.

The additional fixed-plan matrix retains all 186 observations and the two server experiments retain 96 document requests. All 186 windows end with at least 500 ms without observed geometry/shift changes. This establishes finite-window stabilization alongside confirmed controls; it does not establish permanent stability or exact first-keystroke readiness.

The original baseline does not establish real-user INP, real phones, production server/query spans, React profiling, every editor variant or population confidence intervals. Its `contentMs` still does not prove control readiness. The additional local measurements supply post-#767 geometry, repeated sampled control responses, finite-window stabilization and explicit synthetic database-distance sensitivity. Production latency and physical-device/field performance remain unmeasured and are not required to make this local assessment reviewable. Follow-ups own implementation experiments, a maintained audit workflow and any authorized field rollout. Proposed budgets are design criteria, not claims that the product currently passes them.
