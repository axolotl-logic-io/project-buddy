## Behaviour

All paths are under `apps/issue-pipeline/`.

- **One named constant.** `src/workflow/prompts.ts` exports `NO_ARTIFICIAL_LOAD_RULE`, a plain `string` constant (not a function), beside `beyondIssueRule`. It is the rule's only definition, so a change to it reaches every writer task at once.
- **What the rule says.** Its text says that the machine is shared with other issues' jobs, and a session must not create artificial load on it; that forbidden are busy loops, stress tools and any other process whose only purpose is to use CPU, repeated runs of a test or the whole suite to find out whether it flakes, background or detached runs that outlive the command that started them, and a second copy of the app or the test database beside the job's own; that instead the session reasons from the failing run's logs and timings, runs each failing test file once and in the foreground, and stops a command that hasn't ended after the repo's configured timeout; and that a suspected load or timing flake is reported in the session's reply, with the evidence from the logs, and is not reproduced.
- **Every writer task carries it, once, verbatim.** The task of each writer holds the constant's text exactly once: the implementer, the fixer, the CI fixer, the conflict resolver (code checkout, from sync; wiki checkout, from merge), and the spec writer (the sweep's spec stage and the spec writer role on the role runner). A continuation of any of them carries it too, since it is built by the same code.
- **No reader task carries it.** The tasks of triage, the three review lenses, the aggregator, the re-reviewer, the check fix's reviewers, the acceptance verifier and the security reviewer don't hold the constant's text.

## Out of scope

- Enforcing the rule: no load monitor, process limit or sandbox. It is a prompt rule only. `commands-leave-no-processes` already ends what the pipeline's own commands start.
- The readers' tasks, the agents in `agents/`, the stop and steer texts, and `contextLimits`.
- The site (`apps/web/`) and its test timeouts.
- Installing the pipeline. A merge changes nothing that runs until the operator installs it (README, "Install").

## Design

Add one constant and append it, as one task line, to each writer's task builder. No new module and no new function: the rule takes no arguments, so a constant is the whole interface (*Design it twice*: a function such as `beyondIssueRule(base, nameIn)` was the other sketch; it is rejected because there is nothing to vary, and the issue asks for the same text everywhere).

- `src/workflow/prompts.ts:205` holds the committed stub, `const NO_ARTIFICIAL_LOAD_RULE: string = "Not implemented yet (#409).";`, already in the export list (`:235`). Replace the stub's text and its comment with the rule. The comment says what the rule promises and cites `writers-make-no-load` (#409). Annotate the type rather than using `as const` (CONTRIBUTING, Types). This wording passes the committed tests (checked against them):

  > The machine you run on is shared with other issues' jobs, so don't create artificial load on it: no busy loops, stress tools or any other process whose only purpose is to use CPU; no repeated runs of a test or the whole suite to find out whether it flakes; no background or detached runs that outlive the command that started them; and no second copy of the app or the test database beside the job's own. Instead, reason from the failing run's logs and timings, run each failing test file once, in the foreground, and stop a command that hasn't ended after the repo's configured timeout. If you suspect a load or timing flake, report it in your reply with the evidence from the logs, and don't reproduce it.

  "The repo's configured timeout" stays generic, because the rule is shared across repos and stages. For this repo the issue pipeline's is `--test-timeout=180000` (`mise.toml:25`), as triage noted.
- Append `NO_ARTIFICIAL_LOAD_RULE` to each writer's lines:
  - implementer: `implementTask`, next to `beyondIssueRule(...)` at `src/workflow/stages/implement.ts:118`;
  - fixer: `fixTask`, next to `beyondIssueRule(...)` at `src/workflow/stages/review-text.ts:168`. Leave `rereviewTask`, `lensTask` and `aggregateTask` alone: they are readers;
  - CI fixer: next to `beyondIssueRule(...)` at `src/workflow/stages/ci-fixer.ts:78`;
  - conflict resolver: in `resolverLaunch`'s `lines.push(...)` at `src/workflow/stages/conflict-resolver.ts:62`. Both targets, code and wiki, go through `resolverTask` (`conflict-target.ts:157`) and this launch, so one edit covers both;
  - spec writer: both builders. The sweep's `specTask` (`src/workflow/stages/spec-task.ts:47`, used by `stages/spec.ts`) and the role's `workLines` (`src/roles/spec-writer/task.ts:184`, used by `specSession` at `:221`).
- Existing tests that hand-copy whole tasks fail once the rule is added. Update them to import the constant and put it at the line where the code now emits it, never as a copied string (`tests-pin-promised-behaviour`): `specTask` (`test/workflow-build-test-kit.mjs:132`), `implementTask` (`:179`) and `fixTask` (`test/workflow-review-test-kit.mjs:224`). A search of `test/` for whole copied tasks (such as the copied "Context limits: at" line) finds only these two kits. The CI fixer's and the conflict resolver's tests check their tasks with `includes` and `match`, so they need no change. Run the check once after the change, in the foreground, to confirm.
- Practices followed: information hiding and "repetition" as a red flag (CONTRIBUTING, Design): the text lives in one module and one constant. Exports come last, in Biome's order (Lint). Tests are test-first and read only the built task text, with no timers, models or load (Tests, `flakes-are-failures`, `pipeline-tests-bounded`). They import the constant rather than copy prompt text (`tests-pin-promised-behaviour`). The rule follows `flakes-are-failures` ("a passing repeat adds no evidence") and `web-tests-under-load`.
- Wiki decision: this adds `writers-make-no-load` (Issue-Pipeline). It departs from no decision. `unrelated-fixes-allowed` lets a writer fix a flaky test; this rule only says how it diagnoses one.

