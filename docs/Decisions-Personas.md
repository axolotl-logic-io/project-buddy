# Decisions: Personas

Part of [Decisions](Decisions.md). Each decision has a name, which issues and code comments use to refer to it.

## `persona-spoof-names`

Personas have spoof names, like the themes (Axlog, 2026-10-11, renamed 2026-10-12): Hippy (the default), Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain (ids `hippy`, `mr-tee`, `fjord-tines`, `span-tines`, `argon-sprangler`, `roland-dustchain`). Fjord and Span are brothers. Only real names are out. A chat saved under an unknown id reads as Hippy.

## `personas-as-text`

Personas are text (Axlog, 2026-10-11). The six built-ins are text in the repo, and each user's personas are stored as text. A user creates a persona by cloning one, then edits it. A chat keeps the persona text it started with, as a snapshot, so editing a persona doesn't change existing chats.

## `personas-and-prompts-rulings`

Axlog asked on 2026-10-12 for cloning, the interview at project creation, and editable prompt parts. Details are the orchestrator's (2026-10-12) unless marked.
- **Every static prompt part is editable** (Axlog): the user sees the prompt as named parts and edits them; a persona is its full set of static parts (voice, teaching rules, interview, tool, citation and memory mechanics). Dynamic parts (memory, project name, date, manual version) show read-only. Each part has "reset to default"; mechanics parts warn that changes can break citations, memory or search. Built-in personas are read-only; customizing one starts a clone. The mechanics parts (`MECHANICS_PARTS`) sit behind the Settings extra `persona-mechanics`, off by default (orchestrator, 2026-10-14, issue #104): hidden by display only, they stay in the form and save unchanged, and once the switch is on they show and stay editable, with the warning.
- **What counts as a part:** tool descriptions (`search_manual`, `cite_manual`, `update_memory`, `create_project`) are editable, built per request by a typed `tutorTools(place, descriptions)` factory, for a project chat or the central chat (`central-chat`); input-field descriptions show read-only. The kickoffs and the answer-now note are parts, and their recognisers (`isNeutralKickoff`, `isOpeningKickoff`) move with them; the mock recognises them by text, since position can't tell a site-started chat from a seeded one. The memory part's intro is editable; its `<project_memory>` tags are locked. `BUDDY_SHARED_RULES` ("facts don't change with voice") is its own part. Date and manual version go in the second system message, so the shared prefix stays cached.
- **The central chat part** (#316): `centralChat` is a mechanics part and a system-prompt part, after the interview. It opens the chat's own system message in the user's central chat, which is in no project, where a project chat names its project; its default, `CENTRAL_CHAT_PROMPT`, is the same for every built-in buddy. It tells the tutor that the chat belongs to no project, that the user talks an idea through there and decides with the tutor whether it should become a project, and that it has no project memory.
- **Parts added later** (#316): stored parts (chat snapshots and the user's own buddies) that lack a part added after parts were first stored read it as the default buddy's text. `buddy-parts-schema.ts` names these parts in `LATER_PARTS`, which holds `centralChat` and `createProjectTool` (#310), the description of the central chat's `create_project` tool, a mechanics part whose default is `CREATE_PROJECT_DESCRIPTION`. Stored parts that lack any other part are still not a buddy's parts.
- **Cloning:** a built-in persona or one of the user's own, into their own as "<name> (clone)". A built-in persona offers Customize, a clone of their own opened to edit; one of their own offers Tweak, which edits it in place, and Clone (Axlog, 2026-10-14, issue #110). This refines the ruling: both kinds can still be cloned.
- **No sharing** (Axlog, 2026-10-12): a persona is never visible to another user. No share links, no share table, no share page. Rejected earlier: a live shared persona and a gallery.
- **One persona per chat** (Axlog, 2026-10-12): no multi-persona chats. A chat keeps the one persona it started with, as a snapshot (name and parts) on the chat row. Rejected: a `chat_personas` table and `messages.chat_persona_id`, which only multiple personas needed.
- **Interview at project creation:** only the creation chat interviews, while the memory lacks any of goal, skill level, purpose or milestones, and the project page links back to it. It is marked by `projects.interview_chat_id`, set by `startProject`.
- **Caching cost is measured, not capped:** each release's smoke test records `cacheRead` and `cacheWrite` for an edited persona.

## `no-banned-lists`

No banned-word lists, no content guardrails on the personas, and no tests of what the personas say (Axlog, 2026-10-12). Kept: the shared rules that keep steps, menu paths, shortcuts and citations exact, and their tests. Catchphrases, in-world words and franchise nods are allowed everywhere; words already removed stay removed unless Axlog asks. Reviews and smoke tests don't judge a persona's voice; a smoke test checks the persona's name and that the reply answers.

## `name-placeholder`

A persona can call the user by name (orchestrator, 2026-10-14, issue #114).
- **The name lives on the account**, not in each persona: the user sets it once on their account page, and every persona, built-in or cloned, uses it. It is stored normalized in `users.name` (trimmed, 1 to 60 characters, no line breaks, no `{` or `}`), or null when they have none.
- **One literal placeholder, `{{name}}`**, not a template language. Each `{{name}}` becomes their name, or "the user" when they have none. Other braces, such as `{{ name }}` or `{{project}}`, stay as written. Parts stay plain text (`personas-as-text`), with nothing to escape and nothing that can fail to render.
- **Substituted only in the system prompt's parts** (role, citation, interview, central chat, memory intro, empty memory, voice, shared rules, teaching rules), at prompt time for replies and chat openings. Stored parts, chat snapshots, the tool descriptions, the kickoffs and answer-now keep `{{name}}` as written (`personas-and-prompts-rulings`: the mock and `chat-kickoff.ts` recognise the kickoffs by their exact text).
- **The cached prefix is now per user and parts** (`anthropic-prompt-caching`): two chats of one user in one persona still share it byte for byte, and another user's prompt never holds their name.
- **Rejected:** a name field on each persona, and Mustache- or Handlebars-style templating.

## `buddies-schema-rename`

The database uses buddy names (Axlog, 2026-10-15; #117, part of #109): table `buddies`, with `buddies_pkey`, `buddies_user_id_users_id_fk` and `buddies_user_id_idx`; chat columns `buddy_id`, `buddy_name` and `buddy_parts`. Migration `0010_buddies` renames in place without losing rows or values. Stored flag ids (`persona-mechanics`, `interview-persona`) and the `/personas` redirect keep their names.

Axlog accepted a one-off exception to the live-build migration rule: there is no compatibility view or dual-write period. A build from before #117 cannot query this schema, including after a code-only Vercel rollback. The general expand-then-contract rule still stands ([`release-workflow`](Decisions-Accounts.md#release-workflow)). Integration previews share the production database; giving them a separate database remains a separate ticket.

Rejected: a `personas` compatibility view and both column sets written until the old build stopped using them.
