# Spec draft for #419 (in progress; see handoff.md)

Design decisions so far (no tests or stubs committed yet):

- States (all script states are checks built with `check()` from states.ts; ops run inside checks through `effects.op`, as `flows` does):
  - `start` answers the entry (`implement` | `sync`) → `sync-work?` for both.
  - `sync-work?` (payload `stackedOn`): `work` → `rebase`; nothing to do answers the entry's name: `implement` → `implement-work?`, `sync` → `sync-moved?`.
  - `rebase` (sync-base, `keepConflict: true`, `stackedOn`): `conflict` {files, baseSha, stackedOn} → `resolver`, Guard `conflictFixes`/`maxConflictFixes` over → `abort-conflicts`; apply clears `passedSha`, `testsOnly` false. Clean answers the entry's name (sync-base already pushed): `implement` → `implement-work?`, `sync` → `sync-moved?`.
  - `resolver` session (name `conflicts`, CIFIX_SCHEMA, agent issue-pipeline-writer, budget role fixer): `replied` → `resolver-reply`.
  - `resolver-reply` check: `fixed` → `continue`; `cannot-fix` → `abort-cannot-fix`; `handoff` → `resolver` Guard `continuations` over → `abort-out-of-room`; `bad` → `abort-failed`.
  - `continue` check (`GIT_EDITOR=true git rebase --continue`, env ISSUE_PIPELINE_COMMIT=1 for the pre-commit hook in clone-setup.ts): `clean` → `finish-sync`; `conflict` → `resolver` Guard conflictFixes over → `abort-conflicts`.
  - `finish-sync` (finishRequest payload): entry name (`implement` → `implement-work?`, `sync` → `sync-moved?`); `rejected` → end `rejected` (stopped `conflict` when conflictFixes >= maxConflictFixes, else released).
  - abort states: finish-sync `{abort:true}` answering `aborted` → ends: `cannot-fix` (released, same stage, conflicts-never-stop), `conflicts` (stopped code `conflict`, src/stops.ts:205), `out-of-room` (too-large, outOfRoomReason("conflict resolver", max)), `resolver-failed` (stopped error).
  - sync entry: `sync-moved?` check answers `moved` (Guard `syncs`/`maxSyncs` over → stopped code `sync-limit`, src/stops.ts:213) or `same`, both → end `synced` saved(checks) with testsOnly = passedSha === pre-sync headSha, passedSha null, stackedOn saved.
- ImplData gains: stackedOn, syncs, testsOnly, passedSha, maxConflictFixes, conflict {files, baseSha}, changed.
- LIMITS: { maxContinuations: 1, maxConflictFixes: 2, maxSyncs: 3 }; limitsOf adds cfg.maxConflictFixes ?? 2 and cfg.maxSyncs.

<!-- end of spec -->
