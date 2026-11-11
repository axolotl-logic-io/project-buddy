# API access plan

This is a planning proposal for [issue #684](https://github.com/axolotl-logic-io/project-buddy/issues/684), assessed on 2026-11-08. It does not approve an operation matrix, implement an API, choose storage or protocol details, or authorize an implementation pipeline start label. Keep the tracking issue open until its remaining choices are resolved. Project Buddy remains the product name.

The [planned API glossary](../GLOSSARY.md#api-access-planned) defines client, external agent, connection and connection permission. Existing domain terms are sufficient; tentative scope names and protocol choices below are proposals, not new domain terms.

## Current behavior and requirements reconciliation

The site and a future API must use the same quests, adventures, Journal and other records. A connection belongs to one user and narrows that acting user's current access. It grants neither quest membership nor ownership. An external agent is calling software, not a construct or a separate participant.

Issue #684 says a quest starts with an interview. Current [conversation behavior](chats.md#activities-and-constructs) retires Quest interview from new choices and maps older interview requests to Project Breakdown. Activities and Constructs start a quest through the shared quest start, with their choice preset. Quest creation defaults to Project Breakdown.

Motivation seeds the Journal; generated openings acknowledge it. See `src/chats/start-chat.ts` and the [quest use cases](../apps/web/use-cases/projects.md).

**Unresolved requirements reconciliation:** agree whether #684 should describe the current start behavior or require a different interview rule. Do not reinstate the retired activity, bypass the shared start behavior, or claim either interpretation approved through this document. New-quest exposure remains conditional on this decision.

An adventure still has exactly one construct and preserves construct and activity snapshots. Continuing it through a different entry point does not replace them. A standalone adventure has no quest Journal or milestones. The construct can offer a new quest from any adventure, including one already in a quest. Creating it requires user confirmation and creates a separate quest; it does not move the source adventure.

Accounting is also in transition. This inventory's source code uses gold for model use and Marketplace transactions. [Batteries #782](https://github.com/axolotl-logic-io/project-buddy/issues/782) owns model-use terminology; [Marketplace orbs #779](https://github.com/axolotl-logic-io/project-buddy/issues/779) owns the Marketplace accounting cutover. Future API contracts must follow the merged Batteries and orbs behavior. This proposal selects no conversion, commercial policy, prices or balance field rename.

Existing gold/quota compatibility identifiers remain intact. “Model use” below includes the acting user's accounting under that shared domain behavior.

## Proposed first-release operation matrix

Every classification is a proposal. **Exposed** means proposed for the first release, **deferred** means excluded pending further design, and **site-only** means a browser or site-specific workflow with no proposed API equivalent. These labels do not describe available endpoints. All reads and direct changes require current record access as well as connection permission.

**D** means deterministic: no model call and no model-use charge. **M** means model-backed with shared accounting. **Conditional** means the contract must identify the branch before presenting the operation as deterministic. Scope names are candidate permission strings only; they do not grant ownership rights.

| User-facing operations | Proposed class | Candidate permission | Model use and reason |
| --- | --- | --- | --- |
| Discover owned and joined quests; read quest context, status and next step | Exposed | `quests:read` | D. Primary command and agent entry point; paginate accessible records. |
| Browse premade quests and read starting Journal/activity suggestions | Deferred | Undecided | D. Useful discovery extension after core quest access; browsing creates nothing. |
| Start a quest with name, motivation, construct and activity; resume its first adventure | Exposed, conditional on reconciliation above | `quests:create`, `adventures:start`, `adventures:read` | Conditional. Prepared openings make no model call; motivation or edited definitions can require a generated opening. Use the shared atomic start operation, not a raw quest insert. |
| Start a premade quest | Deferred | Undecided | Conditional. Requires the same start guarantees and a separate approved template contract. |
| Change quest status directly, complete, abandon or restore; read and answer pending construct status requests | Exposed | `quests:write` (plus `quests:read` for reads) | D. Reuse status revisions and approval rules. Only the quest owner can change status or approve its change; membership alone is insufficient. A construct request cannot silently substitute for user approval. |
| List/filter quest and standalone adventures; read messages, authors and visible tool results; reopen/continue | Exposed | `adventures:read` | D. Same saved adventures as site; filter/pagination never disclose inaccessible records. Readable messages exclude model-only inputs. |
| Start an adventure in an existing quest or without a quest; choose construct and initial activity | Exposed | `adventures:start` | Conditional. Prepared versus generated opening must be explicit. Preserve snapshots and shared start failures. |
| Rename an adventure manually | Exposed | `adventures:write` | D. Keep manual-name protection from subsequent automatic names. |
| Submit a user message and request a construct reply | Exposed | `adventures:reply` plus read access | M. Shared harness, message authorship, snapshots, tools and acting-user accounting; automatic names are additional model use. No implied permission for unrelated changes. |
| Stop a reply; discover saved messages, reply state and charges after disconnect | Exposed | `adventures:reply` (stop); `adventures:read` (state) | Stop/read is D; work already performed can have model use. Preserve current stop authorization and distinguish cancellation from transport loss. |
| Render Markdown, citations, working notes, scroll position, presence and breadcrumbs | Site-only | None | Display behavior; expose safe content and citations through message reads, not rendered pages. |
| Change activity through a construct reply; switch construct by starting another adventure | Exposed | `adventures:reply`, `adventures:write` for activity effects; `adventures:start` for another adventure | M for the reply, Conditional for the new opening. No in-place construct replacement or new activity selector: current site changes activity through a tool. |
| Offer a new quest from any adventure; edit and confirm the summary | Deferred | Undecided | M for the offer, Conditional for creation. Needs an explicit confirmation contract and interview reconciliation; disable the corresponding reply tool initially. |
| Read current Journal, version list and a version's text | Exposed | `journal:read` | D. Prioritize context without requesting a reply or exposing prompt context. |
| Edit Journal; restore an earlier version as a new version | Exposed | `journal:write` | D. Preserve version authorship and reject stale base versions. |
| List, save and delete Quick Notes | Exposed | `journal:read` (list), `journal:write` (save/delete) | D. Notes are in the same Journal; append/delete creates a version. Do not invent a separate API note store or stable note id without a contract decision. |
| Read progress timeline; edit/delete an existing milestone | Exposed | `milestones:read`, `milestones:write` | D. Shared validation and current access rules; edits preserve milestone date and source adventure. |
| Record a milestone through a construct reply | Exposed | `adventures:reply` and `milestones:write` | M for reply. Record only real achievements under existing rules; unavailable in standalone adventures. Direct new-milestone creation is deferred because the app records through the construct. |
| List available constructs, activities and spells; read safe selection metadata | Exposed | `definitions:read` | D. Select from built-in and acting user's available definitions. Availability is distinct from permission to read instructions. |
| Read/edit own instructions; customize, clone, write from scratch, rename or reset definitions | Deferred | Undecided | D for stored definitions. Definition authoring expands initial scope; reset and ownership rules need explicit contracts. Do not expose another user's originals or adventure snapshots as instructions. |
| Retire, restore or delete forever own constructs, activities and spells | Deferred | Undecided | D. Preserve saved snapshots and bought-copy rights; design confirmation and retry behavior before destructive operations. |
| Workshop drafts and test conversations | Deferred | Undecided | M for test replies; no saved adventure. Separate draft and accounting contract needed. |
| Read construct profile/artwork; generate or restore construct visuals | Deferred | Undecided | Reads/restore are D, generation is M. Asset rights and payer/private-generation metadata need a dedicated contract. |
| Cast spells; search and cite the Blender manual during a reply | Exposed through reply only | `adventures:reply` | M for reply; tool effects remain restricted below. Cast instructions are model-only, not automatically API-readable. Direct spell execution/manual search endpoints are deferred. |
| Read team membership; invite, revoke invitation, join, decline, remove member or leave | Deferred | Undecided | D. Existing team access applies immediately to every exposed operation, but management and email privacy/rate limits need separate design. |
| Upload image attachments and include them in user messages | Deferred | Undecided | Upload is D; requesting a reply about an image is M. The site allows up to four JPEG, PNG, GIF or WebP attachments per message, each at most 2 MiB (`src/images/image-contract.ts`, `src/replies/chat-protocol.ts`; [image attachment use case](../apps/web/use-cases/chats.md#use_case_chat_images)). API upload permission, private storage/delivery, retention/cleanup and limits need a contract. This deferral does not remove existing safe image references from readable messages. |
| Read image gallery, view/download/delete an adventure image; request image generation | Deferred | Undecided | Read/delete are D, generation is M. Existing messages can retain safe image references; no grant to private generation inputs, payer costs or separate generation operations. |
| Browse Marketplace listings, prices and seller display names; buy/get free; list, update or unlist | Deferred | Undecided | D with respect to models; buys can transfer Marketplace orbs after #779. Financial authorization, atomic ownership transfer and retry rules need separate approval. Listing browse never reveals prompts or seller email. |
| Read own model-use availability and operation usage result | Exposed | `usage:read` | D. Clients need actionable insufficient-availability results. Final names and fields follow Batteries, with no Marketplace orbs authority implied. |
| Transfer, grant or buy balances; read transaction history | Deferred | Undecided | No model call implied. Expose no new commercial policy or administrative balance capability; reconcile supported operations with #779/#782. |
| Site sign-up/invitations, sign-in links, sign-out, Sign out everywhere; API authorization consent and connection revocation | Site-only browser workflows; connection lifecycle required for API launch | No domain operation permission | D. Reuse current sign-in limits; connections remain distinct from site sessions. Lifecycle semantics below require decisions. |
| Account name, New quest construct, other account/settings changes | Deferred | Undecided | D. Keep initial domain access small; own-account access never grants admin invitation authority. |
| Appearance, installed app, Home atlas and navigation | Site-only | None | D. Device and presentation behavior, with no proposed command equivalent. Underlying quest/adventure data comes from exposed reads. |
| Site setup, manual reindex and operational maintenance | Site-only | None | Administrative operations are outside a user's API connection. |

## Proposed reply tool restrictions

`src/replies/tools/index.ts` currently selects tools by quest presence, not API connection permission. `create_project` is available only in Chat, where it offers Turn Chat into a quest and creates nothing; only `update_memory`, `record_milestone` and `request_quest_status` require a quest.

API support needs a shared authorization boundary that supplies the intersection of operation permissions, connection restrictions and current acting-user access. Filter the tools advertised to the model and enforce permission again where each effect executes. A prompt or a spell cannot widen that authority. Recheck current access on later requests and tool writes; removed members must not keep access through a running client's cached authorization.

| Existing tool compatibility name | Proposed API reply behavior |
| --- | --- |
| `search_blender_manual`, `cite_blender_manual` | Allow with reply permission; expose only existing safe results/citations. |
| `cast_spell` | Allow with reply permission for acting user's available spells; keep cast instructions private and restrict any resulting effects independently. |
| `select_activity` | Require `adventures:write` in addition to reply permission; use available activities and preserve activity snapshots. |
| `update_memory` | Require `journal:write` and quest access; absent for standalone adventures. |
| `record_milestone` | Require `milestones:write` and quest access; absent for standalone adventures. |
| `request_quest_status` | Require `quests:write` and quest access; preserve user approval and revision rules. |
| `create_project` | Disable initially while new-quest proposal and confirmation from any adventure are deferred. |
| `generate_image` | Disable initially while image generation permission and accounting contract are deferred. |

The advertised tool set may change model behavior. Before approval, decide whether clients without these additional permissions should receive a reduced reply capability or a refusal before starting particular activities. No reply permission may silently include direct-write authority.

## Shared domain boundaries

Paths below are relative to `apps/web/`. They identify reuse/extraction candidates, not completed API-ready interfaces. Site entry points and API routes should be adapters over these modules with shared validation, access, accounting and error classification. Do not call rendered pages or private Server Action transport, or copy their business rules into routes.

| Behavior | Existing domain boundary and work to assess before implementation |
| --- | --- |
| Acting-user access | `src/accounts/owner-scope.ts`; retain owned/open predicates, including team access. Add connection permission checks without replacing those predicates. Foreign or inaccessible records remain indistinguishable from missing. |
| Quest starts | `src/projects/store.ts`, `src/conversations/start-quest.ts`, `src/chats/new-chat-store.ts`; share name/selection validation and atomic creation. |
| Messages, replies and stop | `src/chats/store.ts`, `src/replies/reply.ts`, `src/replies/stop-reply-action.ts`, `src/replies/tools/index.ts`; extract session/transport orchestration where necessary. Reuse run persistence and authorization rather than starting an independent harness. |
| Openings | `src/replies/chat-opening.ts`; prepared openings avoid calls, generated openings do not. A prepared start may still be gated by current availability rules; no model call does not imply bypassing those gates. |
| Journal and Quick Notes | `src/memory/memory-store.ts`, `src/notes/note-store.ts`; preserve version-based edits/restores and append/delete semantics under concurrency. |
| Status and milestones | `src/projects/quest-status-store.ts`, `src/milestones/milestone-store.ts`; preserve revision, confirmation, scope and validation rules. |
| Definitions, accounting and errors | `src/prompts/own-prompt-store.ts`, `src/activities/`, `src/constructs/`, `src/spells/`, `src/quota/`, `src/gold/`, `src/errors/app-error.ts`; reuse current ownership and classification, then align accounting interfaces with #779/#782. |

Every submitted API user message retains the connection user's authorship. Derive the connection from authenticated credentials, never a caller-supplied connection id. Site/historical messages need no fabricated connection. Preserve provenance after revocation without retaining usable credentials.

Connection provenance identifies an authorization, not an individual agent process if credentials are shared; use separate authorizations for distinct provenance. Do not add connection badges, author substitutions or other adventure UI changes.

Readable message contracts need an explicit allowlist. Do not serialize internal prompt contexts, private construct/activity snapshots, spell instructions, provider request data or another user's originals just because a user can read an adventure.

## Login and connection lifecycle proposals

The command name is `login`; the executable name and distribution remain undecided. It opens browser authorization, asks for site sign-in if needed, identifies the client and requested permissions, and succeeds only after user approval. Subsequent calls can run unattended through the approved connection. Initial approval remains a user action.

Recommend authorization code with Proof Key for Code Exchange (PKCE) for a local utility using an external browser, following [OAuth for Native Apps, RFC 8252](https://www.rfc-editor.org/rfc/rfc8252). Recommend [Device Authorization Grant, RFC 8628](https://www.rfc-editor.org/rfc/rfc8628) for remote/headless use with approval on another device. Supported environments, flows and library/provider remain implementation choices. A public utility must not rely on an embedded secret.

Before implementation, choose local credential storage and its fallback behavior, credential lifetime, expiry, renewal and renewal-failure recovery. Renewal must preserve connection identity. Credentials must never appear in logs, issues, command output or adventure context. Users need enough non-secret connection information to distinguish installations and revoke each authorization.

Propose that local credential removal only forgets credentials on that machine, while server revocation ends the authorization and refuses both subsequent use and renewal. Whether a utility can server-revoke its own connection on logout, rather than only remove local credentials, remains open. Permission narrowing/expansion behavior, revocation during in-flight work and the effect of “Sign out everywhere” on API connections also need approval. Site sessions and connections remain distinct even if a future user action ends both.

Define deterministic outcomes for denial, cancellation, authorization expiry, pending device approval, failed renewal and revoked access. Never report login success for pending approval or automatically reopen consent for each operation. Credentials that no longer authorize work must produce an actionable reauthorization result, with no silent elevation of permissions.

## Client contract decisions before implementation

| Decision | Proposed direction and unresolved details |
| --- | --- |
| Stable identifiers and validated inputs | Reuse domain ids where valid; publish schemas and structured success/error results. Choose wire field names and compatibility policy, not private transport shapes. Quick Notes currently live in Journal text: decide identity/retry representation explicitly. |
| Read and mark-read | Site opening calls `markChatRead` for the acting user. Decide whether API message reads have this effect or require an explicit write, and align permissions and retry behavior accordingly. |
| Pagination | Define bounded page sizes, ordering, continuation and mutation-between-pages behavior for quests, adventures, messages, versions and timelines. Do not depend on site lists being unbounded. |
| Errors and limits | Distinguish invalid input, not found, missing permission, stale write, insufficient model-use availability, rate limit, unavailable service and operation in progress (for example, the same retry key still in flight). Do not impose an adventure-wide rejection of distinct new messages while a reply runs; preserve shared message/reply concurrency behavior. Do not leak foreign existence through errors. Choose codes, retry guidance and limits without weakening existing sign-in, invitation or accounting rules. |
| Replies and disconnects | Propose a discoverable operation identity/state with saved message ids and accounting outcome. Choose streaming versus polling delivery and retention. Transport loss must not imply cancellation or permission to submit again. Define terminal failure, partial saves, stop races and which model work was charged, including naming. |
| Idempotency | Propose caller retry keys bound to user/connection, operation and validated payload, with atomic effect/result handling. Decide lifetime and cross-connection retry semantics; conflicting key reuse must not repeat work. Cover starts, messages, tools, updates and charges, including crash-after-save and concurrent retries. |
| Stale writes | Reuse Journal base-version checks: reject a stale edit/restore and return a conflict that lets the client reread and reconcile. Choose equivalent revision behavior for other shared editable records; do not silently overwrite site changes. Quick Note appends must not lose concurrent Journal work. |
| Client registration | Consider a first-party utility initially. Decide third-party registration, client identification and consent rules before allowing arbitrary clients. No registration policy is approved here. |
| Quest restrictions | Decide whether connections can restrict quests as well as operations, how new quests enter that set, and what losing membership means for in-flight tools and retries. Current membership is always required. |
| Versioning and distribution | Choose API versioning, deprecation and compatibility policy, utility executable name and installation/update channels before release. No URL scheme, OAuth provider or token/table format is selected here. |

## Implementation acceptance and evidence plan

These are future implementation gates, not tests passed by this planning PR. Update affected [use cases](../apps/web/use-cases/README.md) only when behavior is approved and implemented. Use the existing kits and [test levels](project-practices.md#tests); do not add placeholder tests that assert proposal text.

| Issue #684 example | Required future evidence |
| --- | --- |
| 1: Quick Note uses the same Journal without a model call | Component integration through API/domain and real test database; observe the site's Journal reader; deterministic model spy/fake rejects unexpected calls and verify no model-use accounting entry. |
| 2: API message uses the normal adventure and harness | Real-database integration for author, authenticated submitting connection, saved reply and acting-user accounting; UI component integration confirms existing author display without connection labels. Include cross-site/API continuation and private-context exclusion. |
| 3: Permission denial directly and through a tool | Integration tests for both entry-point denial and attempted harness effects, including forbidden tool execution, spells and standalone quest-only tools. Verify no forbidden write or unintended charge. |
| 4: Removed member loses access | Real users, owner/member/outsider and connection fixtures; remove membership then read/write/tool operations return the same result as missing records. |
| 5: Revocation refuses use and renewal, retains provenance | Real-database lifecycle tests, including separate connections for the same client and site messages without connection provenance; controlled time for expiry/renewal. |
| 6: Retried/interrupted work has no duplicates | Deterministic fault injection at save/charge/response boundaries, concurrent retry tests and observable recovery results; test stops and partial failures without sleep-based timing. |
| 7: Stale Journal edit preserves concurrent work | Real-database site/API edits and restores against the same base version, plus concurrent notes; assert conflicts and retained content. |

Additional lifecycle evidence must cover login denial, cancellation, authorization expiry, pending device approval and failed renewal, with deterministic outcomes and no premature login success. Verify credential non-disclosure in logs, issues, command output and adventure context, including failure paths. Use controlled time and the existing test kits.

**Open test policy question:** does browser authorization consent count among the allowed auth-only Playwright workflows? Resolve that classification before assigning consent tests; this proposal does not expand the rules in [site agent instructions](../apps/web/AGENTS.md) or [project test practices](project-practices.md#site-tests). Test domain/API lifecycle behavior through Vitest integration tests under those existing rules.

Additional evidence must cover prepared/generated openings, automatic naming charges, current sign-in/rate limits, model-use exhaustion, safe pagination and backward-compatible migration/provenance handling. Follow the repository's additive migration and old-build compatibility rules; any schema design belongs to implementation. No production test writes or deployment are part of this plan.

Before implementation starts, record agreement in #684 on the matrix, concrete permissions and reply tools, interview reconciliation, registration, quest restrictions, credential lifecycle and Sign out everywhere, delivery/retry/conflict contracts, limits, versioning and utility distribution. Refine the glossary only when those decisions expose a domain-language gap. Merging this proposal alone approves none of those choices.
