# Audit command validation

Issue [#797](https://github.com/axolotl-logic-io/project-buddy/issues/797) maintains the local authenticated audit command. These records validate the tooling; they do not claim a product performance improvement or field measurements. The [audit protocol](../../performance-audits.md) describes conditions, ownership and privacy.

## Failed fixture preparation

The first invocation used clean source `a0f18f9e9363fcb6f15c0f7458768e3e5813f3fc`. Browser preflight passed. Initial database reset and cleanup reset passed, but fixture preparation failed before a production build started. There is no build ID, browser observation, trace, Lighthouse result or quiet-window result for this attempt: 0 of 270 planned observations were captured. Port 36769 had no remaining listener after cleanup.

An import-only diagnostic reproduced the missing named export for `checkTestEnvironment` through the scoped TypeScript loader. The audit had introduced a `tsx` 4.21.0 pin; the original assessment used the existing root runner, locked at 4.23.15. The correction tests that existing version and isolates alias-aware fixture loading from the native browser-callback process. Private session data uses an owned temporary directory and an exclusive mode-0600 file removed by the parent.

The failed invocation ran once; it was not retried as a passing measurement. Its sanitized failure marker is retained below. Subsequent corrected captures must identify their own source and build and cannot reuse numbers from this attempt or #773's measured revisions.

```json
{"stage":"fixture","complete":false}
```

Before this runtime failure, `npm run check` passed on the implementation source: 54 files and 267 tests, with lint, route type generation, TypeScript and script guards passing. That fast check did not exercise production fixture loading. Subsequent source changes require fresh checks and material command validation.

## Fixture correction checks

The isolated fixture import passed with pinned `tsx` 4.23.15. Both measured #773 lockfiles also contain that root version. The guarded fixture subprocess then created the expected private fixture shape successfully. Its temporary directory had mode 0700 and its session file had mode 0600. Cleanup removed the private directory and reset only `pb_wt_3742836769` through the existing guarded command.

Fresh default checks after the loader correction passed: 54 files and 267 tests, with lint, type generation, TypeScript and script guards passing. A subsequent focused regression test checks that the fixture entry point imports its kits and safely refuses missing arguments without a loader stack. The coordinator reserved the next shared lock slot for the integration-only browser baseline repair, so the new test and second production audit were deferred. After the reservation was released, fresh default checks passed: 55 files and 268 tests, including the import-boundary regression. The common browser baseline was not duplicated.

## Incomplete matrix

The corrected second invocation used clean source `d2aa299669ac8acc8a24f14a17632fe9a00e4175`, production build `CCfZpkMRy4fnu53gqdQQx`. It retained 41 of 270 observations and five of eight planned traces, then stopped at populated desktop long-adventure sample 2, client navigation. Lighthouse, final summary and final compressed-cohort validation were not reached. Guarded cleanup reset the database; port 36769 was closed and no private fixture directory remained.

The retained failure said only `capture-failed`. It did not retain the underlying phase or cause, so the earlier failure cannot be conclusively attributed. Code inspection identified a source-preparation race: confirming the shared menu and a main region does not establish that the streamed destination link exists. Protocol v4 waits for that visible link within the existing browser deadline before activation; it preserves the control probe resolution, action length, destination validation and same-document requirement. New allowlisted phase/category diagnostics retain no arbitrary exceptions, URLs, selectors or schema values. Privacy tests cover unknown exceptions and schema failures.

This incomplete v3 cohort remains a failed capture, not a passing baseline or evidence of a product defect. New captures must record their own revision/build and cannot pool these partial values into a completed v4 cohort.

Fresh default checks after the v4 change passed: 56 files and 270 tests, including the failure-category privacy tests. Lint, route type generation, TypeScript and script guards passed. These checks do not replace the pending production audit.

## Event Timing schema failure

The v4 invocation at `4c0b5876d676208cab80eed9527d07245fabb20f`, build `DTl7yL9-gBlD8CL0j3wAe`, failed at populated desktop long-adventure sample 1, client navigation. It retained 38 observations and five traces. The diagnostic identifies `validate-result`, `schema`, `events`; it does not identify the rejected property. All 38 retained windows had final quiet intervals. No Lighthouse run or final cohort validation occurred. Cleanup reset the isolated database and closed port 36769.

Inspection against the [Event Timing draft's exposed-event list](https://w3c.github.io/event-timing/#sec-events-exposed) found omitted standard discrete names, including mouse enter/leave, pointer cancellation/capture and drag/drop. The schema now retains those enumerated types while continuing to reject arbitrary text and invalid numbers. Failure diagnostics can identify static event properties without retaining rejected values. A focused diagnostic will exercise the affected journey before another full cohort. A selected diagnostic cannot pass the default full-matrix validator, and is not a completed full audit.

The enumeration and explicit diagnostic-scope changes passed fresh default checks: 56 files and 273 tests, with lint, type generation, TypeScript and script guards passing. Full-matrix validation remains the default; tests verify that selected rows cannot pass it implicitly. The focused ten-sample run described below confirms the schema correction only and must not be presented as full-audit acceptance.

## Focused confirmation

The [focused diagnostic](focused/manifest.json) used source `68e41cb7269d4750a8593d426abac08dd7c3ed46`, build `d2Gafz9Cj5XIqEbEuQJhu`. It completed once with exit 0: ten populated desktop long-adventure samples in each of three cache modes, 30 observations total. The actual gzip observations and one screenshot-free trace passed scoped validation. The manifest remains `scope: diagnostic`, `complete: false`, `diagnosticComplete: true`; Lighthouse was not run.

The retained observations include ten `mouseenter` entries, one of the standard names absent from the earlier enum. Applying that old name restriction would reject these actual records. This confirms an exercised schema defect, without recovering the erased property from the earlier failed cohort. The separate planned default-validation check exited 1 as expected: selected observations and one trace cannot satisfy the full audit. That refusal is a negative validation case, not another product failure.

Cleanup reset the isolated database, closed port 36769 and removed private fixture directories. The full v4 cohort remains pending. Diagnostic rows are retained separately and will not be pooled with it or with the earlier failed runs.

## Attribution update

The focused summary predates CDP initiator attribution. Its `firstLoadJavaScript` and `destinationOnly` labels describe completed observation-window totals, not essential initial payload or exclusive destination ownership. The diagnostic contains no CDP network attribution and those values remain unavailable; its artifacts are not regenerated or pooled with later captures.

Following the separate #796 attribution investigation, summary version 2 distinguishes completed-window totals from early scripts (started by primary-content presence), late scripts and known prefetch. CDP records retain only categorical paths, method, resource type, initiator category and numeric request facts, without request IDs, stacks, raw URLs or headers. The full capture will exercise this additional attribution; no payload reduction is claimed from a five-second total.

Fresh checks after attribution version 2 passed: 57 files and 279 tests. They include direct validation of the committed focused gzip observations/trace, rejection of unallowlisted network metadata, and examples where late script totals decrease while early parser bytes increase. Historical missing attribution stays unavailable. The upcoming full production cohort must exercise the CDP records and Lighthouse; no full-audit acceptance is claimed yet.

## Completed full cohort

The [full capture](full/manifest.json) completed once at source `c8dce5343b497433b20396af46b0ea2e95fb7799`, production build `PkT8vZ5MahrNg6PMY7tZJ`, with actual exit 0. It retained 270 observations: three samples for each of 90 accessible state/profile/journey/cache cells. All 270 ended with a final 500 ms quiet interval within the finite observation window. The [readable table](full/summary.md) and [numeric summary](full/summary.json) report medians and ranges, not percentiles or a no-regression verdict.

The run retained eight sanitized traces, six Lighthouse navigations (three each Home and long adventure) and three Home-to-Quests timespans. The actual gzip files passed final validation. All 270 observations contain categorical CDP network data: 90,362 completed request records. Early-by-primary, late, known-prefetch and failed-request buckets remain distinct; none establishes essential initial payload from a five-second total. Browser/tool pins, fixture size, viewport/theme, cache/throttle conditions, host identity/load and source/build identity are in the manifest.

All 14 allowed Home screenshot frames were manually reviewed, including loading, atlas and menu states. No definition prompt, message body, account identifier or session credential was visible. The [review record](full/filmstrip-review.json) binds that review to the exact trace hash. The other seven traces have no Screenshot events. Cleanup reset only the isolated database, removed private fixture directories and closed port 36769.

The command finished its full cohort, but review must resolve one identified Lighthouse validation question before merge readiness: navigation mode currently checks content on the pre-opened authenticated page after a port-based audit, rather than explicitly passing that page to Lighthouse. Requested/final URLs are checked and the same-context synthetic session was retained. The actual audited tab's post-navigation content should be verified directly. The separate timespan already uses the validated live Page adapter. This draft evidence does not hide that remaining correctness review item.

Field collection stays off. This local workflow evidence establishes neither field INP, population percentiles, initial-payload reduction nor a product performance improvement. The measured source remains the recorded revision; later integration reconciliation must not relabel these measurements as a newer build.

The final committed-evidence guard passed fresh default checks: 57 files and 280 tests. It reads the complete gzip cohort and every retained trace directly, verifies the full manifest state, and ties the 14-frame manual review to the exact Home trace hash. This does not resolve the navigation-page review item above.
