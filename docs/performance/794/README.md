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

The instrumented baseline is production build `p6kzXUzloqeOGieyNS_4L`: `bb4d213c` plus the archived [instrumentation patch](recipes/baseline.patch.txt). The candidate is source `f85bc6ba`, production build `WnZXNfBQ75clkSQJY2F8H`. It uses the same synthetic fixture and database. The baseline bundle predates a module split that keeps database tooling independent of application imports; span behavior is equivalent.

Captures use the existing #773 fixture/session kit, with two extra synthetic quests so Home can exercise unused Journal reads. Credentials stay in a mode-0600 temporary file. No screenshot, raw HTML, HAR or browser profile is exported. Body probes inspect HTML in memory and retain numeric milestones only.

The experiment adds 50 ms per local database HTTP request. This is synthetic distance sensitivity, not a measurement of production database distance. Both variants share the preload, fixture and delay. Real database compute and loopback transport remain in addition to that delay. Production database latency is not inferred.

Browser captures alternate before/after order for each profile and route, with three initial samples and ten separate confirmation samples per cold/warm cell. Cold means a fresh browser context; warm reuses that context and its HTTP cache. Database and production-process caches are warm after startup; they are not reset per navigation. Desktop uses 1440×900, CPU rate 1 and loopback networking. Phone uses 390×844, CPU rate 4, 150 ms emulated network latency, 1.6 Mbps download and 750 Kbps upload. Both use light mode, direct navigation and a two-second post-load observation window. Host load is recorded per sample. Resource lists are destination-document entries, and may include prefetch during the window; they are not route-critical byte budgets.

Document-only requests isolate operation spans from browser prefetch. They alternate variants over the same Home/editor fixture and synthetic distance. Response headers, shell markup, primary markup and document completion are separate milestones. Browser DOM insertion markers correlate content parsing with Navigation Timing and resource waterfalls; they are not paint or hydration times. Three and ten samples support medians and ranges, not p90, field INP or proof of no regression.

All expensive stages run sequentially under `/tmp/project-buddy-unattended-full-suite.lock`, using unique build directories and ports 37601/37602. The archived recipes preserve the local capture paths; adjust them together for reproduction. They are evidence recipes; #797 owns the maintained command and privacy schema.

## Capture and validation failures

Initial formatting/lint stages reported new-code violations (async callbacks without awaits, export placement, test typing and formatting). They were corrected; the subsequent fast check passed 50 files and 256 tests. These failed stages were not product timing observations.

The first document capture used the copied baseline build with its original relative links under `.next/node_modules`. Relocation made the hashed Sharp/Shiki links invalid, so the editor response stream terminated after two completed Home observations. [The interrupted checkpoint](interrupted-documents.json.gz) retains those observations separately. The runner failed and no browser matrix started. The corrected relocated build points these external-package links at the same installed packages through absolute paths. Its bundle and build ID are unchanged. A fresh cohort follows the tooling correction; the interrupted samples are not pooled with it.

Browser test fixture changes come from PR808 commit `0de6c80f90e6b645fbb281177846dc2c810e4866`: server balance reads are mocked at the boundary, and Workshop tests supply router context. The additional server-span boundary mock belongs to #794. No Stripe browser prebundle or product payment behavior changes.

The real-database suite passed 106 files and 578 tests, including summary equivalence with Today, cross-account exclusion and membership removal. The first affected browser suite passed 354 tests and failed four: two stale Generate Images expectations in each engine still expected an immediate saved-definition mutation, contrary to #764's draft-only generation. Home, definition details and phone coverage passed. Those failures are retained pending the Workshop owner's test correction; they are not performance observations or passing retries.

The first browser pilot selected Chrome 145 through an unordered filesystem glob, rather than the planned Chrome 156. It was stopped after discovering the version mismatch; its observations are excluded from the comparison. The corrected recipe pins `chromium-1248` and verifies Chrome 156.0.8078.4 before any observation. The completed document-only cohort is independent of browser version and remains unchanged. This is a recorded protocol correction, not a product assertion retry.

## Document-only findings

Ten confirmation requests per variant show editor primary markup at 241.1 ms before and 184.3 ms after (23.6% lower median), with complete body at 241.3 ms and 184.9 ms (23.4% lower). Response headers remain around 3 ms, and shell markup remains around 184 ms. This meets the candidate dependency-bound completion and primary-markup targets for this local distance condition; it does not establish faster early headers, paint, hydration or production latency.

