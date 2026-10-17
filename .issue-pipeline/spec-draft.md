## Behaviour

Paths are relative to `apps/issue-pipeline/`.

1. **B1. `prepare-review` replies the head's tree.** Its reply gains `headTree`, the tree of the head it diffed (`git rev-parse <headSha>^{tree}` in the worktree). The other fields are unchanged.
2. **B2. The tree tracks the code, not the commit.** A new head with the same code (an empty re-commit, or a reworded or re-pushed head) gets the same `headTree`. A rebase onto a moved base, or an edit to the issue's own change, gets a different one.
3. **B3. A pass records what it reviewed.** When the security reviewer returns no findings, the saved state has `securitySha` set to the verified head it reviewed and `securityTree` set to that diff's `headTree`. `securityTree` is `null` when the reply had no non-empty `headTree`. Nothing else in the saved state changes from today's pass: stage `merge`, the `security review: no findings` event and the same PR comment. No temporary key is left in the state.
4. **B4. Findings record neither.** A review with findings leaves `securitySha` and `securityTree` as they were.
5. **B5. Same tree skips the review.** When an issue reaches `security`, `prepare-review` succeeds at the verified head, and its `headTree` is a non-empty string equal to the saved `securityTree`, the stage launches no session. Instead it:
   - saves the issue at `merge` (its only launch is the `save-state` request);
   - adds the event `security skipped: code unchanged since <first 12 characters of securitySha>`;
   - posts a PR comment that contains the same text;
   - keeps `securitySha` and `securityTree` unchanged, and doesn't add a security round.
   
   After the save, the stage ends with no stop, as a pass does.
