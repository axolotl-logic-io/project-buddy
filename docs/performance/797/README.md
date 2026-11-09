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
