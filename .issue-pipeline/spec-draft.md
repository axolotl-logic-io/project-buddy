# #416 spec draft (partial, spec writer session 1)

Not finished: see the run's handoff.md. Decisions so far:

- End at `saved("done")` / `saved("publish")` after a merged reply (not a new End kind): the runner's final save adds `reportedTokens` (usage.counted) and drops the lease; it rewrites the same stage the op wrote (`src/ops/publish.ts:68`, `src/ops/finish.ts:103`).
- No `mergedPr` checkpoint: the runner saves a checkpoint only before a non-end step (`src/job/runner.ts` `checkpoint()`), and a mid-run save at `merge` after the op wrote `done` would roll it back. A kill inside the merge op leaves the state at `merge`; the restart's `merge` op sees the PR MERGED and does bookkeeping only (`src/ops/merge.ts:129-134`, pinned by `merge-op.test.mjs`).
- `queued` -> `held` (note once); `behind`/`conflict` -> `saved("sync")`, `passedSha = verifiedSha`; `resynced` goes away (Shared: cross-stage flags go away).
- Refusal (ok, merged false, other reason) -> stopped `error` with `stop` op, reason "GitHub refused the merge", detail = reason. Failed op: network -> held; other -> stopped `error` with `stop` op "the merge step failed" (needs `recover` on the step).
- Open blocking finding -> stopped with `findingsStop` code (null -> "error") and `stop` op.
- Linear walk needs `skip?(data)` (wiki steps optional, merge vs finish-wiki) and `again?(data)` (resolver continuations up to maxContinuations) on `LinearStep` (`src/roles/walk.ts:52`).
- `conflictFixes` stays a top-level hand-off field (shared with sync) and is also listed as a checkpoint so it is saved before the resolver session.
- `SessionEffect` gains optional `minutes` and `writer`; `childOf` (`src/job/role-run.ts:93`) passes them.
- `RoleContext`/`RoleJob` gain `mergeQueue: readonly number[] | null` (RunArgs already has it, `src/job/args.ts:50`).
