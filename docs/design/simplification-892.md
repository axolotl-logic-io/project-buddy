# Conversation foundation (#892)

This note records the domain contract that replaces Adventures with one continuing conversation per quest and one private Chat per user. The quest workspace (#893) and standalone Chat (#894) build on it. Paths are relative to `apps/web/`.

The user asked for fewer features and less complexity. The construct is chosen when a conversation starts and never switched. The activity changes only through the construct's existing activity tool. Dailies is an ordinary quest with a mark.

## New persistent state

Each addition is the smallest state that the behavior needs.

| State | Why it's needed |
| --- | --- |
| `chats.continuing` (boolean, default false) with partial unique indexes on `project_id` and on standalone `user_id` | Gives atomic get-or-create of the one conversation per quest and the one Chat per user. The flag, rather than plain unique indexes, keeps the live build working during the release: it still writes several adventures per quest with `continuing = false`. |
| `projects.dailies` (boolean, default false) with a partial unique index on `user_id` | Gives the stable identity of the user's one Dailies quest, whatever its name, and atomic reuse under concurrent starts. |
| `milestones.chat_id` nullable, `on delete set null` | Lets Progress outlive the adventure it was recorded in, so the cutover keeps it. |

Migration 0051 adds all three and is compatible with the live build. There is no new state for construct history, activity history, daily progress or Start the day.

## Cutover

Migration 0052 deletes every chat that isn't continuing: the existing adventures. The user approved removal rather than keeping their history. The following go with the adventures through their foreign keys:

- messages
- images and image generations
- reply runs and their usage rows
- activity sessions
- unread marks
- quest transfers and status approvals
- construct-visual grants, whose last release collects the asset's bytes

Plan versions and milestones stay, with no conversation. Accounts, battery and orb balances, own constructs, activities and spells, quests, Journals, plans, members and invitations stay. `test/component-integration/db/remove-adventures-migration.server.test.ts` checks this on a scratch database.

### Release sequencing

- 0051 and 0052 run in the release's migration step while the old build is live. The old build keeps working: it reads adventures that are gone as not found and writes new adventures with `continuing = false`.
- The new build reads only continuing conversations, so it doesn't depend on 0052 having run.
- **Follow-up release required:** adventures the old build writes between 0052 and promotion are invisible leftovers. The next release must run `DELETE FROM chats WHERE NOT continuing` again. Once no build writes `continuing = false`, it can also drop the unused `chats.name` and `chats.renamed_by_hand` columns.
- A rollback restores old code without the adventures. No real users are affected, by the user's approval.
- Nobody runs 0052 by hand in production. It runs only through the release workflow.

## Domain API (`src/conversations/`)

Every function takes the acting user first. A quest or conversation that isn't open to that user is not found.

| Function | Behavior |
| --- | --- |
| `readQuestConversation(viewer, projectId)` | Returns the quest's `Conversation` (the chat with its current `activity`), or `undefined`. It is a pure read that never starts one. |
| `startQuestConversation(actingUser, projectId)` | Atomic get-or-create in the default construct and activity. Only the request that creates it writes the opening, charged to that user. Returns `started`, `outOfGold`, `claudeUnavailable` or `notFound`. |
| `startProject(owner, name, construct, { motivation?, journal?, activity? })` | Creates a new quest with its conversation and opening in one transaction. |
| `startDailies(user, { name, journal, construct, activity })` | Resumes the user's Dailies unchanged and for free (`resumed`), or starts it (`started`). Concurrent starts make one. |
| `privateChat(user)` | Returns the user's Chat. Get-or-create, empty, with no model call. |
| `resolveConversation(viewer, id)` | Returns `{ kind: "quest", projectId }`, `{ kind: "chat" }` or `undefined`. Old adventure links use it. |
| `appendCheckIn(owner, project)` | Appends a check-in to the quest's conversation and marks it unread for the owner and members (`src/conversations/check-in.ts`). |

`Project` (`src/projects/store.ts`) gains `dailies`, which is true only for the viewer's own Dailies, and `unread`, which is the viewer's own mark. Start the day is a prepared user message sent through `/api/chat`, which the Dailies activity guides. It needs no server state. `/api/chat` stays addressed by the conversation's chat id.

## Reply context

A reply reads the newest `CONVERSATION_WINDOW` (60) messages (`src/replies/conversation-to-answer.ts`). Every reply's instructions carry the quest's Journal, plan and newest milestones, so a long-running quest never sends its whole history. Older messages stay readable on the page.

## Removed

| Removed | Notes |
| --- | --- |
| Automatic adventure naming | `src/replies/chat-naming.ts`, `src/replies/mock-chat-name.ts`, `chatNameModel`, `saveAutomaticChatName` and the naming `after()` task. Each reply no longer makes a second, Haiku, model call. |
| Old check-in behavior | Check-ins no longer create a conversation per check-in (`startCheckIn`, `latestConstruct`). |
| `startProject` in `src/chats/start-chat.ts` | Moved to `src/conversations/start-quest.ts`. |
| Use cases | `use_case_chat_named_automatically` and `use_case_switch_construct`. |
| Tests | Multi-adventure tests: `all-chats*`, `store-starts`, `new-project-from-new-chat` and `chat-names`. |

Removed by #893 and #894 with their routes: `startChat`, `createChatWithOpening`, the Adventures list and filters, the New adventure screens and dialogs, the rename route and its use cases. Once those land, the last consumers of `renameChat`, `chat-name.ts`, `all-chats.ts`, `standalone-chat.ts` and `listChats` are gone, and the consolidated branch deletes them.

## Retained compatibility

- **`chats`/`chat` names in code and storage.** They are the conversation's storage, and renaming them would be a broad mechanical rename the ticket advises against.
- **`chats.name` and `chats.renamed_by_hand`.** The live build reads them during the release. A later release drops them.
- **`getChat` reading any open chat, continuing or not.** Old links resolve safely through `resolveConversation`. Nothing lists leftovers.
