# Signed-in performance assessment

Issue [#773](https://github.com/axolotl-logic-io/project-buddy/issues/773) asks why page loads feel slow, arrive in pieces and jump. This assessment records a local production-build investigation and a prioritized design plan. It changes no product behavior or production instrumentation. The capture covers 78 accessible journey/state/profile/mode cells, one observation each. The baseline is exploratory lab evidence; it does not establish real-user performance or prove every reported symptom has one cause.

## Evidence and conditions

The measured source is commit `242e3a1ac55de980c9eb3b6780f19db66816ed58`, including the responsive artwork change in #763. The production build ID is `_KA3WaPrXszi9invOlrvUL`. Measurements use Next 16.4.3, React 19.3.0 and Node 24.6.0 on Linux x86_64, AMD Ryzen 9 7950X (32 logical CPUs), 32 GB RAM. The host also serves other issue worktrees; resource contention remains a confounder. No production database, deployment or real model was used. The checkout later merged newer integration source, but every browser capture continued to use the unchanged running production build identified above.

The isolated worktree database is `pb_wt_441676447`, with site port 36447. The local Neon-compatible proxy and mock model differ from production database distance and provider latency. Two synthetic accounts represent no user-created data and populated data. The populated account owns one quest, an adventure containing 100 exchanges (200 messages), and one customized construct. Each answer repeats a short synthetic paragraph 20 times. Built-in activities/constructs remain available to the otherwise empty account. An inaccessible detail page under the empty account is not counted as an empty successful page.

The desktop viewport is 1440 × 900 with 1× CPU and no added network delay. The phone viewport is 390 × 844, touch enabled, device scale factor 1, 4× CPU slowdown, 150 ms added latency, 200,000 bytes/s download and 93,750 bytes/s upload. This is phone emulation, not physical-device evidence. The fixed two-second post-content observation window can miss later shifts, font loads or ongoing work. Browser/tool versions and failed captures are recorded with the artifacts below.

Cold direct loads start in a fresh authenticated browser context; they do not reset the server process, database caches or image optimizer. Warm direct loads reuse that context. Client navigation starts from an already loaded source page and clicks a visible real link. Prefetch may already have occurred; it is part of that warm journey, not a cold transition. Browser cache, router cache and server cache are distinct. Each cell has one run, sufficient to discover candidates but insufficient to estimate percentiles or regression thresholds. Run order is fixed, so time-of-run drift is possible.

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

**Verified Home shell movement:** both empty and populated desktop cold loads record an unexpected layout-shift entry of 0.2333. On the populated load at 318 ms, the main region moves from y=64 to y=88; the header changes from (0,0,1440,108) to (16,16,1408,74). The source rectangles identify layout movement, not automatic scroll. In `src/app/page-roles.css`, `.site-header:has(~ main .atlas:not([data-inactive]))` introduces margins/padding and hides shortcuts when the atlas replaces the short Home loading state. This source/trace correlation explains a concrete shared-shell jump on Home; a controlled CSS counterfactual is still needed to quantify each rule's contribution. This baseline predates #767: PR #788 subsequently removed those atlas-dependent header rules (integration merge `b3fa60583f78fa6ff8002492de1d55f42fdadc61`). Its focused geometry tests passed, but no post-fix cold-load CLS measurement is included here. Do not claim a measured improvement or duplicate that implementation in #795. Remaining Home loading/atlas and inner-column geometry still require measurement.

**Verified editor width movement:** the populated desktop own-definition cold load records a 0.1008 unexpected shift at 491 ms. Its column DIV changes from x=336, width=768 to x=134, width=1172, while y remains 64. The shared `.page-column:has(.workshop)` rule expands the column when Workshop content appears; the generic loading panel does not reserve that width. This is a second concrete loading-boundary/ancestor-geometry mismatch, independent of the Home header fix. #795 should preserve the editor frame width through loading and error states.

**Verified deferred request work:** Home's capture includes many destination fetches after the primary content appears. These match visible Next links and partial prefetching; the preferences Server Action adds another request candidate. Request counts alone cannot distinguish redundant work from useful prefetch. The Home image `/atlas/parchment.webp` transfers approximately 784 kB in the populated desktop cold observation. That is a useful resource-size lead, but it is not the identified LCP element or proof that the image blocks primary content. Separate critical bytes from prefetch and decorative bytes before changing priorities.

**Server attribution limit:** local response timings cannot establish production auth/database latency. Shared session validation is on the architecture's request path, but there is no query-duration decomposition yet. Server bottleneck rankings remain hypotheses for #794. The largest verified shared design problem is geometry controlled by asynchronously arriving descendants: the Home shell and editor column both change their ancestor frame. Home's shell is the largest single shift in the captured desktop sample. The largest shared latency bottleneck is not established. Reported general slowness and awkward staged content still need repeated causal experiments, rather than being attributed wholesale to authentication or React.

## Verified architecture and hypotheses

Source paths in this section are relative to `apps/web/`. The following are verified from the measured source; runtime contribution must be determined from the baseline and targeted spans before implementation:

- `src/app/layout.tsx` opts out of a static shell (`instant = false`). The header's `SignedInLinks` calls `currentUser` before it can arrive whole. This deliberately avoids a signed-out menu flashing before signed-in links. The tradeoff is an authenticated request on the shared shell path. `src/auth/current-user.ts` already uses React request-local `cache`; repeated callers do **not** establish duplicate session database reads. Preserve session epoch revocation and access semantics.
- Home awaits `readToday` but renders only the first project and whether projects/chats are empty. `src/today/today-store.ts` performs two parallel activity queries, then reads Journals for up to three projects. This is a concrete mismatch between fetched and displayed data, not proof that those queries dominate load time. Prefer a purpose-specific summary over caching the entire private Today result globally.
- Quest and Adventures pages already parallelize groups of independent reads after authentication/access validation. Do not replace every `await` with parallel work: access validation is a security dependency. The own construct editor awaits Workshop options, then its definition, then sale state; metadata also reads the definition. Query timing and request-local deduplication experiments should decide whether these are material.
- `RefreshPreferences` remounts by pathname and invokes a Server Action after mount, as well as on tab visibility. This adds a post-hydration freshness request to workspace navigation. Its overlap with the page request is a candidate for awkward sequencing, not evidence that the request moves layout. Removing it would trade off cross-device preference freshness.
- Most routes use `LoadingSkeleton`; its generic cards/panel/messages shapes do not encode the final page's geometry. Home instead displays a heading and a short status paragraph before the atlas. After #767, the header portion has changed, while the short Home placeholder and `.page-column:has(> .atlas:not([data-inactive]))` inner-column rules still make content geometry mismatch plausible. Measure source rectangles and filmstrips before assigning CLS to these boundaries.
- Fonts are local WOFF2 with `display: swap`; Next font preloads are disabled and the proxy supplies theme-specific hints. Existing build-font guards check delivery. Artwork already uses Next Image, explicit intrinsic dimensions and a shared loader after #763. Another blanket preload or image compression change is not justified by inspection alone.
- The adventure renders saved messages into a client runtime. Long-history hydration, Markdown/code rendering and streaming updates are candidates for main-thread cost. The custom scroll controller is separate from layout geometry; #771 owns follow-versus-read behavior. A document scrollY change is not a layout-shift entry and a zero CLS value does not prove there was no visible jump.

There is no application `web-vitals` reporter, React Profiler wrapper or `Server-Timing` instrumentation in `src/` at this commit. Existing centralized error logging, reply accounting, font guards and browser behavior tests serve other purposes. Installed transitive telemetry packages are not proof that application real-user measurements exist. No new hosted service is required for the first experiments.

**Authenticated Lighthouse diagnostics:** retained navigation audits successfully measured `/home` and `/chats/:id`, with no run warnings. Home reports simulated-mobile FCP 625 ms, LCP 911 ms, CLS 0.0249 and TBT 0 ms; the long adventure reports FCP 760 ms, LCP 1,652 ms, CLS 0 and TBT 448 ms. Authentication and asset cache were retained (`disableStorageReset`), and each target was opened before the audit, so these are warm-asset diagnostics. They cannot be pooled with cold CDP measurements or used to declare the Home header shift absent. The long-adventure blocking-time result justifies prioritizing renderer profiling, but does not identify React as the cause or measure field INP. The authenticated Home-to-Quests user-flow timespan also completed without warnings; its settings use applied DevTools throttling rather than navigation-mode simulation. The flow report retains only the metrics supported by that mode. Navigation score optimization is not the plan.

**Lab interaction and streaming:** a separate phone probe observes Home shell/primary presence at 717/740 ms and long-adventure shell/composer presence at 717/788 ms. A later trusted menu probe responds in 48 ms on Home and 63 ms in the adventure. These probes start after network idle and are not earliest control-readiness measurements. Typing a synthetic message in the long adventure produces an Event Timing keyboard entry of 344 ms; the mock reply text appears 995 ms after Enter. The stream filmstrip and scroll timeline show following activity, not a test of reading earlier history. These observations justify #796 profiling and #771 coordination without assigning all cost to hydration or treating expected follow-scroll as CLS. The geometry observer's viewport-relative rectangles also move on scroll, so its last-change timestamp is not a standalone layout-stability metric.

## Design priorities and alternatives

1. **Measure shared server work and remove unused reads.** Add opt-in static-name duration/query-count spans around session, summary and editor operations. Prefer a narrow owner-scoped Home summary and request-local reuse of definition reads when measured. Longer-lived private caching may reduce latency further, but requires explicit user/membership keys and invalidation after edits, retirement, membership loss and session revocation. Never trade isolation for a faster hit rate.
2. **Use stable progressive page frames.** Extend existing segment loading patterns rather than importing Suspense or delaying all content. A quest frame reserves its identity/actions row, primary adventure region and secondary slots; an editor frame reserves its form and Workshop test pane; Home reserves atlas geometry. Loading, empty, error and populated states share the same semantic regions and responsive tokens. Primary controls may become usable before slow secondary information. Avoid giant fixed-height placeholders or a spinner that hides completed content.
3. **Reduce client cost where traces identify it.** Compare lazy secondary editor tools, renderer update isolation and bounded long-history rendering. Windowing may help large adventures but complicates search, accessibility, scroll anchoring and earlier-message access; coordinate #771 before choosing it. Keep draft persistence and composer behavior. Add font/media priority changes only for demonstrated waterfall delays or shift sources.
4. **Make audits repeatable before making them gates.** Maintain an opt-in authenticated production-build capture workflow with synthetic fixtures, then evaluate privacy-safe field attribution. Keep deterministic UI behavior in browser component integrations, database/access checks in server tests, and Playwright e2e restricted to auth workflows. Performance investigation is not a new non-auth e2e correctness suite.

## Provisional budgets and comparisons

[Web Vitals guidance](https://web.dev/articles/vitals) defines good field experience as LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 at the 75th percentile, separated by mobile/desktop. Those are field targets, not claims from this one-run lab sample. Lighthouse total blocking time is diagnostic and cannot stand in for field INP.

For the initial improvement experiment, use a candidate relative goal of at least 20% lower median useful-content time on affected phone journeys, no increase in control-ready time and no increase in total transferred first-load bytes. Define the absolute content/control budget after collecting repeated baseline observations. For controlled transitions, propose unexpected layout shift ≤0.05 during the recorded window and no automatic scroll displacement while reading earlier adventure content. Treat these as design proposals, not current CI requirements. Initial-load CLS and post-interaction shift attribution remain separate.

Compare the same fixtures, release/build, browser, viewport, theme, throttle, source route, cache policy and observation window. Use at least three independent runs per cell and report median and min–max; three samples do not establish p75 or p90. Alternate before/after run order, record host load and reject measurement failures explicitly. For an implementation decision use a larger confirmation sample (at least ten per affected cell), inspect outliers rather than rerunning until green, and document uncertainty. Include shell arrival, primary-content presence, control-ready interaction, last unexpected geometry change, TTFB, FCP/LCP, shifts, blocking work, bytes and request dependencies. A Lighthouse score alone is never the acceptance target.

## Practices and ownership

The feature author supplies before/after evidence for changes to shared header/loading, data access, navigation or heavy renderers. The web maintainer owns the fixture/capture recipe, browser/tool pins and periodic review of budgets. These are proposed responsibilities, not a new claim about an existing on-call team.

Reviewers ask which region becomes useful first, whether placeholders reserve the final geometry, whether controls work before hydration completes, what invalidates cached private data, and whether scroll movement was separated from CLS. A shared pattern example is a quest identity/actions region retained through loading, an adventure-list placeholder replaced in place, and secondary members/Quick Notes that fill reserved slots independently. Use the same roles and theme tokens across states and retain accessible status/error announcements.

Add proportionate behavior regressions for discovered defects using existing kits. Run expensive production-build audits opt-in and serialize them on a shared host. Start performance checks as recorded trend warnings; do not add unstable wall-clock gates to the fast default or weaken its current checks. This extends existing stages because authenticated performance needs a built application and controlled browser, while repository/Vite guards cannot measure it.

For field measurement, evaluate `web-vitals/attribution` only after defining collection ownership, access, sampling and retention. Allowlist metric/value/rating, release, coarse device class and route template. Do not send user IDs, raw route IDs/query strings, session credentials, prompt/message/Journal text, raw selectors or resource URLs. Derive safe region names locally instead of exporting arbitrary attribution targets. Add payload tests before collection. Server spans should contain static operation names and durations, not query parameters or SQL payloads. Use a separate profiling-enabled production build for React; its overhead is not comparable with the normal baseline.

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
| P2 | [#796: long-adventure and Workshop client work](https://github.com/axolotl-logic-io/project-buddy/issues/796) | Large histories and phone responsiveness / medium to large | Main-thread evidence; #771; retain #763 media gains |

These tickets do not implement the recommendations as part of this assessment. Batteries (#782) and Marketplace orbs (#779) remain independent product changes; no accounting or compatibility field is renamed here.

## Baseline artifacts and validation limits

- [Per-journey table](performance/773/baseline.md) separates cold direct, warm direct and client-transition observations for each accessible journey/state/profile.
- [Capture record and reproducible commands](performance/773/README.md) names fixtures, browser/tool pins, cache state, failures, sanitization and cleanup. Archived recipes preserve the exact capture inputs.
- The capture directory contains the reduced numeric baseline, Lighthouse navigation/timespan reports and sanitized DevTools event timelines. Use the capture record to distinguish successful artifacts from failed attempts.

The baseline does not include real-user INP, real phones, production server/query spans, a post-#767 comparison, React profiling, every empty-detail variant or repeated-run confidence intervals. It does not demonstrate that each page's controls are ready at `contentMs`. Those limits constrain conclusions; they are not implied passes. The plan defines the additional experiments needed before selecting caching/windowing changes or adopting absolute useful-content budgets.