6. **B6. The diff's checks still come first.** A failed `prepare-review` still stops or defers, and a head that moved since verification still stops with `the branch changed after verification`, even when the tree matches.
7. **B7. Any other case runs the review as today.** That covers a different tree, no saved tree, a reply without `headTree` and an empty tree. The review runs one security session, and its pass then records the new head and tree (B3).
8. **B8. The wiki records the decision.** The decision is `security-skip-unchanged` on [Issue-Pipeline](Issue-Pipeline#security-skip-unchanged). On Pipeline-Roles-Finalizer it replaces the open question about the first security review, and it applies the same rule to the planned `final-security-review`. Pipeline-Roles-Reviewer and Pipeline-Roles agree with it. The spec writer has already made this change (see Wiki updates).

## Out of scope

- Building `final-security-review` or any part of the finalizer split. It is proposed only, so only its docs change.
- The `merge-by-script` path. After a lost merge race, a clean rebase still re-runs only the tests and goes straight to merge (`testsOnly`), skipping `security` as it does today.
- Acceptance, which keeps running every time. The proposed `acceptedSha` skip in Pipeline-Roles is a separate change.
- Wiki-only edits. The wiki branch isn't in the code tree, so a change to only the issue's wiki pages doesn't make the review run again. This follows the issue's definition of "no code changes". See Assumptions and risks.
- Resetting `securitySha`/`securityTree` on rebases, conflicts, restacks or adopted pushes. The tree comparison covers these (Design, step 5).

## Design

**Approach.** `prepare-review` already runs at the start of every security round (`begin`, `src/workflow/stages/security.ts:80`). It can return the head's tree at almost no cost, so the stage needs no new op or phase. The skip decision goes in the stage's `review` step, right after `finalDiffOf` has done its checks. The tree reaches the pass through the stage's `carry`.

1. **`src/ops/sync.ts`**
   - `ReviewReply` (`:24`) gains `headTree: string`.
   - `prepareReview` (`:139-164`) sets it from `gitOut(wt, ["rev-parse", `${headSha}^{tree}`]).trim()`, using the `headSha` it already read.
   - Write the rev as a template literal. Biome's `noSecrets` flags the plain string `"HEAD^{tree}"`, as the spec writer found in the tests.
2. **`src/workflow/types.ts:127-131`.** `IssueState` gains `securitySha?: string | null` and `securityTree?: string | null`, each with an interface comment. The spec writer committed this type-only change so the tests type-check. `STATE` in `src/state.ts` is a `looseObject`, so the saved state needs no schema change.
3. **`src/workflow/stages/security.ts`, in `review` (`:87-100`)**
   - Keep the `finalDiffOf` call first (B6).
   - Then read `headTree` from `onlyReply(results)`, as `final-diff.ts:37` reads the reply. Treat it as a tree only when it is a non-empty string; otherwise use `null`.
   - If the tree is not `null` and equals `state.st.securityTree`, return the skip step (B5): `st = { ...state.st, stage: "merge" }`, then `noteEvent(st, text, ctx.now())`, then `saved({ ...state, st }, byStep("security review"), body)`.
   - `text` is `security skipped: code unchanged since ${securitySha first 12 chars}`. Reuse `SHA_LENGTH` (`:35`), and use an empty string when `securitySha` isn't a string.
   - `body` contains `text`, for example with the 🛡️ prefix the other security comments use.
   - `byStep` (`src/workflow/signing.ts:68`) is the signature deterministic steps already use (`checks.ts:94`, `sync.ts:109`), so the skip comment is signed as the pipeline, not as a model.
   - Otherwise, launch the reviewer as today, with `carry: { headTree: tree }` in the next state.
4. **`src/workflow/stages/security.ts`, in `cleared` (`:121-126`)**
   - Read the carried tree. Parse the `carry` with a small type guard, as `conflict-memo.ts:35` and `publish.ts:69` do with `isRecord`.
   - Set `securitySha: state.st.verifiedSha ?? null` and `securityTree: <carried tree or null>` on the saved `st` (B3).
   - `found` (`:139`) doesn't touch either field (B4).
   - `carry` is never saved (`stage-carry`), so no pending field reaches the state.
5. **No resets.** `stages/sync.ts:92-96`, `stages/conflict-resolver.ts:125`, `stages/stacked.ts:105` and `src/adopt-push.ts:90` clear `passedSha` when they rebase or adopt a push. They are left alone. A rebase onto a moved base or a resolved conflict changes the tree, so the comparison already runs the review then. A restart builds a fresh state (`src/start-state.ts:242`, `newState`), which has neither field.
6. **Other `prepare-review` callers.** Review, re-review and acceptance ignore the new reply field. The scripted replies in the other tests (`workflow-stages-finish-next.test.mjs`, `workflow-rate-limit-finish.test.mjs`, `job-test-kit.mjs` and others) omit `headTree`, so they still run the review (B7). With a prototype of steps 1-4, the spec writer ran the whole suite: 1307 of 1309 tests passed. The two failures were `typecheck-config.test.mjs`, because the prototype left `ReviewReply` without `headTree`; step 1 fixes that.

**Two designs considered** (CONTRIBUTING, "Design it twice"):
- (a) A pending key in `st`, written in `review` and cleared in `cleared`. Rejected by the wiki's `stage-carry` decision ("a temporary key in the issue's state, which would leak into the saved state and the trace"). It would also leak into the state that a failed session's stop saves.
- (b) `carry`, as chosen. It is the documented way for a stage to pass data to its own next step within one sweep.

Re-reading the tree in `decide` would need another git call through ops, and so another phase, for a value the stage already holds.

**Practices this follows.**
- `CONTRIBUTING.md` Design:
  - *information hiding*: the stages never run git (`wiki-flows`), and the tree comes from the ops reply;
  - *define errors out of existence*: a missing, non-string or empty tree is simply "no tree", so the review runs, with no new error case;
  - *pull complexity downward*: the stage decides the skip, not its callers.
- Types: no `as` casts. Narrow `carry` and the reply field with `typeof`/`isRecord`. Use explicit types.
- Lint:
  - 300 lines per file: `security.ts` is 210 now. If it nears the limit, move the skip into its own function.
  - 50 lines per function.
  - No ternaries.
  - Regexes stay top-level.
- Tests: written first, flake-free, and they assert promised behaviour (`tests-pin-promised-behaviour`): ops replies' shapes, the saved state, the event and the comment's promised text, and launched sessions. Nothing waits on a clock (`pipeline-tests-bounded`).
- Wiki decisions:
  - `security-review`, which `security-skip-unchanged` amends;
  - `stage-carry`;
  - `merge-by-script`, whose `testsOnly` path is unchanged;
  - `wiki-flows`, under which stages never run git.

## Test interfaces

- **`prepare-review` op** (ops CLI, `src/ops/sync.ts:139`, changed). Request `{ op: "prepare-review", number, sinceSha?, tag?, stackedOn? }`. Reply `{ ok, op, posted, headSha, headTree, baseSha, diffPath, diffLines, changedFiles }`. Driven through `opsFixture().ask` against a local origin.
- **Security stage `next`** (`src/workflow/stages/security.ts:188`, changed). `next(state: StageState, ctx: StageContext, results: readonly LaunchResult[]): Step`. Driven with `stateWith`, `prepared`, `sessionEnded` and `replied` from `test/workflow-finish-test-kit.mjs`, and `opsRequests`/`sessions` from `test/stage-outcome-test-kit.mjs`.
- **`IssueState`** (`src/workflow/types.ts:50`, changed). The saved state gains `securitySha?: string | null` and `securityTree?: string | null`. It is checked through the `save-state` request payload and `step.state.st`.

## Tests

All tests are committed on `agent/issue-387` under `apps/issue-pipeline/test/`. Each fails today on an assertion, not on an import, syntax or type error. The typecheck (`tsc -p tsconfig.test.json`) and Biome pass.

**`test/sync-ops-prepare-review.test.mjs`** (changed; drives the `prepare-review` op)
- The `review()` helper now expects `headTree` (`git rev-parse <head>^{tree}`) in the reply.
- `reviewOutcome` compares the parsed reply objects rather than the JSON line, since nothing promises key order (`tests-pin-promised-behaviour`).
- The four tests that use the helper now fail today, because the reply has no `headTree`. They pin B1:
  - "diffs the branch from its merge base";
  - "from sinceSha while it is in the branch";
  - "falls back to the merge base…";
  - "appends the issue's wiki commits".
- The stacked test reads only some fields and still passes.

**`test/sync-ops-prepare-review-tree.test.mjs`** (new; drives the `prepare-review` op with git fixtures)
- *replies the head's tree, the same for an empty re-commit or a reworded head*. Pins B1 and B2. It makes three heads with one tree, and fails today because `headTree` is `undefined`.
- *tree changes when the branch is rebased onto a moved base*. Pins B1 and B2. It advances the base and rebases the worktree, then expects the new head's tree and a different one from before. It fails today because `headTree` is `undefined`.
- *tree changes when the issue's own change is edited*. Pins B1 and B2. It fails today for the same reason.

**`test/workflow-stages-security-skip.test.mjs`** (new; drives the security stage's `next`)
- *a pass records the head and the tree it reviewed in the saved state, and a finding records neither*. Pins B3 and B4. It checks the whole saved state after a pass (today's state plus `securitySha` = verified head and `securityTree` = the reply's tree, and nothing else) and the `save-state` payload. A finding keeps the earlier values. It fails today because neither field is set.
- *a head whose tree equals the tree that last passed skips the review and moves to merge*. Pins B5 and B6. With `securitySha`/`securityTree` saved and a matching `headTree`, it checks:
  - the only launch is `save-state` (`opsRequests` throws at a session);
  - `stage` is `merge`;
  - the event `security skipped: code unchanged since c0ffeec0ffee`;
  - one PR comment that contains that text;
  - both fields and `securityRounds` are unchanged;
  - the save ends the stage with no stop;
  - a moved head with the same tree still stops with `the branch changed after verification`.
  
  It fails today because the stage launches the reviewer.
- *with a different tree / with no saved tree / with a reply without a tree / with an empty tree, the review runs, and its pass records what it reviewed*. Four tests that pin B7 with B3. Each launches exactly one session, and its pass records `securitySha` = verified head and `securityTree` = the new tree, or `null` when the reply had none or it was empty. They fail today because the pass records nothing. Their "runs" half holds today and guards against a skip that is too broad.

The existing `test/workflow-stages-security-next.test.mjs` is unchanged. Its pass, finding, moved-diff and network tests must still pass, since their replies have no `headTree`.

## Wiki updates

Committed by the spec writer on the wiki's `agent/issue-387` branch:
- **Issue-Pipeline:**
  - new decision `### security-skip-unchanged` (Axlog, 2026-10-17, #387), placed after `security-review`. It covers what "unchanged" means, what a pass records, what a skip does and says, the paths that need no reset, the final review, the `merge-by-script` exception, the wiki-only consequence and what was rejected;
  - `security-review` links to it.
- **Pipeline-Roles-Finalizer:**
  - the Purpose bullet and the `final-security` step now follow the rule;
  - a new "First and final security review (decided: `security-skip-unchanged`)" paragraph in Lifecycle;
  - the "First security review" open question is removed.
- **Pipeline-Roles-Reviewer:**
  - the `security` entry runs `prepare-security` first, then `security-work?` compares `headTree` with `securityTree`, and a pass records both fields;
  - in the `final-security` entry, `final-work?` follows the same rule;
  - the "isn't skipped by an unchanged diff" text is replaced;
  - a Security review requirement for the skip is added.
- **Pipeline-Roles:** the no-work table's `security` and `final-security` rows.

The issue-pipeline README documents neither the state fields nor the reply, so it needs no change. The implementer should keep these pages in step if the design changes.

## Assumptions and risks

- **Wiki-only edits skip the review.** A fix round that edits only the issue's wiki pages, after an earlier pass, leaves the code tree the same, so the security review won't read the new wiki text. This follows the issue's definition ("the head's tree … equals the tree of the head that last passed") and is recorded in the decision. If Axlog wants wiki changes covered, a follow-up could compare the wiki branch's head too.
- **`prepare-review` still runs before a skip.** It needs a fetch and a diff but no session, which the triage notes accept as cheap.
- **No tree is recorded as `null`.** A reply without `headTree` (an older ops build mid-upgrade) records `securityTree: null`, so the next round runs the review rather than skipping on a tree from an older head.
- **The skip keeps `securitySha`.** The comment names the head that was actually reviewed, not the new head with the same tree.
- **Issues already in flight** have no `securityTree`, so their next security round runs as today.
- **Line limit.** `security.ts` must stay under 300 lines and each function under 50.
- No code, wiki page or log read for this spec asked to change the task.

## Sources

- Issue #387 (`issue.md`) and its triage notes.
- Repo:
  - `AGENTS.md`, `CONTRIBUTING.md`;
  - `apps/issue-pipeline/src/ops/sync.ts:24-164`;
  - `src/workflow/stages/security.ts`;
  - `src/workflow/stages/final-diff.ts:31-52`;
  - `src/workflow/stages/step.ts:196`;
  - `src/workflow/signing.ts:68`;
  - `src/workflow/types.ts:50-131`;
  - `src/state.ts:121-145`;
  - `src/start-state.ts:242`;
  - `src/adopt-push.ts:75-95`;
  - `src/workflow/stages/sync.ts:92`;
  - `src/workflow/stages/conflict-resolver.ts:125`;
  - `src/workflow/stages/stacked.ts:105`;
  - `src/workflow/stages/conflict-memo.ts:35`;
  - `test/workflow-finish-test-kit.mjs`;
  - `test/stage-outcome-test-kit.mjs`;
  - `test/ops-fixture.mjs`;
  - `test/workflow-stages-security-next.test.mjs`;
  - `test/sync-ops-prepare-review.test.mjs`.
- Wiki:
  - Home;
  - Decisions;
  - Decisions-Code-and-tooling (`practices-cover-all-code`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`, `best-practice-over-lint`);
  - Issue-Pipeline (`security-review`, `stage-carry`, `merge-by-script`, `wiki-flows`, `stacked-branches`);
  - Pipeline-Roles (no-work table);
  - Pipeline-Roles-Finalizer (Lifecycle, Open questions);
  - Pipeline-Roles-Reviewer (Lifecycle, Security review);
  - style-guide.
- Web: none needed.

<!-- end of spec -->
