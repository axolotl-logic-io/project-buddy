# API access plan

This is a planning proposal for [issue #684](https://github.com/axolotl-logic-io/project-buddy/issues/684), reconciled against the simplified product on 2026-11-11. It does not approve an operation matrix, implement an API, choose storage or protocol details, or authorize an implementation pipeline start label. Keep the tracking issue open until its remaining choices are resolved. Project Buddy remains the product name.

The [planned API glossary](../GLOSSARY.md#api-access-planned) defines client, external agent, connection and connection permission. Existing domain terms are sufficient; tentative scope names and protocol choices below are proposals, not new domain terms.

## Current behavior and requirements reconciliation

The site and a future API must use the same quests, conversations, Journal, plan and other records. A connection belongs to one user and narrows that acting user's current access. Every quest is its owner's alone. Historical membership and invitations grant no access. An external agent is calling software, not a construct or a separate participant.

The current [glossary](../GLOSSARY.md), [premade quest behavior](premade-quests.md) and [simplification design](design/simplification-892.md) supersede the old app assumptions in #684 and the original proposal in #787:

- A quest has one continuing conversation. There is no conversation list, arbitrary new conversation in a quest, or construct replacement by starting another conversation. Chat is the user's separate continuing conversation without a quest. Opening it finds or creates an empty conversation without a model call or construct opening.
- Start a quest and Turn Chat into a quest use the same start form. Every new quest starts from Dailies, Learn a thing, Make a thing or Do a thing, with an editable name, starting Journal and construct. The starting point determines the activity; the user does not select one. The retired interview is not an invariant to restore.
- Starting Dailies again resumes the same quest without resetting or spending. Start the day sends an ordinary user message. No schedule, daily reset or automatic check-in is involved.
- A conversation preserves its construct and activity snapshots. Activity changes use the existing tool. Only Chat can offer Turn Chat into a quest; the offer creates nothing until the user confirms the shared start. It does not move Chat's messages.
- Quick Notes were removed. Direct Journal edits and version restores remain; historical Note paragraphs are ordinary Journal text. Do not reintroduce a Quick Note operation to satisfy example 1 in #684.
- The [quest plan](quest-plan.md) holds remaining steps. Its direct operations and commands make no model call; `change_plan` is a quest-only reply tool alongside Journal, milestone and status tools. Chat cannot change a quest's Journal, plan or milestones.
- [Batteries](batteries.md) fund model use. Marketplace and balance transfers were removed; bought copies remain ordinary own definitions. There is no Marketplace or orbs API to design for this release.

These are reconciliations to shipped product behavior, not approval of API exposure or permissions. Acceptance examples below replace the obsolete Quick Note and removed-member scenarios. The issue body retains the earlier requirements; implementation must use this reconciled baseline rather than revive removed features.

Deterministic reads and direct changes spend no batteries. Generated openings, replies and images use shared accounting. Automatic conversation naming was removed; retained historical accounting fields do not imply a new naming operation. Prepared openings make no model call, but current start availability gates still apply. Existing `chat`, `memory`, `gold` and `quota` identifiers remain compatibility names, not a public API contract.

## Implementation blocker

No external API or command utility is implemented by this plan. Authorization, credential lifecycle and distribution policy remain undecided. Before implementation, agree a first-release operation set and permissions, client registration and quest restrictions, login environments and revocation semantics, and the delivery/retry/versioning/distribution contract below. Do not expose private Server Actions as a substitute.

The next product decision is whether to proceed with a first-party API and utility, and which operations it initially supports. Record agreement on security and product choices in #684 before credentials or endpoints are introduced. Keep that issue open while they are unresolved.

## Proposed first-release operation matrix

Every classification is a proposal. **Removed** identifies operations absent from the current product, rather than deferred API work. **Exposed** means proposed for the first release, **deferred** means excluded pending further design, and **site-only** means a browser or site-specific workflow with no proposed API equivalent. These labels do not describe available endpoints. All reads and direct changes require current record access as well as connection permission.

**D** means deterministic: no model call and no model-use charge. **M** means model-backed with shared accounting. **Conditional** means the contract must identify the branch before presenting the operation as deterministic. Scope names are candidate permission strings only; they do not grant ownership rights. The earlier `adventures:*` candidates are replaced here by `conversations:*` for current domain language; neither set has been published as a contract.

| User-facing operations | Proposed class | Candidate permission | Model use and reason |
| --- | --- | --- | --- |
| Discover own quests; read context, status, current quest and next step | Exposed | `quests:read` | D. Paginate owner-scoped records; current quest follows the site's Active-quest rule and plan/legacy Journal fallback. |
| Browse the four premade starting points and read their starting Journal and activity metadata | Exposed | `definitions:read` | D. This is the shared start discovery, not a separate catalog; browsing creates nothing. |
| Start a quest from a premade starting point with name, Journal and construct | Exposed | `quests:create`, `conversations:read` | Conditional. Use the shared validation and atomic start, with the starting point's activity. Prepared versus generated openings and their availability gates must be explicit. |
| Start or resume Dailies; send Start the day | Exposed | `quests:create`, `conversations:read`; `conversations:reply` for the message | Conditional. Repeated/concurrent starts resume one Dailies without resetting it; Start the day is an ordinary charged user message, never a scheduled action. |
| Rename a quest; change status, complete, abandon or restore; read and answer pending construct status requests | Exposed | `quests:write` (plus `quests:read` for reads) | D. Owner-only. Reuse status revisions and approval rules; a construct request cannot substitute for user approval. |
| Read a quest's continuing conversation or Chat, with messages, authors and visible tool results; continue across site/API | Exposed | `conversations:read` | D. No new conversation list or multi-conversation quest model. Paginate messages and exclude model-only inputs. |
| Explicitly start a missing quest conversation | Exposed | `conversations:start` | Conditional. Reuse find-or-create behavior and shared openings; reading the quest never starts its conversation. Repeated starts cannot create a second conversation. No arbitrary construct/activity selector. |
| Open Chat for the first time | Exposed | `conversations:read` (initialization semantics to agree) | D. The site finds or creates an empty Chat, with no opening or model call. Decide how an API read handles this initial persistence. |
| Rename/delete an individual conversation; create additional standalone conversations | Removed | None | No current product operation. Quest rename is above; retained compatibility stores are not an exposure requirement. |
| Submit a user message and request a construct reply | Exposed | `conversations:reply` plus read access | M. Shared harness, message authorship, snapshots, tools and acting-user accounting. No implied permission for unrelated changes. |
| Stop a reply; discover saved messages, reply state and charges after disconnect | Exposed | `conversations:reply` (stop); `conversations:read` (state) | Stop/read is D; work already performed can have model use. Preserve current stop authorization and distinguish cancellation from transport loss. |
| Render Markdown, citations, working notes, scroll position and navigation | Site-only | None | Display behavior; expose safe content and citations through reads, not rendered pages. |
| Change activity through a construct reply | Exposed | `conversations:reply`, `conversations:write` | M. Use available activities and preserve snapshots. No construct replacement or new activity selector. |
| Offer Turn Chat into a quest; edit and confirm its name, Journal and construct | Deferred | Undecided | M for the offer, Conditional for creation. Only Chat can offer it. Confirmation must use the shared premade start; disable the offer tool initially pending that contract. |
| Read current Journal, version list and a version's text | Exposed | `journal:read` | D. Read context without requesting a reply or exposing prompt context. |
| Edit Journal; restore an earlier version as a new version | Exposed | `journal:write` | D. Preserve version authorship and reject stale base versions. |
| Save a Quick Note; schedule a check-in; browse, buy, sell or transfer Marketplace definitions/balances | Removed | None | Removed product operations, not deferred API work. Historical Journal and ledger content stays unchanged. |
| Read plan and versions; add, change, complete, reopen, move, remove or undo steps | Exposed | `plan:read`, `plan:write` | D. Reuse batch validation, stable step numbers, author attribution and undo semantics. Conversation-origin changes must preserve the pending-reply guard and saved plan messages. No need to submit command text as a construct message. |
| Read progress timeline; edit/delete an existing milestone | Exposed | `milestones:read`, `milestones:write` | D. Shared validation and current access rules; edits preserve milestone date and source conversation. |
| Record a milestone through a construct reply | Exposed | `conversations:reply` and `milestones:write` | M for reply. Record only real achievements under existing rules; unavailable in standalone conversations. Direct new-milestone creation is deferred because the app records through the construct. |
| List available constructs, activities and spells; read safe selection metadata | Exposed | `definitions:read` | D. Select from built-in and acting user's available definitions. Availability is distinct from permission to read instructions. |
| Read/edit own instructions; customize, clone, write from scratch, rename or reset definitions | Deferred | Undecided | D for stored definitions. Definition authoring expands initial scope; reset and ownership rules need explicit contracts. Do not expose another user's originals or conversation snapshots as instructions. |
| Retire, restore or delete forever own constructs, activities and spells | Deferred | Undecided | D. Preserve saved snapshots and bought-copy rights; design confirmation and retry behavior before destructive operations. |
| Workshop drafts and test conversations | Deferred | Undecided | M for test replies; no saved conversation. Separate draft and accounting contract needed. |
| Read construct profile/artwork; generate or restore construct visuals | Deferred | Undecided | Reads/restore are D, generation is M. Asset rights and payer/private-generation metadata need a dedicated contract. |
| Cast spells; search and cite the Blender manual during a reply | Exposed through reply only | `conversations:reply` | M for reply; tool effects remain restricted below. Cast instructions are model-only, not automatically API-readable. Direct spell execution/manual search endpoints are deferred. |
| Read team membership; invite, revoke invitation, join, decline, remove member or leave | Removed | None | Team quests were removed in #907; every quest is its owner's alone. |
| Upload image attachments and include them in user messages | Deferred | Undecided | Upload is D; requesting a reply about an image is M. The site allows up to four JPEG, PNG, GIF or WebP attachments per message, each at most 2 MiB (`src/images/image-contract.ts`, `src/replies/chat-protocol.ts`; [image attachment use case](../apps/web/use-cases/chats.md#use_case_chat_images)). API upload permission, private storage/delivery, retention/cleanup and limits need a contract. This deferral does not remove existing safe image references from readable messages. |
| Read image gallery, view/download/delete a conversation image; request image generation | Deferred | Undecided | Read/delete are D, generation is M. Existing messages can retain safe image references; no grant to private generation inputs, payer costs or separate generation operations. |
| Read own battery balance and operation usage result | Exposed | `usage:read` | D. Preserve payer isolation and actionable insufficient-batteries results. No administrative balance authority is implied. |
| Buy batteries; read own purchase/ledger history | Deferred | Undecided | No model call. Reuse the existing purchase boundary if later exposed; no new prices or commercial policy. Transfers and administrative grants are outside scope. |
| Site sign-up/invitations, sign-in links, sign-out, Sign out everywhere; API authorization consent and connection revocation | Site-only browser workflows; connection lifecycle required for API launch | No domain operation permission | D. Reuse current sign-in limits; connections remain distinct from site sessions. Lifecycle semantics below require decisions. |
| Account name, New quest construct, other account/settings changes | Deferred | Undecided | D. Keep initial domain access small; own-account access never grants admin invitation authority. |
| Appearance, installed app, navigation | Site-only | None | D. Device and presentation behavior, with no proposed command equivalent. Underlying quest/conversation data comes from exposed reads. |
| Site setup, manual reindex and operational maintenance | Site-only | None | Administrative operations are outside a user's API connection. |

## Proposed reply tool restrictions

`src/replies/tools/index.ts` currently selects tools by quest presence, not API connection permission. `create_project` is available only in Chat, where it offers Turn Chat into a quest and creates nothing; `update_memory`, `change_plan`, `record_milestone` and `request_quest_status` require a quest.

API support needs a shared authorization boundary that supplies the intersection of operation permissions, connection restrictions and current acting-user access. Filter the tools advertised to the model and enforce permission again where each effect executes. A prompt or a spell cannot widen that authority. Recheck current access on later requests and tool writes; historical membership grants no access, and a running client's cached authorization cannot bypass owner predicates or connection revocation.

| Existing tool compatibility name | Proposed API reply behavior |
| --- | --- |
| `search_blender_manual`, `cite_blender_manual` | Allow with reply permission; expose only existing safe results/citations. |
| `cast_spell` | Allow with reply permission for acting user's available spells; keep cast instructions private and restrict any resulting effects independently. |
| `select_activity` | Require `conversations:write` in addition to reply permission; use available activities and preserve activity snapshots. |
| `update_memory` | Require `journal:write` and quest access; absent for standalone conversations. |
| `change_plan` | Require `plan:write` and quest ownership; absent in Chat. Preserve plan batches, versions, undo and conversation messages. |
| `record_milestone` | Require `milestones:write` and quest access; absent for standalone conversations. |
| `request_quest_status` | Require `quests:write` and quest access; preserve user approval and revision rules. |
| `create_project` | Disable initially while Turn Chat into a quest confirmation is deferred. |
| `generate_image` | Disable initially while image generation permission and accounting contract are deferred. |

The advertised tool set may change model behavior. Before approval, decide whether clients without these additional permissions should receive a reduced reply capability or a refusal before starting particular activities. No reply permission may silently include direct-write authority.

## Shared domain boundaries

Paths below are relative to `apps/web/`. They identify reuse/extraction candidates, not completed API-ready interfaces. Site entry points and API routes should be adapters over these modules with shared validation, access, accounting and error classification. Do not call rendered pages or private Server Action transport, or copy their business rules into routes.

| Behavior | Existing domain boundary and work to assess before implementation |
| --- | --- |
| Acting-user access | `src/accounts/owner-scope.ts`; retain current owner-only predicates; historical membership and invitations grant nothing. Add connection permission checks without replacing those predicates. Foreign or inaccessible records remain indistinguishable from missing. |
| Quest starts | `src/projects/premade-quests.ts`, `src/app/(workspace)/projects/actions.ts`, `src/conversations/start-quest.ts`, `src/conversations/dailies.ts`, `src/chats/new-chat-store.ts`; extract shared start validation from the site adapter and preserve atomic creation and Dailies uniqueness. |
| Conversation identity | `src/conversations/conversation-store.ts`, `src/conversations/private-chat.ts`; preserve one conversation per quest and one Chat per user, including concurrent starts. |
| Messages, replies and stop | `src/chats/store.ts`, `src/replies/reply.ts`, `src/replies/stop-reply-action.ts`, `src/replies/tools/index.ts`; extract session/transport orchestration where necessary. Reuse run persistence and authorization rather than starting an independent harness. |
| Openings | `src/replies/chat-opening.ts`; prepared openings avoid calls, generated openings do not. A prepared start may still be gated by current availability rules; no model call does not imply bypassing those gates. |
| Journal | `src/memory/memory-store.ts`; preserve version-based edits and restores under concurrency. |
| Plan | `src/plan/plan.ts`, `src/plan/plan-store.ts`, `src/plan/plan-actions.ts`, `src/plan/plan-message.ts`; reuse operations, undo, ownership, author attribution and pending-reply guards. |
| Status and milestones | `src/projects/quest-status-store.ts`, `src/milestones/milestone-store.ts`; preserve revision, confirmation, scope and validation rules. |
| Definitions, accounting and errors | `src/prompts/own-prompt-store.ts`, `src/activities/`, `src/constructs/`, `src/spells/`, `src/quota/`, `src/gold/`, `src/errors/app-error.ts`; reuse current ownership and classification, preserve battery accounting and bought-copy ownership without reviving Marketplace. |

Every submitted API user message retains the connection user's authorship. Derive the connection from authenticated credentials, never a caller-supplied connection id. Site/historical messages need no fabricated connection. Preserve provenance after revocation without retaining usable credentials.

Connection provenance identifies an authorization, not an individual agent process if credentials are shared; use separate authorizations for distinct provenance. Do not add connection badges, author substitutions or other conversation UI changes.

Readable message contracts need an explicit allowlist. Do not serialize internal prompt contexts, private construct/activity snapshots, spell instructions, provider request data or another user's originals just because a user can read a conversation.

## Login and connection lifecycle proposals

The command name is `login`; the executable name and distribution remain undecided. It opens browser authorization, asks for site sign-in if needed, identifies the client and requested permissions, and succeeds only after user approval. Subsequent calls can run unattended through the approved connection. Initial approval remains a user action.

Recommend authorization code with Proof Key for Code Exchange (PKCE) for a local utility using an external browser, following [OAuth for Native Apps, RFC 8252](https://www.rfc-editor.org/rfc/rfc8252). Recommend [Device Authorization Grant, RFC 8628](https://www.rfc-editor.org/rfc/rfc8628) for remote/headless use with approval on another device. Supported environments, flows and library/provider remain implementation choices. A public utility must not rely on an embedded secret.

Before implementation, choose local credential storage and its fallback behavior, credential lifetime, expiry, renewal and renewal-failure recovery. Renewal must preserve connection identity. Credentials must never appear in logs, issues, command output or conversation context. Users need enough non-secret connection information to distinguish installations and revoke each authorization.

Propose that local credential removal only forgets credentials on that machine, while server revocation ends the authorization and refuses both subsequent use and renewal. Whether a utility can server-revoke its own connection on logout, rather than only remove local credentials, remains open. Permission narrowing/expansion behavior, revocation during in-flight work and the effect of “Sign out everywhere” on API connections also need approval. Site sessions and connections remain distinct even if a future user action ends both.

Define deterministic outcomes for denial, cancellation, authorization expiry, pending device approval, failed renewal and revoked access. Never report login success for pending approval or automatically reopen consent for each operation. Credentials that no longer authorize work must produce an actionable reauthorization result, with no silent elevation of permissions.

## Client contract decisions before implementation

| Decision | Proposed direction and unresolved details |
| --- | --- |
| Stable identifiers and validated inputs | Reuse domain ids where valid; publish schemas and structured success/error results. Choose wire field names and compatibility policy, not private transport shapes. |
| Read side effects | Quest reads do not start a conversation. Site Chat initialization persists an empty conversation without a model call. Choose an explicit API initialization contract; do not revive the removed check-in/unread workflow. |
| Pagination | Define bounded page sizes, ordering, continuation and mutation-between-pages behavior for quests, messages, versions and timelines. Do not depend on site lists being unbounded. |
| Errors and limits | Distinguish invalid input, not found, missing permission, stale write, insufficient model-use availability, rate limit, unavailable service and operation in progress (for example, the same retry key still in flight). Do not impose a conversation-wide rejection of distinct new messages while a reply runs; preserve shared message/reply concurrency behavior. Do not leak foreign existence through errors. Choose codes, retry guidance and limits without weakening existing sign-in, invitation or accounting rules. |
| Replies and disconnects | Propose a discoverable operation identity/state with saved message ids and accounting outcome. Choose streaming versus polling delivery and retention. Transport loss must not imply cancellation or permission to submit again. Define terminal failure, partial saves, stop races and which model work was charged, without reviving automatic naming. |
| Idempotency | Propose caller retry keys bound to user/connection, operation and validated payload, with atomic effect/result handling. Decide lifetime and cross-connection retry semantics; conflicting key reuse must not repeat work. Cover starts, messages, tools, updates and charges, including crash-after-save and concurrent retries. |
| Stale writes | Reuse Journal base-version checks: reject a stale edit/restore and return a conflict that lets the client reread and reconcile. Choose equivalent revision behavior for other shared editable records; do not silently overwrite site changes. |
| Client registration | Consider a first-party utility initially. Decide third-party registration, client identification and consent rules before allowing arbitrary clients. No registration policy is approved here. |
| Quest restrictions | Decide whether connections can restrict quests as well as operations, how new quests enter that set, and how narrowed restrictions affect in-flight tools and retries. Current ownership is always required. |
| Versioning and distribution | Choose API versioning, deprecation and compatibility policy, utility executable name and installation/update channels before release. No URL scheme, OAuth provider or token/table format is selected here. |

## Implementation acceptance and evidence plan

These are future implementation gates, not tests passed by this planning PR. Update affected [use cases](../apps/web/use-cases/README.md) only when behavior is approved and implemented. Use the existing kits and [test levels](project-practices.md#tests); do not add placeholder tests that assert proposal text.

| Issue #684 example | Required future evidence |
| --- | --- |
| 1: Direct Journal edit replaces removed Quick Notes | Real-database site/API Journal edit and restore against the same quest; deterministic evidence of no model call or battery charge. Historical Note paragraphs remain ordinary text. |
| 2: API message uses the normal conversation and harness | Real-database integration for author, authenticated submitting connection, saved reply and acting-user accounting; UI component integration confirms existing author display without connection labels. Include cross-site/API continuation and private-context exclusion. |
| 3: Permission denial directly and through a tool | Integration tests for both entry-point denial and attempted harness effects, including forbidden tool execution, spells and standalone quest-only tools. Verify no forbidden write or unintended charge. |
| 4: Owner-only access replaces membership loss | Real owner/outsider and connection fixtures, including historical membership/invitation rows; outsider reads, writes and tool operations remain indistinguishable from missing records. A connection cannot grant ownership. |
| 5: Revocation refuses use and renewal, retains provenance | Real-database lifecycle tests, including separate connections for the same client and site messages without connection provenance; controlled time for expiry/renewal. |
| 6: Retried/interrupted work has no duplicates | Deterministic fault injection at save/charge/response boundaries, concurrent retry tests and observable recovery results; test stops and partial failures without sleep-based timing. |
| 7: Stale Journal edit preserves concurrent work | Real-database site/API edits and restores against the same base version, plus concurrent Journal edits; assert conflicts and retained content. |

Additional lifecycle evidence must cover login denial, cancellation, authorization expiry, pending device approval and failed renewal, with deterministic outcomes and no premature login success. Verify credential non-disclosure in logs, issues, command output and conversation context, including failure paths. Use controlled time and the existing test kits.

**Open test policy question:** does browser authorization consent count among the allowed auth-only Playwright workflows? Resolve that classification before assigning consent tests; this proposal does not expand the rules in [site agent instructions](../apps/web/AGENTS.md) or [project test practices](project-practices.md#site-tests). Test domain/API lifecycle behavior through Vitest integration tests under those existing rules.

Additional evidence must cover:

- Plan reads, direct operations, command equivalence, tool restrictions, stale edits/undo and pending-reply guards.
- One continuing conversation, concurrent starts, empty Chat initialization, Dailies resume and Start the day.
- Prepared/generated openings, current sign-in/rate limits, model-use exhaustion and safe pagination.
- Backward-compatible migration and provenance handling.

Follow the repository's additive migration and old-build compatibility rules; any schema design belongs to implementation. No production test writes or deployment are part of this plan.

Before implementation starts, record agreement in #684 on the matrix, concrete permissions and reply tools, the reconciled current-product baseline, registration, quest restrictions, credential lifecycle and Sign out everywhere, delivery/retry/conflict contracts, limits, versioning and utility distribution. Refine the glossary only when those decisions expose a domain-language gap. Merging this proposal alone approves none of those choices.
