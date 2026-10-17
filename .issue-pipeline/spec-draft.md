## Behaviour

1. **Transport errors are transient.** `isTransientSessionError(text)` (new, `src/workflow/stages/rate-limit.ts`) returns true when `isRateLimitError(text)` does, and also for a transport error in any letter case: a connection reset or refusal (`connection reset`, `connection refused`), a timeout reading from the provider (`timed out reading`, `timeout reading`), `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EAI_AGAIN` or `socket hang up`. These count alone or inside a provider's `api_error`, such as `{"type":"error","error":{"type":"api_error","message":"read tcp 10.0.0.5:51234->1.2.3.4:443: read: connection reset by peer"}}`.
2. **Other errors are not transient.** `isTransientSessionError` returns false for `null`, `""`, a bare `api_error`, an `api_error` that names no transport failure (`Internal server error`), the pipeline's own session timeout (`the session timed out`), other timeouts that aren't reads (`timed out waiting for the clone lock`), and a "1429" in a test count. `isRateLimitError` stays exported and keeps its current answers.
3. **Stages defer on transport errors.** A session that fails with a transport error defers its issue exactly as a rate limit does today (`rate-limit-defers`). The issue is released at its stage with no `stop` request and no stop label, its attempt counts are those it began the stage with, and the sweep summary's item has outcome `rate-limited`. This covers every session role: triage, spec writer (which defers without using its retry), implementer, reviewers, fixer, re-reviewer, CI fixer, check-fix reviewer, conflict resolver (which defers once the rebase was aborted), acceptance verifier and security reviewer. Because the stage job's `job.json` then records `rateLimited: true` (`rateLimitedRun`), the orchestrator applies the same backoff and cap (`rateLimitBackoffMinutes`, doubling up to 30 minutes).
4. **The deferral log line.** A deferral's event-log line, for a rate limit or a transport error, reads `deferred: <reason> on a transient provider error; will retry next sweep`. Before, it read `… on a rate limit; …`.
5. **The role runner.** On the role runner (`src/job/runner.ts`), a step that fails with a transport error ends `{ kind: "held", rateLimited: true }` and saves the state it last saved, as a rate limit does.
6. **Other `api_error`s still stop.** A session that fails with an `api_error` naming no transport failure still stops its issue with the stage's usual reason, such as `the implementer session failed`. The stop request's `detail` is the full, unredacted error.
7. **Network errors ignore case.** `isNetworkError` (`src/workflow/stages/network.ts`) matches its patterns in any letter case, so `read: connection reset by peer` and `connection timed out` are network errors.
8. **Posted text hides IP addresses.** Every text argument the pipeline gives gh to post (`body=…`, `--body`, `--title`, through `redactGhArgs`) shows each IP address as `[redacted]`. That covers IPv4 `a.b.c.d`, with or without `:port`, bare IPv6 (`2001:db8::1`, `fe80::1`, a full 8-group address) and bracketed IPv6 with a port (`[2001:db8::1]:443`); the port goes with the address. Times (`01:02:03`, `01:02Z`, ISO times such as `2026-10-17T13:52:55.123Z`), SHAs and versions such as `v1.2.3` are left as they are. Local paths are still shown by variable, as before.
9. **Stop comments.** A `stop` op whose reason and detail name `[2001:db8::1]:443` and `192.168.1.10:51234` posts a coordinator comment and a state comment that name neither address. Each address shows as `[redacted]`, in the comment's `Reason:` line and its detail, and in the saved `stopReason`.
10. **Local logs keep the full text.** Only what is given to gh is redacted. The ops requests, the issue's event log in memory, job logs and the orchestrator's log keep the full text (item 6 pins this for the stop request).

## Out of scope

