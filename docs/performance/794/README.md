# Shared server paths

Issue #794 follows the production-build cohorts in [#773](../773/README.md). The older `242e3a1` and `9a8ab46` timings remain historical evidence. This experiment starts from integration `bb4d213c`, including the 20 prior issue PRs through #806.

## Local operation spans

`PERF_SERVER_SPANS=local` enables `[server-span]` lines only with a loopback `pb_wt_` database outside Vercel. It is off by default. Lines contain a static operation name, elapsed milliseconds and inclusive query count. They never contain arguments, SQL, parameters, identifiers, prompts, user text, result values or exception details. No field collector or hosted service is introduced.

`current-user` starts after Next's request connection boundary and includes signature/expiry and session-epoch validation. `today` and `home-summary` cover the domain read. `workshop-options` covers the concurrent construct and activity choices. The construct, activity and spell metadata/data spans cover their own definition lookup, not the whole page render. A cached lookup can have zero queries. Counts include attempted executions and nested queries; elapsed durations include overlap. Summed concurrent durations are not a critical path.

## Candidate changes

Home renders the latest active quest, its most recent adventure and Journal next step, plus first-visit state. Its summary retains Today's ordering and owner/member predicates while omitting other cards and Journal reads. A concurrent adventure existence query preserves first-visit behavior for standalone adventures and adventures in completed quests. Today remains available to the new-adventure page.

Each definition editor shares its own definition read between metadata and page through React `cache`, keyed by acting user and definition identifier. Independent Workshop choices run alongside that read after `requireUser`. Sale state is read after the definition succeeds. Missing and retired definitions retain their existing not-found and redirect behavior.

## Cache lifetime and access

React's request-local memoization ends with the server render. There is no shared private result cache. A new request checks the session epoch and current membership. Edits, retirement, restoration, member removal and session revocation therefore take effect on the next server request without tags or time-based expiry. Existing browser navigation caching behavior is unchanged.

A longer-lived cache keyed only by owner and definition would reduce repeated database work across requests, but would require invalidation for every definition edit, retirement, restoration and deletion. Shared quest summaries would also need invalidation on membership removal, status changes, adventure activity and Journal edits. Session results must never outlive revocation without an epoch check. Including the owner in a key alone cannot satisfy these requirements: a member's key could retain access after removal. That alternative is not introduced here.

## Capture protocol

The instrumented baseline is production build `p6kzXUzloqeOGieyNS_4L`: `bb4d213c` plus the archived [instrumentation patch](recipes/baseline.patch.txt). The candidate uses the same synthetic fixture and database. The baseline bundle predates a module split that keeps database tooling independent of application imports; span behavior is equivalent.

Captures use the existing #773 fixture/session kit, with two extra synthetic quests so Home can exercise unused Journal reads. Credentials stay in a mode-0600 temporary file. No screenshot, raw HTML, HAR or browser profile is exported. Body probes inspect HTML in memory and retain numeric milestones only.

The experiment adds 50 ms per local database HTTP request. This is synthetic distance sensitivity, not a measurement of production database distance. Both variants share the preload, fixture and delay. Real database compute and loopback transport remain in addition to that delay. Production database latency is not inferred.

Browser captures alternate before/after order for each profile and route, with three initial samples and ten separate confirmation samples per cold/warm cell. Cold means a fresh browser context; warm reuses that context and its HTTP cache. Database and production-process caches are warm after startup; they are not reset per navigation. Desktop uses 1440×900, CPU rate 1 and loopback networking. Phone uses 390×844, CPU rate 4, 150 ms emulated network latency, 1.6 Mbps download and 750 Kbps upload. Both use light mode, direct navigation and a two-second post-load observation window. Host load is recorded per sample. Resource lists are destination-document entries, and may include prefetch during the window; they are not route-critical byte budgets.

Document-only requests isolate operation spans from browser prefetch. They alternate variants over the same Home/editor fixture and synthetic distance. Response headers, shell markup, primary markup and document completion are separate milestones. Browser DOM insertion markers correlate content parsing with Navigation Timing and resource waterfalls; they are not paint or hydration times. Three and ten samples support medians and ranges, not p90, field INP or proof of no regression.

All expensive stages run sequentially under `/tmp/project-buddy-unattended-full-suite.lock`, using unique build directories and ports 37601/37602. The archived recipes preserve the local capture paths; adjust them together for reproduction. They are evidence recipes; #797 owns the maintained command and privacy schema.
