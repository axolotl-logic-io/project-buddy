## Behaviour

1. `pipelineRole(cfg, item)` (`apps/issue-pipeline/src/comments.ts`) returns `"usage"` for a comment by `cfg.account` whose body matches `USAGE_MARK` (`<!-- issue-pipeline:<n>:usage -->`, `<!-- issue-pipeline:<n>:usage-2 -->`, …). The same body from any other user returns `null`. A comment by the account that carries `PIPELINE_MARK` keeps that mark's role even if its text quotes a usage mark. The state comment still returns `"state"`.
2. `answeredSince(cfg, comments, state)` (`src/ops/sweep-verdict.ts`) does not count a usage comment by the account as an answer, whatever its date: with `questionsAt` set and only later `usage` / `usage-2` comments, it returns `false`.
3. A comment by the pipeline's account with no pipeline mark, posted after `questionsAt`, still counts: `answeredSince` returns `true`.
4. `writeIssueContext(cfg, n)` (`src/issue-context.ts`) leaves the account's usage comments out of `issue.md`, the way it leaves out the state and claim comments. They are not shown as a person's comment, and they don't add to the "withheld" count. An unmarked comment by the account is still shown under `Comment by @<account> (a person) at <time>:`.

## Out of scope

- How usage comments are written, numbered or rolled over (`src/job/usage-comment.ts`, `src/ops/usage.ts`), and `report.mjs usage` (`src/report/usage.ts:116`), which matches `USAGE_MARK` on its own.
- `questionsAt` itself and when it is set (#457).
- `src/claims.ts:84`, which matches `PIPELINE_MARK` directly and doesn't call `pipelineRole`.
- The callers of `answeredSince` (`src/ops/claim.ts:79`, `src/ops/claim-state.ts:159`) and `answered` (`src/ops/sweep-verdict.ts:134`). They need no change.

## Design

- **`pipelineRole`** (`src/comments.ts:222-237`): keep the account check at the top (l.225), so another user's comment is never the pipeline's. Keep the `STATE_MARK` check (l.229). Then check `PIPELINE_MARK` (l.232). Only when that finds no role, return `"usage"` if `USAGE_MARK.test(body)` (the mark is at l.16-17, already exported), and otherwise `null`. Putting `PIPELINE_MARK` before the usage check matters: a signed agent comment that quotes a usage mark, such as a spec that names one, keeps its role (the test "a signed pipeline comment that quotes a usage mark keeps its role" pins this). Usage bodies carry no `PIPELINE_MARK`: the usage op posts them raw (`src/job/usage-comment.ts:16-19`, `rawComment` at `src/comments.ts:82`). Update the doc comment at l.222-223 to name `"usage"` for the usage comments too.
- **`answeredSince`** (`src/ops/sweep-verdict.ts:111-130`): no code change is needed. The filter `pipelineRole(cfg, item) === null` (l.127) now leaves out usage comments whatever their date. Update the doc comment at l.111-113 to say that the pipeline's own comments, its usage comments included, never answer, while an unmarked comment by its account does.
- **`shownAs`** (`src/issue-context.ts:29-50`): add `"usage"` to the roles hidden at l.40 (`role === "state" || role === "claim"`), and update the comment at l.29-30 to name usage comments among those hidden. Without this, the new role would show each usage comment's records as `Comment by the pipeline's usage agent` (l.44). Today, as this issue's own `issue.md` shows, they appear as `Comment by @<account> (a person)`. That is the "part of the pipeline reads it as a person's comment" that Behaviour 1 of the issue rules out. Hiding them, rather than showing them under a pipeline heading, keeps hidden JSON records out of every agent's context. The records are for `report.mjs usage`, not for agents.
- Design it twice: (a) a separate `isUsageComment` predicate that `answeredSince` and `shownAs` call beside `pipelineRole`, or (b) `pipelineRole` claims usage comments as role `"usage"`. (b) is chosen, as the issue asks. It keeps "which comments are the pipeline's" in one module (information hiding, `aposd-and-strict-typing`), so every caller of `pipelineRole` gets the new rule without a second check (pull complexity downward).
- Practices (Coding-Practices-Digest): no new exports or modules. Regexes stay top-level with the `u` flag. Functions stay under 50 lines and files under 300 (`comments.ts` is 262 lines today). Interface comments say what is promised. Tests pin promised behaviour: the wiki's answer rule and `issue.md`'s contents, with past bugs named by issue number (`tests-pin-promised-behaviour`). They are deterministic, using the fake `gh` with no network and no model (`pipeline-tests-bounded`: they start no process that outlives them).
- The previous spec commit (a46d43a) moved the `wiki` submodule pointer by accident, through `git add -A`. This session's commit puts it back at integration's `d32f602`. The implementer should stage only the files they change, not the wiki pointer.

## Test interfaces

- `pipelineRole(cfg: Config, item: IssueComment): string | null`, `src/comments.ts:224`, existing.
- `answeredSince(cfg: Config, comments: readonly IssueComment[], state: State | null): boolean`, `src/ops/sweep-verdict.ts:114`, existing.
- `writeIssueContext(cfg: Config, number: number): IssueContext`, `src/issue-context.ts:75`, existing. It writes `issue.md`, which the wiki promises holds the issue and only the pipeline's and allowed users' comments (Issue-Pipeline, Pipeline-Roles-Triage).

## Tests

Both files are node:test `.mjs` files with the fake `gh`, so they need no network and no model. Run them with `node --test test/comments-usage-role.test.mjs test/issue-context-usage.test.mjs` in `apps/issue-pipeline/`.

`apps/issue-pipeline/test/comments-usage-role.test.mjs`:
- "the account's usage comments are the pipeline's usage records": drives `pipelineRole` and pins Behaviour 1 for `usage` and `usage-2`. It fails today because the result is `null`.
- "a usage comment's body from another user is not the pipeline's": drives `pipelineRole` and pins Behaviour 1 (`null` for another user). It passes today and guards the account check.
- "a signed pipeline comment that quotes a usage mark keeps its role": drives `pipelineRole` and pins Behaviour 1 (the `PIPELINE_MARK` role wins). It passes today and guards the check order.
- "usage comments posted after the questions don't answer them (#459)": drives `answeredSince` and pins Behaviour 2. It fails today because the result is `true`.
- "an unmarked comment by the account after the questions answers them": drives `answeredSince` and pins Behaviour 3. It passes today and guards against hiding every comment by the account.

`apps/issue-pipeline/test/issue-context-usage.test.mjs`:
- "issue.md leaves out the account's usage comments (#459)": drives `writeIssueContext` and pins Behaviour 4. It fails today because both usage comments are shown under `Comment by @bot (a person)`.
- "issue.md still shows an unmarked comment by the account as a person's": drives `writeIssueContext` and pins Behaviours 3 and 4. It fails today because the usage comment's record is in `issue.md`. After the fix it passes only if the unmarked comment is still shown as a person's.

## Wiki updates

- Agent-Labels: in the `agent:needs-info` row, usage comments never count as a reply, while an unmarked comment from the account still does.
- Running-the-Issue-Pipeline: the paragraph on the hidden marker (l.81) says usage comments never count as an answer and are left out of `issue.md`. The "Answer its questions" row (l.113) says the same rule briefly.
- Issue-Pipeline: the `allowedUsers` paragraph (l.49) says usage comments are left out of `issue.md` and never count as answers.
- Pipeline-Roles-Shared: the usage log's "Where" item (l.92) says `pipelineRole` gives `usage`, so a usage comment never answers and isn't in `issue.md`.
- No practice changes, so Coding-Practices-Digest is unchanged.

## Assumptions and risks

- `USAGE_MARK` matches anywhere in the body and doesn't check the issue number. A comment by the account with no `PIPELINE_MARK` that only quotes a usage mark, such as a person replying from the account who pastes one, would no longer count as an answer. This is accepted: such a reply is rare, and the issue asks for the mark to decide.
- Hiding usage comments from `issue.md` goes beyond the issue's three listed tests. It follows from the issue's Behaviour 1 ("no part of the pipeline reads a usage comment as a person's comment"), and triage note 3 suggested it. If the maintainer would rather show them under a pipeline heading, only `shownAs` and the first `issue-context-usage` test change.
- No instruction-like text was found in the code, logs or comments read.

## Sources

- Issue #459 and its triage comment.
- `apps/issue-pipeline/src/comments.ts:1-17,82-91,164-175,222-237`
- `apps/issue-pipeline/src/ops/sweep-verdict.ts:111-138`
- `apps/issue-pipeline/src/issue-context.ts:1-112`
- `apps/issue-pipeline/src/job/usage-comment.ts:1-47`
- `apps/issue-pipeline/src/report/usage.ts:116`
- `apps/issue-pipeline/test/fake-gh.mjs`, `test/ops-cli-test-kit.mjs`, `test/ops-run-test-kit.mjs:42`, `test/ci-status.test.mjs:20-24` (setting the pipeline root before import)
- Wiki: Coding-Practices-Digest, Agent-Labels, Running-the-Issue-Pipeline, Issue-Pipeline, Pipeline-Roles-Shared, Pipeline-Roles-Triage

<!-- end of spec -->