By elapsed contribution, Home's domain operation is largest among recorded spans: Today takes a median 117.7 ms, and the summary takes 116.3 ms. Both retain an activity-read-to-Journal dependency. Reducing five queries to three does not remove that dependency: complete-body medians are 183.9 ms and 182.8 ms. The narrow summary removes unused result work, but this experiment does not support a material Home duration improvement.

On the editor, session validation takes about 59 ms and gates protected reads. Workshop choices take about 59 ms, with two queries overlapping. Metadata's definition read also takes about 59 ms; the before page performs another roughly 57 ms definition query after choices. The candidate shares that request-local definition and overlaps choices. Its data span still waits about 58 ms for the shared promise but executes zero queries; metadata owns that query's attribution. Summing these overlapping spans would overstate total contribution. Sale-state and shared-header balance reads remain outside these domain spans, so this is a scoped decomposition, not a complete server CPU/query profile.

The confirmation cohort establishes a local matched median reduction on the editor. It does not estimate p90 or prove no regression. The smaller initial cohort and every min–max range remain separate in the numeric evidence. Host load and startup observations remain visible, rather than discarded as outliers. Actual production database distance remains unknown.

A subsequent browser startup failed before observations because the previous runner released the lock before its server wrappers had fully exited, leaving port 37602 briefly occupied. The runner now awaits both server exit events during cleanup. No readiness deadline changed. The pinned-browser cohort starts only after that correction; no measurements from the failed startup exist.

The initial canonical artwork-test correction (`508b05a4`) stopped at lint because it put expectations inside a conditional branch. Its follow-up `29b7f52c` separates Save-and-generate from uniform unchanged/changed explicit Generate cases, preserving request, durable UUID, loading, draft and no-save assertions. Both are adapted from PR808 with only the drawer-specific section-navigation click omitted in this non-drawer fixture. The unchanged lint rule and deadlines remain in force.

## Browser correlation and limits

All 208 planned Chrome 156 observations completed: three initial and ten confirmation samples for each route/profile/cache/variant cell. Both compressed archives pass #797's strict server-evidence schema, and injected prompt/session fields are rejected. Every browser row has shell and primary DOM milestones; no missing-marker row counts as a pass. [The tables](results.md) retain all ranges, resource timing entries and operation spans.

Desktop editor confirmation primary DOM insertion falls from 303.1 to 190.4 ms cold, and 249.6 to 189.3 ms warm. Warm-phone insertion falls from 321.1 to 266.5 ms (17.0%). Cold-phone insertion is almost unchanged, 628.2 to 626.3 ms; the document completes earlier (284.1 to 253.8 ms), but the browser exposes primary markup later. The cold-phone shell/primary cluster around 623–628 ms in both variants. This is evidence that the server improvement does not automatically become a cold-phone useful-content improvement. It does not meet a 10% cold-phone DOM-insertion gain. Renderer/delivery work remains #796's separate scope.

Navigation-start-to-response-header medians remain about 3 ms in both desktop and phone captures. The CDP phone profile requests 150 ms network latency and the recorded bandwidth limits; the observed early header interval must not be relabeled as 150 ms applied round-trip or used to infer production latency. Body, resource and DOM timing remain separate observations. These records measure DOM insertion, not paint or controls accepting input. Browser spans can include prefetch and preference refresh during the window, so the document-only operation cohort is used for dependency attribution. Resource entries describe the destination document's waterfall and include those background requests; they are not summed as a critical-route byte budget.

Home's browser results are small and mixed: cold-phone primary DOM is 625.6 ms before and 626.2 ms after, while warm-phone is 255.5 and 249.7 ms. No material Home latency improvement or no-regression percentile claim is supported.

Host one-, five- and fifteen-minute load ranges across the retained document/browser observations are 0.91–5.05, 1.72–3.76 and 2.33–3.11 on 32 logical CPUs. Initial first-request values are much wider than confirmation ranges: Home complete document reaches 560.8 ms before and 327.9 ms after in the first three-sample cohort. Those first requests follow process startup and include initialization effects, but this experiment does not isolate each cause. They remain in the archive. No sample was trimmed to improve the median, and ten confirmation samples do not establish a tail percentile.

The canonical follow-up check passed 50 files and 256 tests. Its focused browser run passed 34 and failed four because one remaining prompt-section navigation click assumed PR808's drawer UI. The non-drawer fixture exposes that input directly. Removing only that inapplicable click preserves the POST, UUID, no-save, loading and draft/prompt assertions; its focused validation is tracked separately.
