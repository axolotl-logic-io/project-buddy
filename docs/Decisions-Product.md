# Decisions: Product

Part of [Decisions](Decisions.md). Each decision has a name, which issues and code comments use to refer to it.

## `manual-only`

The tutor indexes only the Blender Reference Manual. On 2026-10-09 Axlog dropped the developer docs, the Python API guide pages, Blender Studio training and screenshot check-ins.

## `manual-via-git-clone`

The index comes from a git clone of the manual source at `projects.blender.org`, which works over HTTPS although the web UI is behind a Cloudflare challenge. The repo holds about 2,400 RST files under CC BY-SA 4.0. Blender has no official GitHub mirror, and unofficial copies are not used. Use plain `git clone`; `gh repo clone` fails there with HTTP 405.

## `latest-stable-manual`

Index only the latest stable release branch (`blender-v5.3-release` as of 2026-10-09) and cite `latest` URLs (`docs.blender.org/manual/en/latest/...`, matching the branch's `html_baseurl`). Version-pinned `/5.3/` URLs also resolve, but Axlog chose `latest`. Re-index when a new stable release ships.

## `keyword-search-agentic`

Search uses keywords only, with no embeddings. Claude writes the queries and refines them across several searches, using Postgres full-text search in Neon. Add hybrid search with Voyage embeddings only if the tutor misses relevant sections.

## `project-memory-shared-text`

Project state lives in one editable Markdown document per project, shared by all of the project's chats and injected into their prompts. The tutor edits it directly, and the edits are visible, versioned and reversible.

## `use-case-behavior-rulings`

Orchestrator, 2026-10-11:
- A question outside Blender gets a brief in-persona answer, with no manual links and an offer to return to the project.
- When the manual lacks a topic, the tutor says so, gives no uncited Blender steps, and may link a related section it looked up.
- Undo restores an earlier version as a new version, and every version stays.
- A save based on an outdated version is refused. The newer version is shown, and the user's unsaved text stays on screen.
- Each memory version records when it was made and whether the user or the tutor made it.
- Only the tutor's replies render as Markdown. The user's messages show exactly as typed.

## `project-interview-rulings`

- **New Project** offers a persona choice (built-in or their own) behind the `interview-persona` extra, off by default (Axlog, issue #108). Hidden, the form sends Hippy. A user persona's interview chat is saved under `hippy` with its name and parts snapshot.
- **Openings:** Claude writes every new chat's opening in the persona's voice, in one awaited call (30 s timeout), before any row is created. With empty memory it is the interview's first question; otherwise a synopsis of the project and what's next.
- **No fallback** (Axlog, 2026-10-12): if the opening call fails, nothing is created, and the form keeps the input and says Claude is unavailable. Replies in an existing chat keep their error message under the reply; no status check and no locked composer.
- **The interview** asks for goal, skill level and purpose, one question at a time, then milestones, saving to memory after every answer. `personas-and-prompts-rulings` narrows it to the project's creation chat.

## `haiku-chat-names`

Claude Haiku names each chat after the user's 1st, 3rd, 5th, 7th and 14th message (their messages only). A user can rename a chat by hand, and then Haiku stops renaming it. These calls count toward the quota. Tests use the mock.

## `working-notes-quiet`

Text in a reply that isn't meant for the user shows as a quiet note (Axlog, 2026-10-11). A text part is a working note when a later inline tool part in the same reply is a lookup (Axlog, 2026-10-12): text before `search_manual` is a note; text before `update_memory` or `cite_manual` is not. Each `TOOL_PARTS` entry says which. The rule is presentational only, applies to saved chats on reload, and a note is smaller, muted and labelled.

## `central-chat`

Each user has one central chat at `/chat`, in no project, for discussing an idea before making it a project or asking without choosing one (Axlog, 2026-10-16; #299, #309, #310, #315, #316).

`/` and the page after sign-in stay Home, with links to Chats and Projects. Every signed-in header links to Chats, Projects, Buddies, Settings and Account. Both chat pages use `ChatScreen`; only a project chat has a link back to its project. Rejected: landing on the central chat at `/` or after sign-in.

Every link or heading that names one of the site's two lists calls it "Projects" or "Chats" (Axlog, 2026-10-18; #471): the header's and Home's chat links read "Chats", the error and not-found pages' link reads "Projects", and the projects and chats pages head their lists "Projects" and "Chats". The labels live in `src/ui/copy/`. Other "Your …" headings, such as "Your name" and "Your buddies", stay.

- **One per user, on demand:** it is created the first time it is asked for, with the default buddy, and the same chat comes back after that (#315).
- **No project:** it has no project memory and no interview, and its chat system message opens with the buddy's `centralChat` part where a project chat names its project. The shared, cached system message is the same as a project chat's with the same buddy. `readMemory` isn't called.
- **Tools:** it offers `cite_manual`, `search_manual` and `create_project` (#310), with no `update_memory`. Only `create_project` gets a context, `CENTRAL_TOOL_CONTEXT`: the owner, the chat and the chat's buddy, and no project, so no tool learns of one. The cache breakpoint sits on the last tool sent in each place: `create_project` here, `update_memory` in a project chat. A project chat never offers `create_project`.
- **Creating a project from it (#310):** when the user asks for a new project, the tutor calls `create_project` with `{ name }`, checked by the same rule as New Project (`PROJECT_NAME` in `src/projects/project-name.ts`: trimmed, at least one character). The tool calls `startProject` with the central chat's buddy saved under `DEFAULT_BUDDY_ID`, as New Project saves one of the user's own, so the project is first in their list and its interview chat holds the tutor's first question. Its output is `created` (project id, name, interview chat id), `claudeUnavailable` or `quotaUsedUp` (reset time); on either failure nothing is saved. Its part, under the message, links to `/chats/<interview chat id>`; the user follows the link, and the chat doesn't open it by itself. The tool runs its own quota check, through `startProject`'s `checkQuota`, so a reply that crossed the quota as it ran creates no project (`claude-spend-quota`). The buddy reaches the tool in its context, from the chat the reply already loaded. Rejected: reusing the reply's grant, which would let a reply over the quota start a project; and re-reading the buddy by chat id inside the tool, which costs a query and puts the tool on the chat store.
- **Typing the tools (Axlog, 2026-10-17):** `src/tutor/tools/index.ts` keeps one tool-set type per place, with required keys (`ProjectTools`, `CentralTools`), and owns the `streamText` call: `streamTutorCalls` takes the reply's chat and the reply's shared settings, and switches on the chat's place, so `reply.ts` doesn't branch on it. A reply reads its calls through `TutorCalls`, whose steps are `TutorStep`, the fields of a step it reads. Rejected: an optional `update_memory` key on one tool set, which ai@7's `toolsContext` typing turns into `never`, so a project chat couldn't pass its context; and a union of the two tool sets in `streamText<…>`, which keeps only the shared keys.

## `not-found-is-200`

A Not found page answers HTTP 200, not 404 (Axlog, 2026-10-12; issue #46). `loading.tsx` on the id routes streams the shell before `notFound()` runs, and the page carries `noindex`. The loading skeletons stay. Rejected: an ownership check in `proxy.ts`; dropping `loading.tsx` on the id routes; a lookup in a layout above the loading boundary.
