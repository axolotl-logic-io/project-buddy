## Behaviour

Paths are under `apps/issue-pipeline/`.

1. **Layout.** `src/roles/implementor/` holds the implementor's machine. Each entry's states are their own module: `start.ts` (the shared `start` state) and `implement.ts` (the `implement` entry). `machine.ts` only spreads those modules (and the end states) into `TABLE`, whose `entries` are `["start"]`. `checkTable(TABLE, LIMITS, data)` returns `[]`, with `LIMITS` `{ maxContinuations: 1 }`.
2. **Data.** `ImplData` has every field the Lifecycle lists for later parts as well: `continuations`, `fixRounds`, `conflictFixes`, `ciFixRounds`, `reply`, `findings` and `verifiedSha`, besides the spec writer's hand-off (`spec`, `specFile`, `plan`, `specTestsSha`, `wikiOnly`, `noTestsReason`, `pr`) and what the role hands on (`headSha`, `flows`, `implemented`).
3. **Machine.** `src/roles/implementor/implementor.ts` exports `IMPLEMENTOR_STAGES` (`["implement"]`) and `implementorMachine`: `limitsOf(cfg)` gives `{ maxContinuations: cfg.maxContinuations }`; it checkpoints `continuations`, `fixRounds`, `conflictFixes` and `ciFixRounds`, and hands off `headSha`, `flows`, `implemented`, `reply` and `findings`.
4. **Registered.** `registry.ts` registers every stage in `IMPLEMENTOR_STAGES` with `machineRole("implementor", implementorMachine, implementorChecks)` in one line. `roleOf("implement")` is the implementor (kind `machine`). `roleOf` of `open-pr`, `fix`, `sync` and `checks` stays undefined. `src/workflow/stages/implement.ts` and `open-pr.ts` are unchanged, so lanes run them as before.
5. **Start.** `start` is a check whose payload names the entry (`entry: "implement"`); its answer `implement` goes to `implement-work?`.
6. **Edges of the `implement` entry** (every op and check payload names the issue as `number`):
   - `implement-work?`:
     - `none` (the saved `wikiOnly` is true with a `noTestsReason`) → end `saved(review)`.
     - `built` (the job's checkout has a code change since `specTestsSha`, not counting `.issue-pipeline/spec-draft.md`) → `flows`.
     - `work` (anything else, including a missing or unreadable `specTestsSha`) → `setup`.
   - `setup` runs `commands.setup` in the job's checkout when it is set, and logs it. It answers `ok` even when the command fails (as `setUpAtClaim` does) → `implementer`.
   - `implementer` is the only session state. `replied` → `implementer-reply`, setting `data.reply` to `implReadingOf(reply)` (null when the reply doesn't read).
   - `implementer-reply` answers the reply's status:
     - `done` → `flows`.
     - `handoff` → `implementer` with `continuations` + 1 while `continuations` < `maxContinuations`; otherwise end `out-of-room`.
     - `blocked` → end `blocked`.
     - `bad` (no reading) → end `bad-reply`.
   - `flows` runs the `push` op and answers `code` or `none` from `flowsOf({ codeChanged, wikiAhead })`, with `{ headSha, flows }`. Both edges save `headSha` and `flows`, and `code` also sets `implemented: true`.
   - Ends:
     - `implemented` is `saved(review)` when `data.pr` is a number, else `saved(open-pr)`.
     - `wiki-only` is `saved(review)`.
     - `out-of-room` stops with code `too-large`, reason `outOfRoomReason("implementer", max)` and detail `Latest handoff: <handoffFile>\n\n<summary>`.
     - `blocked` stops with code `not-doable`, reason "the implementer could not do the issue as written", and the summary as detail.
     - `changed-nothing` stops with code `not-doable` and reason "the implementer changed nothing".
     - `bad-reply` stops with code `error`.
     - Every stop sends the op `stop` with payload `{ number, code, reason, detail }`.
   - No state sends `open-pr`, `start-pr` or `close-pr`, so the draft PR is left untouched.
7. **Session.** The `implementer` session has:
   - name `implement`, agent `issue-pipeline-writer`, model `models.implementer`;
   - `budgetRole` `implementer` and `tokenBudget` `sessionBudget(budgets, "implementer")`;
   - the role's `IMPL_SCHEMA` as its schema, and `attempt` `continuations + 1`.
   - Its task is today's implement task (`practicesNote`, the spec or plan, the steps, `beyondIssueRule`, `NO_ARTIFICIAL_LOAD_RULE`, `commitRulesOf("pipeline_commit", …)` with trailer `Pipeline-Agent: implementer`, `handoffRule` with `contextLimits` soft and hard), without `prTitle`/`prBody` and without the lane's wiki step. A continuation's task leads with `handoffLead(handoffFile)`.
8. **Reply.** The role's `IMPL_SCHEMA` (`src/roles/implementor/reply.ts`) is closed, with only `status` (`done` | `handoff` | `blocked`) and `summary`, both required. `implReadingOf(output)` returns `{ status, summary }`, ignoring other fields such as `testsAdded`, `prTitle` and `prBody` (and the job's hard-limit handoff reply), and null for anything without a known status and a string summary.
9. **Locate.** `locate(saved, context)` is pure and always starts at `start` with `entry: "implement"`.
   - `continuations` is `saved.checkpoints.continuations` when that is a number, else `continuationsOf(saved, "implement")`, which reads a number, `{ implement: n }`, or 0.
   - `fixRounds`, `conflictFixes` and `ciFixRounds` come from the checkpoints (0 when missing), and `maxContinuations` from `cfg`.
   - The hand-off fields come from the saved state, with `findings` `[]` and `verifiedSha` null when missing, and `reply` null.
10. **Stage job at `implement`** (`node src/job.ts --stage implement`):
    - `done` with a code change runs one session and one `push`, and sends no PR op. It ends `saved(review)` with `headSha`, `flows` and `implemented: true` saved and `pr` unchanged.
    - `done` with no code change ends `stopped(not-doable)`, and the stop op's reason is "the implementer changed nothing".
    - `blocked` ends `stopped(not-doable)` with its summary as the stop's detail, and pushes nothing.
    - A handoff runs one continuation, whose prompt starts from the handoff, and saves the `continuations` checkpoint as 1. A handoff past `maxContinuations` ends `stopped(too-large)` (`agent:stopped-too-large`).
    - An issue with no PR saved ends `saved(open-pr)`, so today's `open-pr` stage still opens one.
    - A state saved by today's implement stage (`continuations` 1 or `{ implement: 1 }`, phase `decide`) resumes with its count: its first handoff stops as too large.
    - A branch with a code change since `specTestsSha` runs no session and goes straight to the push. A branch at `specTestsSha`, or past it only by the spec draft's removal, runs the implementer.
    - A stale `implement` of a wiki-only issue saves at `review` with no session and no push.
11. **Isolation.** No module under `src/roles/implementor/` imports from `src/roles/triage/`, `src/roles/spec-writer/` or `src/roles/reviewer/`.

## Out of scope

- The `fix`, start sync and `checks` entries (#418, #419, #420), and their stages (`fix`, `sync`, `checks` stay on the sweep).
- Back to spec on `blocked` and `verify`'s re-run of the spec writer's tests (`roles-6-10-scope`): every `blocked` stops, and `flows` doesn't run the spec tests.
- `src/workflow/stages/implement.ts`, `open-pr.ts`, `flow-step.ts` and the shared `IMPL_SCHEMA` in `src/workflow/schemas.ts`: lanes keep them.
- The issue comments today's stage posts on a handoff and on `blocked` (the stop comment carries the summary; usage records show the continuation).
- Retrying a failed push once, as today's stage does (see risks).

## Design

Copy the spec writer's role shape (`src/roles/spec-writer/`), using the generic engine: `transitionOf` and `checkTable` (`src/roles/machine.ts:143`, `:245`), `machineWalk` (`src/roles/walk.ts:96`) and `machineRole`/`registerRole` (`src/roles/registry.ts:66`, `:95`).

- `locate.ts`: `ImplState`, `ImplEntry`, `ImplData` (stubbed with these fields) and `locate`, modelled on `src/roles/spec-writer/locate.ts:125` (`checkpointsOf`) and `:202`. Read the old count with `continuationsOf` (`src/workflow/stages/continuation.ts:31`) after a zod parse of `saved.continuations` (a number or a record of numbers), since `State` passes it through as `unknown` (`src/state.ts:26`). `phase` is ignored.
- `reply.ts`: the role's `IMPL_SCHEMA` and `implReadingOf` via `z.looseObject({ status: z.enum([...]), summary: z.string() })` (`zod at boundaries`).
- `task.ts`: port `sourceLine`/`workSource`/`unwrittenLead` and `implementTask`/`implementLaunch` (`src/workflow/stages/implement.ts:78-160`) to build from `ImplData`: drop the `prTitle`/`prBody` lines and `wikiStep`; `beyondIssueRule(base, "`summary`")`; reuse `practicesNote`, `specText`, `commitRulesOf`, `handoffRule`, `handoffLead`, `NO_ARTIFICIAL_LOAD_RULE` (`src/workflow/prompts.ts:98-226`) and `sessionBudget(budgets, "implementer")` (`src/workflow/budget.ts:21`). It returns a `SessionEffect`, as `specSession` does.
- `edges.ts` (applies), `ends.ts` (end states; `out-of-room` as `src/roles/spec-writer/ends.ts:33`), `start.ts`, `implement.ts` (the entry's states), `machine.ts` (`TABLE = { entries: ["start"], states: { ...START_STATES, ...IMPLEMENT_STATES, ...END_STATES } }`, `LIMITS`, `transition`), `implementor.ts` (`IMPLEMENTOR_STAGES`, `implementorMachine`).
- Routing on the reply needs the `implementer-reply` check because a session's outcome is always named `replied` (`src/job/run-usage.ts:84`), as the spec writer's `check-reply` does. A failed session the table doesn't list is the runner's (held on a transient or network error, otherwise stopped `error`, `src/job/runner.ts:75`).
- `checks.ts`: `implementorChecks(entry, effects, cfg)` with `start` (answers `payload.entry`), `implement-work?` (git in the job's checkout `entry.context.paths.worktree`: `git diff --name-only <specTestsSha> HEAD`, less the spec draft; any unreadable sha → `work`), `setup` (`shell` from `src/process.ts`, as `src/ops/claim.ts:93`), `implementer-reply` (answers `reply.status`, or `bad`) and `flows` (`effects.op({ kind: "op", op: "push", payload: { number } })`, then `flowsOf` from `src/workflow/flows.ts:18`). A failed push op fails the check with its error; the runner ends it.
- Stop codes: today's `blocked` and changed-nothing stops reach `not-doable` by matching their reason text (`src/stops.ts:149-152`); the new reason "the implementer changed nothing" wouldn't match, so the role names `code: "not-doable"` explicitly in both stops. The issue's "every `blocked` stops the issue, as today" is that label.
- **Locate goes straight to `flows` through `implement-work?`'s `built`**, not from `locate` itself: the saved `headSha` comes from `start-pr`, which pushes after the draft's removal commit (`src/roles/spec-writer/checks-git.ts`), so the saved state alone can't tell work done from no work. Locate stays pure (`every-role-resumes`, Pipeline-Roles-Shared), and "the entry's `…-work?` check skips a stage already done" (Pipeline-Roles-Implementor, Locate). The wiki now says so.
- `implementor.ts` lives inside `src/roles/implementor/`, so the isolation test covers it.

Practices followed (AGENTS.md, CONTRIBUTING.md, Decisions-Code-and-tooling): strict TS with no `as` or `!`, zod at the boundary (the reply and the old `continuations`), exhaustive switches on `ImplStatus`, Biome with no overrides, files under 300 lines and functions under 50 (hence one module per entry), deep modules with small interfaces (APOSD), tests that pin promised behaviour through public interfaces (`tests-pin-promised-behaviour`), bounded job tests through `runJob`'s bound (`pipeline-tests-bounded`), no flaky tests (`flakes-are-failures`).

Departure from the wiki: the Implementor page's test-plan row "No PR text" said a reply with `prTitle` or `prBody` is malformed; the issue says the reader ignores them, so the row now says that (a stale prompt or the job's hard-limit reply mustn't stop the issue).

## Test interfaces

- `TABLE`, `LIMITS`, `transition` — `src/roles/implementor/machine.ts` (new): Behaviour 1, 5, 6, 7.
- `implementorMachine`, `IMPLEMENTOR_STAGES` — `src/roles/implementor/implementor.ts` (new): Behaviour 3.
- `locate(saved, context)` — `src/roles/implementor/locate.ts` (new): Behaviour 2, 9.
- `IMPL_SCHEMA`, `implReadingOf(output)` — `src/roles/implementor/reply.ts` (new): Behaviour 8.
- `roleOf(stage)` — `src/roles/registry.ts:100` (changed: registers the implementor): Behaviour 4, 11.
- `node src/job.ts --config <c> --issue <n> --stage implement` — the stage job CLI (changed: runs the role): Behaviour 10.

Each interface's `behaviours` quotes every list item of those Behaviour entries, nested ones included.

## Tests

All committed on this branch; each fails today on missing behaviour (the stubs throw "not implemented", the table is empty, or the job runs the sweep and prints no role end). Kits: `test/implementor-role-test-kit.mjs`, `test/implementor-edge-fixtures.mjs`, `test/implementor-job-test-kit.mjs`.

- `test/roles-implementor-machine.test.mjs` (`TABLE`, `transition`, `implementorMachine`): every edge of `start` and `implement` (Behaviour 5, 6); every listed edge covered, only `implementer` is a session, no PR op, entries `["start"]` (1, 6); `checkTable` empty and `LIMITS` (1); the start check's entry and the issue in every payload (5, 6); a reply that doesn't read stops with `error` (6, 8); `limitsOf` (3); checkpoints and hand-off fields (3); the session and its task (7); a continuation's task (7). Fails: `locate` throws, and the stub table is empty.
- `test/roles-implementor-reply.test.mjs` (`IMPL_SCHEMA`, `implReadingOf`, `transition`): the closed two-field schema; each status reads; `testsAdded`/`prTitle`/`prBody` and the hard-limit reply still read; bad replies read null; the old reply routes as `done` (8). Fails: the stub schema is empty and the reader throws.
- `test/roles-implementor-resume.test.mjs` (`locate`, `transition`): always `start`; old counts as a number or record; the checkpoint wins; other counts and the limit; hand-off fields; an old state at its last continuation stops as too large (2, 9). Fails: `locate` throws.
- `test/roles-implementor-isolation.test.mjs` (`roleOf`, `IMPLEMENTOR_STAGES`, the source tree): no other-role imports among modules that include `machine.ts`, `start.ts` and `implement.ts` (11, 1); the entry modules exist and `machine.ts` imports them (1); the registry runs the implementor for `implement` only (4). Fails: `start.ts`/`implement.ts` don't exist, and `implement` isn't registered.
- `test/roles-implementor-job.test.mjs` (stage job CLI, fake pi, fake ops, local git origin): each case of Behaviour 10. Fails: `--stage implement` runs the sweep today, which prints no role end.

## Wiki updates

- `Pipeline-Roles-Implementor`: the role's `IMPL_SCHEMA` and reader marked built (#414); a "Built (#414)" paragraph on the machine layout, `locate`, `start` and the `built` result; the `implement` entry table gains `start`, `implementer-reply`, the `built` result, the stop codes and the `open-pr` end; test-plan rows for isolation, machine edges, no PR ops, no PR text (changed, see Design) and resuming an old state.
- `Issue-Pipeline` (`implementer-handoff`): how the role runs the implementer, its continuations and its ends in a stage job.

## Assumptions and risks

- Many existing job tests run `--stage implement` through the sweep with a reader's reply (`job-boundary`, `job-checkout*`, `job-context-limit`, `job-context-log`, `job-context-wrap-up`, `job-dropped`, `job-status`, `job-steer`, `pipeline-commit-access`/`-push`, `job-roles`, `job-args-stack`). Once `implement` runs the role they get the role's behaviour; the implementer must adapt their fixtures (an implementer reply, a `push` reply, config `maxContinuations` rather than the sweep reply's) and keep them green, without weakening what they pin.
- A crashed or deferred run whose pushed commits are only half the work goes to `review` through `built`; the deferred spec-test check at `flows` would catch it, and review does meanwhile.
- A failed push isn't retried once as today, and a git rejection stops as `error` rather than `push-rejected`.
- `implement-work?` treats any code change since `specTestsSha` as built, including a commit only a continuation's predecessor made before a crash.
- The `reply` hand-off writes the reading `{ status, summary }` into the issue's state.
- No instructions were found in code, wiki or logs that tried to change this task.

## Sources

- Issue #414 and its triage notes; handoff of the first spec session.
- Wiki: Pipeline-Roles-Implementor (Session reply schemas, Lifecycle, Locate, Entry `implement`, Requirements, Test plan), Pipeline-Roles-Shared (role machines, `every-role-resumes`), Pipeline-Roles (`roles-6-10-scope`), Issue-Pipeline (`implementer-handoff`), Decisions-Code-and-tooling.
- Repo: AGENTS.md, CONTRIBUTING.md; `src/roles/machine.ts`, `walk.ts`, `registry.ts`, `src/roles/spec-writer/{locate,machine,ends,checks}.ts`, `src/job/runner.ts`, `src/job/run-usage.ts`, `src/job/context-watch.ts`, `src/workflow/stages/{implement,continuation}.ts`, `src/workflow/{flows,prompts,budget,schemas}.ts`, `src/checkouts.ts` (`push`), `src/ops/pr.ts`, `src/ops/claim.ts`, `src/stops.ts`, `src/state.ts`; tests `job-test-kit.mjs`, `job-git-test-kit.mjs`, `fake-rpc-pi.mjs`, `workflow-stages-fixtures.mjs`, `role-context-fixtures.mjs`, `spec-writer-role-test-kit.mjs`, `roles-spec-writer-machine.test.mjs`, `job-role-stage.test.mjs`, `job-checkout.test.mjs`.

<!-- end of spec -->