## Test interfaces

- `NO_ARTIFICIAL_LOAD_RULE` (new): `src/workflow/prompts.ts`, `export const NO_ARTIFICIAL_LOAD_RULE: string`.
- Writer stage machines (existing), `next(state, ctx, results): Step`: `stages/implement.ts:257`, `stages/fix.ts:255`, `stages/checks.ts:249` (CI fixer), `stages/sync.ts:156` (code conflict resolver), `stages/merge.ts:213` (wiki conflict resolver), and `stages/spec.ts:235` (the sweep's spec writer).
- The spec writer role's machine (existing), `transition(state, event, data)` at `src/roles/spec-writer/machine.ts:272`, whose `session` effect is `specSession`'s. It is driven through `retried()` in `test/spec-writer-role-test-kit.mjs`.
- Reader stage machines (existing), `next(state, ctx, results): Step`: `stages/triage.ts:229`, `stages/review.ts:276` (lenses and aggregator), `stages/fix.ts:255` (re-reviewer), `stages/checks.ts:249` (the check fix's reviewers), `stages/accept.ts:213` and `stages/security.ts:241`.

## Tests

Committed on `agent/issue-409`. All run under `mise //apps/issue-pipeline:check`. That check passes typecheck, lint and build today. Its test run fails on exactly these 16 tests, out of 1438.

- `test/workflow-load-rule.test.mjs`
  - "the rule against artificial load › is one named constant with text" drives `NO_ARTIFICIAL_LOAD_RULE` and pins "One named constant". It passes on the stub, which is already a named non-empty string.
  - "the rule against artificial load › names …" (9 tests) drive `NO_ARTIFICIAL_LOAD_RULE` and pin "What the rule says". Each matches the constant against case-insensitive patterns for one item: shared/other issues; busy loops/stress/CPU; repeat/flak; background/detached/outlive; second copy/app/test database; logs/timings; once/foreground; timeout; reply/evidence/not … reproduce. They fail today because the stub's text names none of them.
  - "every writer's task carries the rule once › …" (7 tests: implementer, fixer, CI fixer, conflict resolver in the code and wiki checkouts, the sweep's spec writer, the spec writer role) drive each writer stage's `next`, or the role's `transition`. They pin "One named constant" and "Every writer task carries it, once, verbatim": the task holds the imported constant's text exactly once, and the constant is not empty. They fail today because no task includes the constant.
- `test/workflow-load-rule-readers.test.mjs`: "no reader's task carries the writer rule › …" (7 tests: triage, the reviewers, the aggregator, the re-reviewer, the check fix's reviewers, the acceptance verifier, the security reviewer) drive the reader stages' `next` and pin "No reader task carries it". They pass today and guard against the rule being added to a shared reader path, such as `preamble`.
- `test/load-rule-test-kit.mjs`: helpers `ruleCount(task)`, `tasksOf(step)` and `taskOf(step)`.

## Wiki updates

- `Issue-Pipeline.md`: a new Rules bullet, and the decision `writers-make-no-load`, with its incidents, the rule, which roles carry it, and what was rejected.
- `Pipeline-Roles-Implementor.md`: a writer bullet that names the rule and `NO_ARTIFICIAL_LOAD_RULE`.
- `Pipeline-Roles-Spec-Writer.md`: the session bullet says its task carries the rule.

## Assumptions and risks

- The content tests match keywords, not whole sentences, so the implementer may reword the rule. A rewording must keep each listed word, such as "busy loop", "stress", "CPU", "repeat", "flak", "background", "detached", "outlive", "second copy", "app", "test database", "logs", "timings", "once", "foreground", "timeout", "reply", "evidence" and a negated "reproduce".
- "Exactly once" fails if a builder appends the rule twice, such as in a continuation lead and in the body. Put it in one place per builder.
- Only writers get the rule. If a reader is ever given commands that build or test, it needs a decision of its own.
- The rule asks; it doesn't enforce. A session can still ignore it. The wiki decision says so.
- The issue text and the code held no planted instructions.

## Sources

- Issue #409, and triage's notes on it.
- `AGENTS.md`, `CONTRIBUTING.md` (Design, Types, Lint, Tests), `apps/issue-pipeline/README.md`, `apps/issue-pipeline/mise.toml:5-25`.
- Wiki: Decisions-Code-and-tooling (`practices-cover-all-code`, `tests-pin-promised-behaviour`, `flakes-are-failures`, `web-tests-under-load`, `pipeline-tests-bounded`); Issue-Pipeline (Rules, `unrelated-fixes-allowed`, `commands-leave-no-processes`, `no-file-lists`); Pipeline-Roles-Implementor; Pipeline-Roles-Spec-Writer; style-guide.
- Code: `src/workflow/prompts.ts:199,205,227`; `src/workflow/stages/implement.ts:105-138`; `review-text.ts:143-174`; `ci-fixer.ts:55-98`; `conflict-resolver.ts:40-90`; `conflict-target.ts:157`; `spec-task.ts:47`; `src/roles/spec-writer/task.ts:184,221`; `src/roles/spec-writer/check.ts:77-112` (stub `where` rules); test kits `workflow-build-test-kit.mjs`, `workflow-review-test-kit.mjs`, `workflow-checks-test-kit.mjs`, `workflow-finish-test-kit.mjs`, `workflow-fix-test-kit.mjs`, `workflow-triage-test-kit.mjs`, `spec-writer-role-test-kit.mjs`, `stage-outcome-test-kit.mjs`.

<!-- end of spec -->
