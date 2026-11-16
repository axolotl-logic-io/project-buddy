# Project Buddy CLI and API proposal

Provide a command-line interface (CLI) for people, scripts and external agents to trigger Project Buddy operations without navigating the site. The CLI uses an authenticated API over the site's existing domain modules and data layer. Both interfaces read and change the same quests, conversations, Tasks, Ideas, Progress and Quick Notes.

This proposal refines [API access requirements in issue 684](https://github.com/axolotl-logic-io/project-buddy/issues/684) for the current product. It specifies planned work, not available commands. `project-buddy` is the proposed executable name; confirm its distribution name before release. Implementation does not start the issue pipeline as part of this planning work.

## Scope

The first release supports discovery, quest starts, direct quest updates and conversation replies. It provides JSON Lines (JSONL) output by default, with one complete JSON object per line. Commands work unattended after an initial browser authorization.

Workflow triggers are ordinary domain operations composed by the caller. A script can start a quest, save a Quick Note or submit a conversation message. This release adds no workflow definition language, scheduler, webhook service or issue-pipeline control. The issue pipeline remains in the ecosystem repository.

Current behavior governs API parity: quests have one conversation, constructs run local commands, and the app makes no requests to AI model companies. Issue 684's references to adventures, Journal, interviews, activities, gold and standalone conversations need reconciliation before implementation; they do not introduce those retired features into this release. See [Local constructs](local-constructs.md), [Premade quests](premade-quests.md) and the [glossary](../GLOSSARY.md).

## Command structure

Use `project-buddy RESOURCE ACTION [arguments] [options]`: a top-level resource command with one level of action subcommands. Do not introduce paths such as `quest tasks add`. `login`, `logout` and `whoami` are root commands. Help is available at the root, resource and action levels.

```sh
project-buddy login
project-buddy quest list --status active
project-buddy quest start --from make --why "Build the first prototype"
project-buddy task add --quest QUEST_ID --text "Outline the prototype"
project-buddy note add --quest QUEST_ID --text-file ./handoff.txt
project-buddy conversation send --quest QUEST_ID --text "help"
```

`QUEST_ID` means an exact quest identifier returned by the API. A quest's ID selects its one conversation. Commands never pick a quest by an ambiguous name or a hidden current-quest setting. Task steps use their stable numbers within the selected quest; other records use their domain identifiers.

Accept flags before or after subcommands. Shared options are `--profile NAME`, `--timeout SECONDS` and `--request-id ID` for mutations. Profiles select a saved API origin and connection. `--text`, `--text-file PATH` and `--stdin` are mutually exclusive; stdin contains one UTF-8 text value, not a batch of commands. Missing input fails without prompting. No mutation asks an interactive question. No-argument invocation shows help and performs no operation.

### First release operation matrix

| Command | Behavior | Required connection permissions |
| --- | --- | --- |
| `login` | Authorize a connection; `--headless` uses device authorization. | User approval |
| `logout` | Revoke the selected connection and remove local credentials. | Current connection |
| `whoami` | Return user, connection, API origin and granted permissions; exclude credentials. | Valid connection |
| `connection list`, `connection revoke CONNECTION_ID` | Inspect or revoke authorizations owned by the acting user. | `connections:manage` |
| `quest list`, `quest get QUEST_ID` | Read accessible quests; get includes status revision and conversation ID. | `data:read` |
| `quest start --from dailies\|learn\|make\|do` | Use the same starting point and optional Why as the site; preserve Dailies reuse and assigned construct. | `data:read`, `data:write`, `replies:create` |
| `quest rename QUEST_ID --name TEXT` | Apply the site's quest-name validation. | `data:write` |
| `quest complete`, `quest abandon`, `quest restore` | Take a quest ID and `--revision`; apply the existing status transition. | `data:write` |
| `task list --quest QUEST_ID` | Return steps in saved order and the Tasks version. | `data:read` |
| `task add`, `task edit`, `task complete`, `task reopen`, `task move`, `task remove`, `task undo` | Take `--quest`; changes to existing steps also take `--version` and a stable step number. Undo takes a change version and expected current version. Preserve Tasks history and undo rules. | `data:write` |
| `idea list`, `idea add`, `idea edit`, `idea move`, `idea remove`, `idea to-tasks` | Take `--quest`; changes to existing entries use a revision. Moving to Tasks is atomic across both collections. | `data:read` for list; `data:write` otherwise |
| `note list`, `note add`, `note remove` | Take `--quest`; add enforces the site's Active-quest and Quick Note text rules. | `data:read` for list; `data:write` otherwise |
| `milestone list`, `milestone edit`, `milestone remove` | Take `--quest`; edits use a revision. New milestones continue through the construct's existing tool. | `data:read` for list; `data:write` otherwise |
| `construct list`, `construct get CONSTRUCT_ID` | Discover available definitions and public functional fields. | `data:read` |
| `spell list`, `spell get SPELL_ID` | Discover available spells and permitted functional fields. | `data:read` |
| `spell cast`, `spell stop` | Take `--quest` and a conversation revision; cast takes `--spell SPELL_ID`. Use the shared transition and snapshot rules. | `data:write` |
| `conversation get --quest QUEST_ID` | Read saved user-visible messages, active spell and reply state. | `data:read` |
| `conversation send --quest QUEST_ID` | Submit text through the existing harness; return the durable operation and reply outcome. | `data:read`, `replies:create`; `data:write` for permitted side effects |
| `reply get REPLY_ID`, `reply cancel REPLY_ID` | Discover the saved outcome or request cancellation in an accessible quest. | `data:read` for get; `replies:create` for cancel |
| `operation get REQUEST_ID` | Recover the selected connection's request outcome after a timeout or lost response. | Valid connection plus current access to affected data |

Every list command supports `--limit` and `--cursor`. `--all` follows pages and emits records as they arrive. Preserve domain ordering: Tasks and Ideas use saved order; messages use conversation order. Other lists document a stable sort with an ID tie-breaker. Cursors are opaque and preserve filters and sort order.

Commands that read several resources require all applicable permissions. A mutation's response may return its own affected record without granting collection reads. Permissions never grant access beyond the acting user's current rights.

### Deferred and site-only operations

| Area | First release decision |
| --- | --- |
| Quest invitations and membership changes | Deferred; CLI access to already accepted shared quests is included. Pending invitations open no quest data. |
| Construct and spell creation, copying, editing and Graveyard actions | Deferred; preserve private definitions and existing snapshots. |
| Quest-status proposal approval and decline | Deferred; direct status commands remain available and never count as approval of a saved proposal. |
| Conversation reset and resend | Deferred; retries recover the same request rather than create a replacement conversation or message. |
| Saved images and construct artwork | Deferred API delivery; user-visible messages may include opaque asset references, never private storage URLs or credentials. |
| Account creation, name/settings, consent and connection management UI | Site-only initially; connection inspection/revocation also has CLI commands. |
| Check-ins, purchases, gold, Marketplace and standalone conversations | Outside current product scope; no commands or new access to inert storage. |

## Shared domain and data architecture

Create `apps/cli` as an npm workspace with an executable entry point, local profile/credential handling, argument parsing, an HTTP client and JSONL serialization. It receives no database credentials and imports no Next.js, Drizzle or site Server Actions. Keep API schemas in a small shared workspace, adding `packages/*` to root workspaces when needed. Share only validated wire contracts and domain primitives that both consumers actually need.

Add versioned routes under `apps/web/src/app/api/v1/`. Route handlers validate external inputs with zod, resolve the connection's acting user and permissions, and invoke shared domain operations. Do not call rendered pages, automate forms or depend on private Server Action transport. Resource routes map to the operation matrix; command nesting does not constrain HTTP paths. Publish method, path, schema, permissions, ordering and error cases for every operation before implementation of its CLI command.

Reuse these existing boundaries:

- `quests/store.ts`, `quests/quest-status-store.ts` and `conversations/start-quest.ts` for quest discovery, starts and status changes.
- `tasks/tasks-store.ts`, `ideas/idea-store.ts`, `notes/note-store.ts` and `milestones/milestone-store.ts` for direct changes.
- `spells/spell-reply.ts`, `spells/spell-store.ts` and the existing spell snapshots for transitions and capture.
- `replies/reply.ts`, `replies/reply-runs.ts` and `chats/store.ts` for message persistence, claims, cancellation and replies.
- `accounts/owner-scope.ts` and the existing error classification for access and failures.

Paths above are relative to `apps/web/src/`. Extract orchestration from Server Actions when it owns shared behavior, leaving authentication, cache refresh and UI feedback in the site adapter. In particular, split reply execution/persistence from its current Next.js response and `after()` adapter; retain the SDK stream adapter for the website. Avoid a second reply engine and pass-through services that merely rename store calls.

Shared operations accept the acting user and an execution policy. Site calls receive the site's existing rights; API calls receive the connection's narrower rights. Check that policy at every write boundary, including spell message capture, local commands and construct tools. Hiding a tool from the harness alone is insufficient. A denied capture must not save a Task or Idea. Preserve existing user-message validation feedback where a message is saved but its requested effect fails.

## Authorization and credentials

Use the glossary's client and connection model. Initially register the first-party CLI only. Grant operation permissions across quests the user can currently access; per-quest connection restrictions and third-party registration are deferred.

`login` uses browser authorization with an authorization code, Proof Key for Code Exchange (PKCE), and a loopback callback for local use. `login --headless` uses device authorization: put the verification URL and short-lived user code on stderr, then await explicit user approval. Bound waits by expiry and support cancellation. A public CLI has no embedded client secret. Choose a maintained OAuth implementation during the authorization slice rather than create a custom protocol.

The consent screen identifies the client and separately requests `data:read`, `data:write`, `replies:create` and `connections:manage`. Default to `data:read`; `login --permissions` explicitly requests additional permissions. A reply can run with read and reply permissions, but its tools and message capture cannot exceed the granted write rights. Quest start requires reply permission because it creates the construct's opening.

Proposed credential policy: access tokens expire after 15 minutes; rotating refresh credentials expire after 30 days of inactivity. Renewal preserves connection identity. Revocation invalidates access and renewal on the next API request and before subsequent reply side effects. Permission increases require new consent. Store credentials in the operating system credential store; headless environments may explicitly select a file store with owner-only permissions. Profiles contain nonsecret configuration only. Never emit tokens, authorization codes or refresh credentials in JSONL, logs or conversation context.

`logout` revokes first, then deletes local credentials. If offline, it fails and keeps credentials so revocation can be retried. `logout --local-only` deletes credentials without claiming server revocation. Site connection settings let the user identify and revoke each connection. Proposed “Sign out everywhere” behavior revokes both site sessions and API connections; update its site copy to state this consequence.

The current proxy requires a site-session cookie on API requests. Explicitly route `/api/v1/` to connection authentication, and add only the authorization protocol endpoints that need public access. API failures return structured status responses, never redirects or HTML sign-in pages. Existing cookie-authenticated site routes keep their behavior.

Each API user message retains the connection's user as author. Derive submitting connection provenance from validated credentials, never a request field. Revocation keeps the historical connection identity and message attribution, while removing usable credentials. Read APIs return user-visible conversation data without model-only prompts, private source definitions or connection badges in the site UI.

## JSONL contract

All operational stdout uses UTF-8 JSONL, including errors. Help and version flags return plain text and make no API call. Human login instructions and optional diagnostics use stderr; they never contaminate stdout. Disable color and progress spinners by default. Each invocation terminates with exactly one `result` or `error` record, except when the process cannot write because its output pipe has closed.

Every record has `schemaVersion: 1`, `type`, `command`, `requestId` and an invocation-local `sequence` starting at 1. `requestId` identifies the API operation, including on a recovered retry; local validation failures receive a locally generated ID. Additional fields depend on type:

- `item`: one list entry in `data`.
- `event`: a saved reply-state transition with `eventId`, `replyId` and `data`; emitted when `conversation send --follow` is selected.
- `result`: `data` for a single result, or `count` and `nextCursor` for a list. Mutations identify affected records and their new revisions. Reply results include `replyId`, saved message IDs and state.
- `error`: `error` with stable `code`, actionable `message`, `retryable`, optional `field`, optional `retryAfterSeconds` and optional `operationId` for uncertain outcomes. Never include stack traces or credentials.

```jsonl
{"schemaVersion":1,"type":"item","command":"quest list","requestId":"req_example","sequence":1,"data":{"id":"quest_example","name":"Prototype","status":"active","revision":3}}
{"schemaVersion":1,"type":"result","command":"quest list","requestId":"req_example","sequence":2,"count":1,"nextCursor":null}
```

Example identifiers above are illustrative. Empty lists emit a result with `count: 0`. If page retrieval fails after some items, emit an error and exit nonzero; consumers must not treat partial output as a complete list. Use UTC ISO 8601 timestamps, domain IDs as strings, and explicit documented nullability. JSON escaping keeps multiline text within one physical output line.

| Exit status | Meaning |
| --- | --- |
| `0` | Operation succeeded; an accepted reply request may still be running. |
| `1` | Unexpected server or client failure. |
| `2` | Invalid arguments or domain validation failure. |
| `3` | Authorization absent, expired, denied or revoked. |
| `4` | Connection permission denied. |
| `5` | Record missing or inaccessible. |
| `6` | Revision conflict or reply already in progress. |
| `7` | Rate limit. |
| `8` | Network failure, deadline or uncertain outcome. |
| `130` | Caller interrupted the command. |

Publish stable error codes beneath these categories, including `invalid_input`, `authorization_required`, `connection_revoked`, `permission_denied`, `not_found`, `conflict`, `reply_in_progress`, `rate_limited` and `outcome_unknown`. Preserve missing/foreign equivalence. Map API validation, authorization, missing records, conflicts and limits to HTTP 400, 401, 403, 404, 409 and 429 respectively.

## Retries and concurrent changes

Every mutation accepts an idempotency key, exposed as `--request-id`. The CLI generates and prints it to stderr before sending when none is supplied. The server scopes it to the connection, operation and normalized payload; the same key with a different payload returns a conflict. Retain outcomes for at least seven days and document that retry window. Never resubmit automatically beyond it.

Atomically save a mutation's effect and recoverable outcome. For replies, atomically accept the user message, connection provenance and a durable operation before execution. Repeated acceptance returns the original message and reply IDs. Reuse existing spell-capture deduplication and reply claims. Authorization, membership and permissions are checked again on recovery, so an outcome cannot leak a quest after access is removed.

Require expected revisions for edits, reorder operations, spell transitions and quest-status changes, including quest renames. Add revision checks to shared domain modules and update site writers in the same slice, so every writer participates. The Tasks store currently retries against the latest state; add an explicit expected-version mode for API changes without silently rebasing a stale CLI edit. A conflict returns current accessible revision metadata and applies nothing. Additions at the domain's default position need no supplied revision; still serialize ordering and allocate identifiers atomically. Additions relative to an existing entry require the collection revision. Idea-to-Tasks moves check both collection revisions and commit both changes together.

Deletes remain idempotent and do not distinguish missing from inaccessible records. Specify how removal conflicts are reported for an accessible record changed since the supplied revision. Do not automatically retry conflicts or non-idempotent requests. Bounded retries may reuse the same key for transient transport failures and 429/503 responses, respecting `Retry-After` within the command deadline.

## Reply delivery and workflow composition

`conversation send` returns after durable acceptance by default. Its result is explicit about `accepted`, `running`, `completed`, `failed` or `cancelled`; acceptance alone does not claim that a construct replied or a Task was saved. `--follow` streams saved state events until a terminal outcome. A failed or server-cancelled reply ends with an error record and exit 1; its saved state remains in that record. Each reply terminal outcome remains discoverable through `reply get`, even after the caller disconnects. Do not expose SDK wire chunks as the CLI protocol.

Persist reply execution under the site's supported server lifecycle; acceptance must schedule execution before it answers. A process failure must leave a discoverable failed or interrupted operation, never an indefinitely running record. Define recovery of abandoned claims in the reply slice. A client timeout or closed pipe stops local waiting, without implicitly cancelling server work. `reply cancel` requests cancellation using the existing cancellation machinery; effects already committed remain visible. An interrupted CLI invocation exits 130.

Use the same local engine, snapshots, command rules and spell capture as the website. Direct `task add` saves a step regardless of active spell; `conversation send` follows that spell's routing. Current replies and openings make no provider requests and add no charges. Preserve the site's one-running-reply constraints and report a conflict rather than interleave incompatible writes.

For example, an external workflow can save a handoff directly:

```sh
project-buddy note add --quest "$QUEST_ID" --text-file ./handoff.txt --request-id "$REQUEST_ID"
```

Here `QUEST_ID` is a saved quest ID and `REQUEST_ID` is a stable ID assigned to this handoff by the caller. Repeating the command with identical input recovers the same outcome. The Quick Note appears on the website. No construct reply is needed. A caller that wants conversation behavior instead uses `conversation send`, then follows or retrieves its reply.

## Implementation slices

Each slice should become a separately reviewable issue or PR. Dependencies are explicit; do not add pipeline start labels during planning.

Slice 1 precedes all implementation. Slices 2 and 3 can proceed independently after it. Slice 4 requires both; slice 5 builds on slices 2–4. Slice 6 completes the release after all earlier slices pass their acceptance criteria.

1. **API contracts and parity.** Reconcile issue 684 with current scope. Publish the operation matrix, exact HTTP contracts, input limits, pagination, error schemas and permission requirements. Add the shared contracts workspace and document supported Node versions and local installation. Acceptance: every first-release command maps to a documented operation and deferred areas have explicit reasons.
2. **Connections and login.** Implement consent, local and headless authorization, credential renewal, revocation, connection settings, proxy changes and message provenance storage. Use additive migrations that work with the live build. Acceptance: a connection can authorize unattended calls, renew without changing identity, and lose access immediately when revoked; historical attribution survives.
3. **Shared operations and reliable writes.** Extract required orchestration, enforce policy at direct and harness write boundaries, and implement revisions and idempotent outcomes. Update site writers as needed. Acceptance: site and API changes use the same records, stale writes conflict, foreign IDs remain not found, and repeated mutations produce one effect.
4. **CLI and direct operations.** Add `apps/cli`, profiles, credential stores, command parsing, HTTP calls, JSONL, exit statuses and the deterministic commands in the matrix. Acceptance: the built executable can start or discover a quest and save Tasks, Ideas and Quick Notes without browser interaction after login. Package installation exposes one executable without Next.js or database dependencies.
5. **Replies and recovery.** Extract the reply adapter, add durable acceptance and outcome retrieval, enforce reply-side permissions, and implement send/follow/get/cancel. Acceptance: an interrupted/retried send saves one user message with its connection provenance and one capture effect; the terminal outcome is discoverable and appears in the site's conversation.
6. **Release contract and documentation.** Document login, headless setup, permissions, JSONL examples, retry windows, conflicts and shell composition. Add workspace checks to CI, publish installation instructions and choose the package registry/name and release ownership. Acceptance: a clean installation follows the documented workflow, with no local source checkout required by the user.

Use internal workspace installation during development; decide public versus restricted npm distribution before slice 6. Version the HTTP API as `/api/v1` and JSONL independently with `schemaVersion`. Within version 1, allow additive optional fields and new commands. Field removal, changed meaning or exit-status changes require a new contract version.

## Validation and completion criteria

Place CLI parser and JSONL behavior tests in `apps/cli/test/component/`, credential/filesystem and HTTP-client tests in `apps/cli/test/component-integration/`, and built-executable tests in `apps/cli/test/system/`. Use one long-lived fake API service for system tests. Put kits shared across levels in `test/support/` under their subject's workspace.

Use the site's real-database kit for API, shared-domain and provenance tests in `apps/web/test/component-integration/`. Test owner, accepted member, pending invitee, removed member and unrelated user access, plus valid, restricted, expired and revoked connections. Exercise concurrent site/API writers with event barriers. Add current-product use cases only when their commands ship, following the existing exact-slug coverage rule.

Completion requires these observable outcomes:

- A CLI-created or changed record appears through the site's normal read path, and site changes appear in CLI reads.
- Every operational stdout line parses independently as JSON; empty and partial lists, errors and replies follow the terminal-record contract.
- Missing input, denied authorization, revoked credentials, permission failures, conflicts, limits and network uncertainty produce the documented exit status and error code.
- A restricted reply cannot write through spell capture, a local command or a construct tool. Removing membership blocks the next read, write and reply side effect.
- Duplicate requests and concurrent sends produce one accepted message and no duplicate Tasks, Ideas or Quick Notes; recovery does not leak records after access removal.
- A stale edit cannot overwrite a later site change. A failed idea move leaves both collections unchanged.
- Reply disconnect, cancellation and server interruption leave inspectable outcomes. Credentials and private prompt content never appear in stdout or conversation data.
- Direct operations, quest openings and local replies make no provider requests. Existing website commands, snapshots, status approvals and author display retain their behavior.

Run the checks for each changed workspace, the affected real-database tests, and the site's required CI stages when implementation changes shared code. This proposal changes documentation only.