- Retrying a session inside its stage, or any new retry logic: a transport error defers to the next sweep or job, as a rate limit does.
- Renaming the outcome `rate-limited`, `job.json`'s `rateLimited`, `RATE_LIMITED`, `rateLimitStep` or the decision `rate-limit-defers`. They now cover both kinds of transient error, as the wiki says.
- Changing which ops defer on a network error (`opFailedStep`): only its classifier's case changes.
- Redacting `-f title=…` (the split op's sub-issue titles), endpoints or other non-text gh arguments. These aren't redacted for local paths either today.
- Redacting local logs (`job.log`, `orchestrator.log`, `context.jsonl`, the run folder).
- IPv4-mapped IPv6 forms (`::ffff:1.2.3.4`) beyond what the two patterns give.

## Design

**Classifier** (`src/workflow/stages/rate-limit.ts`). Add a top-level, named regex with the `iu` flags beside `RATE_LIMIT` (rate-limit.ts:16-17), for example:

```ts
const TRANSPORT_ERROR: RegExp =
  /\bconnection (?:reset|refused)\b|\b(?:timed out|timeout) (?:while )?reading\b|\bECONNRESET\b|\bECONNREFUSED\b|\bETIMEDOUT\b|\bEAI_AGAIN\b|\bsocket hang up\b/iu;
```

Then replace the stub `isTransientSessionError` (rate-limit.ts:31-38) with `isRateLimitError(text) || TRANSPORT_ERROR.test(text)`, null-safe. No `api_error` handling of its own is needed: an `api_error` counts only when its message matches one of these patterns, so a bare one never does. Update the module's header comment (rate-limit.ts:1-5) to say what counts.

- `rateLimitedIn` (rate-limit.ts:41-46) and `sessionFailedStep` (rate-limit.ts:65-75) call `isTransientSessionError` instead of `isRateLimitError`. That covers triage.ts:175, implement.ts:229, fix.ts:188, accept.ts:168, security.ts:177, ci-fix.ts:53 and 185, review.ts:203 and rereview.ts:241 without editing those stages.
- `stages/spec.ts:206` and `stages/sync-conflict.ts:190` call `isTransientSessionError` in place of `isRateLimitError`, and change their imports (spec.ts:17, sync-conflict.ts:25).
- `rateLimitStep`'s log line (rate-limit.ts:57) becomes `deferred: ${reason} on a transient provider error; will retry next sweep`. Fix the comments that say "on a rate limit" where they now mean both kinds (rate-limit.ts:31, 39-43, 84, and the wording in `src/job/status.ts:6` and `src/orchestrator/rate-limit-backoff.ts:48` if you touch them).
- `src/job/runner.ts:75-83` `failedEnd`: test `isTransientSessionError(error)` first, giving `{ kind: "held", rateLimited: true }`, then `isNetworkError` (held), then `STEP_FAILED`. Import it at runner.ts:27 in place of `isRateLimitError`, and update the header comment at runner.ts:5-6. `failedEnd` sees op failures as well as session failures (runner.ts:113, 140, 228, 255). So on the role runner an op whose error names a transport failure, such as git's `Connection reset by peer`, now also ends held with `rateLimited`, which starts the backoff. The wiki now says so. Keeping one `failedEnd(error)` is simpler than threading the effect's kind through four callers, and a reset connection is as likely to hit the next job either way.
- `isRateLimitError` stays exported (rate-limit.ts:24; test/rate-limit.test.mjs imports it).

**Network classifier** (`src/workflow/stages/network.ts:9-10`). Change `NETWORK_ERROR`'s flags from `u` to `iu`, and say "in any letter case" in its comment.

**Redaction.** Add a new pure module, `src/redact-addresses.ts`, exporting `redactAddresses(text: string): string`. It replaces IPv6 and IPv4 addresses with `[redacted]`. `redactGhArgs` (src/github.ts:41-50) applies it after `redactLocalPaths`, as `redactAddresses(redactLocalPaths(arg))`, to the same arguments. Update github.ts's header comment (lines 1-3) and the comment at line 41 to say posted text loses addresses too. One way to write it, which passes the committed tests:

```ts
const IPV6_BRACKETED: RegExp = /\[[0-9a-f:.]*:[0-9a-f:.]*\](?::\d{1,5})?/giu;
const IPV6: RegExp = /(?<![\w:.])(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?![\w:])/giu;
const IPV4: RegExp = /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?(?![\w]|\.\d)/gu;
```

Each IPv6 candidate is replaced only if it has a hex digit, at least two colons, and also a hex letter, a `::` or 8 groups. That rule keeps `01:02:03`, `01:02Z`, ISO times and SHAs. Replace IPv6 first, bracketed then bare, and IPv4 last, so `[2001:db8::1]:443` becomes `[redacted]`, not `[[redacted]]:443`.

Every gh write goes through `run("gh", redactGhArgs(args), …)` (github.ts:76-77). Reads aren't redacted and post nothing. So stop comments (ops/stop.ts through comments.ts `body=`), state comments with `stopReason` and `log` (state.ts:115), PR bodies and titles (ops/pr.ts:118, 178, 224) and sub-issue bodies (ops/split.ts) are all covered in one place. The local event log, ops requests and job logs are untouched (Behaviour 10).

**Design it twice** (CONTRIBUTING.md, Design), for the redaction interface:
- (A) Put address redaction inside `redactLocalPaths` (pipeline-root.ts:32). Rejected: that module knows this machine's layout (ROOT, HOME) and is a Node-API boundary module (`best-practice-over-lint`). Addresses are not paths, and its name would no longer say what it does.
- (B) A pure `redactAddresses` module that `redactGhArgs` composes with `redactLocalPaths`. Chosen. The decision of what posted text hides stays in `redactGhArgs`, which alone decides which arguments are posted text, and the address rule is one small pure module that needs no lint exception.

For the classifier, the alternatives were:
- Fold the transport pattern into `RATE_LIMIT`. Rejected: it changes `isRateLimitError`'s promised answers, which the wiki documents.
- Check `isNetworkError` in `sessionFailedStep`. Rejected: that pattern is about gh and git (HTTP 50x, `api.github.com`), and `Connection timed out` would defer the pipeline's own timeouts.

**Practices followed.**
- CONTRIBUTING.md Design: information hiding, since error classification lives in one module (rate-limit.ts) and posted-text redaction in one place (`redactGhArgs`). Also deep modules, since the stages keep calling `sessionFailedStep` and `rateLimitedIn` unchanged, and pull complexity downward.
- Lint: regexes are top-level, named, with the `u` flag. Explicit types. Exports last. No `as`. Files under 300 lines, since rate-limit.ts is about 125 lines after the change.
- Tests: test-first; `tests-pin-promised-behaviour`, since stage results go through the workflow harness's summary, ops requests and released state, and GitHub effects through gh writes (`effects()`, `bodyOf`, `stateOf`); `pipeline-tests-bounded`, which the existing kits already follow.
- Wiki: decision `rate-limit-defers` (Issue-Pipeline) is extended, not departed from. Transport errors take the same path, and the page now says so.

## Test interfaces

Each interface below lists, in `interfaces`, the full text of every Behaviour item its tests check, quoted verbatim.

- `isTransientSessionError(text: string | null): boolean`: new, in `apps/issue-pipeline/src/workflow/stages/rate-limit.ts` (stub committed). Drives **Transport errors are transient.** and **Other errors are not transient.**
- `isNetworkError(text: string | null): boolean`: existing, `apps/issue-pipeline/src/workflow/stages/network.ts:13`, changed. Drives **Network errors ignore case.**
- The workflow sweep's stage result, through `runWorkflow` (test/workflow-harness.mjs) and the `issueRun` kit (test/rate-limit-test-kit.mjs): existing, `apps/issue-pipeline/src/workflow.js` and stages, changed. Drives **Stages defer on transport errors.**, **The deferral log line.**, **Other `api_error`s still stop.** and **Local logs keep the full text.**
- The role runner, `runMachine(…)`/`runLinear(…)`: existing, `apps/issue-pipeline/src/job/runner.ts:278`, changed. Driven through test/runner-test-kit.mjs `uninterrupted`, for **The role runner.**
- `redactGhArgs(args: readonly string[]): string[]`: existing, `apps/issue-pipeline/src/github.ts:42`, changed. Drives **Posted text hides IP addresses.**
- The ops CLI `stop` op (`{ op: "stop", number, code, reason, detail, nextStep, state }`): existing, `apps/issue-pipeline/src/ops/stop.ts`, changed through redaction. Drives **Stop comments.**

## Tests

Committed on `agent/issue-385`. All run under `mise //apps/issue-pipeline:check`. Typecheck and lint pass. The 13 tests listed as failing below fail today, and every other test passes.

- `test/rate-limit.test.mjs` (drives `isTransientSessionError`):
  - "rate limits, overloads and transport errors in any case are transient" pins Behaviour 1. It fails today because the stub throws "not implemented".
  - "other api errors, timeouts that aren't reads, and no error, are not transient" pins Behaviour 2. It fails today because the stub throws.
  - The existing `isRateLimitError` tests still pass, which pins Behaviour 2's last sentence.
- `test/network.test.mjs`, "network failures are network errors" (drives `isNetworkError`), adds `read: connection reset by peer` and `connection timed out`, lower case. It pins Behaviour 7 and fails today because `NETWORK_ERROR` is case-sensitive.
- `test/session-transport-rate-limit.test.mjs` (new; drives the workflow stage result through `issueRun`):
  - "an implementer that fails with a connection reset in an api_error …" and "… with ECONNRESET …" pin Behaviour 3 (released at implement, `continuations` `{}`, no stop, outcome `rate-limited`) and Behaviour 4 (the log line). Both fail today: the implementer stops.
  - "a reviewer whose socket hangs up …" pins Behaviour 3 through `rateLimitedIn`. It fails today: the reviewer stops.
  - "triage that times out reading from the provider …" pins Behaviour 3 (no triage counted). It fails today: triage stops.
  - "a spec writer that fails with ETIMEDOUT defers without its retry" pins Behaviour 3 (spec.ts). It fails today: the spec writer retries, and the harness's replies run out.
  - "a conflict resolver whose connection is refused aborts the rebase …" pins Behaviour 3 (sync-conflict.ts, mixed case). It fails today: it stops.
  - "an implementer that fails with another api_error still stops, with the full error in the stop request" pins Behaviour 6 and 10. It passes today and guards against matching every `api_error`.
- `test/workflow-rate-limit-build.test.mjs`, "a fixer that hits the rate limit …", now expects the new log line through `RATE_LIMIT_LINE` in `test/rate-limit-test-kit.mjs`. It pins Behaviour 4 and fails today on the old wording. The kit also gained `CONNECTION_RESET`, `SOCKET_RESET` and `SERVER_ERROR`.
- `test/job-runner.test.mjs`, "a session that fails with a transport error ends held as a rate limit does" (drives the role runner), pins Behaviour 5. It fails today: it ends `{ kind: "stopped", code: "error" }`.
- `test/helpers.test.mjs`, "text posted to GitHub hides IP addresses, with or without a port" (drives `redactGhArgs`), pins Behaviour 8. It checks IPv4 with a port, bracketed IPv6 with a port, bare and full IPv6, and that times, ISO times, a SHA and a version are kept. It fails today: nothing is redacted.
- `test/ops-stop-redaction.test.mjs` (new; drives the `stop` op through the ops CLI, checked through gh writes) pins Behaviour 9. It checks the coordinator comment names neither `2001:db8::1` nor `192.168.1.10`, has `Reason: … [redacted] …` and the detail with `[redacted]`, and the state comment's `stopReason` is redacted. It fails today: both addresses are posted.

## Wiki updates

- **Running-the-Issue-Pipeline**, section "Network errors and the pipeline's own pushes":
  - `isNetworkError` now ignores case.
  - Transport errors are added to what defers, and other `api_error`s and the session timeout still stop.
  - The log line now reads `on a transient provider error`.
  - On the role runner an op's transport error ends rate-limited too.
  - Posted text shows IP addresses as `[redacted]`, and local logs keep them.
  - The **Provider rate limit** orchestrator bullet names transport errors.
- **Issue-Pipeline**: the summary bullet (line 20) and decision `rate-limit-defers` gain the transport-error extension, with #369's case, the log wording and the redaction.

## Assumptions and risks

- The exact text pi gives for a reset provider connection is assumed to contain `connection reset` (the issue quotes `read tcp …: read: connection reset by peer`) or a Node error code. A transport failure worded otherwise, such as `fetch failed` or `Connection error.`, still stops, and adding it later is a one-line change to the pattern.
- A transport error that recurs on every attempt would now defer forever, with the orchestrator's backoff capped at 30 minutes, instead of stopping. The same is already true of a long rate limit (`rate-limit-defers`).
- On the role runner, an op's `connection reset`/`refused` now ends rate-limited and starts the backoff (Design). This is a small widening, documented on the wiki.
- Redaction also turns a dotted four-number string, such as a four-part version `1.2.3.4`, and an all-hex colon string, such as a MAC address `ab:cd:ef:01:02:03`, into `[redacted]`. That is acceptable for posted text. The state comment's `log` and `stopReason` are redacted on GitHub, so a later claim reads the redacted text. Nothing parses addresses from them.
- The log line's wording changes (Behaviour 4). Anything an operator greps for `on a rate limit` must now use `on a transient provider error`.
- No instructions were found in code, wiki or issue text that tried to change this task.

## Sources

- Issue #385 and its triage comment (runs/axolotl-logic__project-buddy/issue-385/issue.md).
- `AGENTS.md`, `CONTRIBUTING.md` (Design, Types, Lint, Tests), wiki **Decisions-Code-and-tooling** (`practices-cover-all-code`, `best-practice-over-lint`, `tests-pin-promised-behaviour`, `pipeline-tests-bounded`).
- Wiki **Issue-Pipeline** (`rate-limit-defers`, line 20) and **Running-the-Issue-Pipeline** (lines 146-148, 274).
- Code:
  - `apps/issue-pipeline/src/workflow/stages/rate-limit.ts:1-121`, `network.ts:9-38`, `spec.ts:17,206`, `sync-conflict.ts:25,190`, and `triage.ts:175`, `implement.ts:229`, `fix.ts:188`, `accept.ts:168`, `security.ts:177`, `ci-fix.ts:53,185`, `review.ts:203`, `rereview.ts:241`.
  - `src/job/runner.ts:1-13,26-27,75-83,113,140,228,255`.
  - `src/github.ts:1-3,41-50,76-77`, `src/pipeline-root.ts:29-34`, `src/ops/stop.ts`, `src/state.ts:115`, `src/ops/pr.ts:118,178,224`, `src/ops/split.ts:70-82`.
- Tests and kits: `test/rate-limit-test-kit.mjs`, `test/workflow-rate-limit-build.test.mjs`, `test/workflow-rate-limit-finish.test.mjs`, `test/job-runner.test.mjs`, `test/ops-issue-ops.test.mjs`, `test/ops-cli-test-kit.mjs`, `test/gh-effects.mjs`, `test/helpers.test.mjs`.

<!-- end of spec -->
