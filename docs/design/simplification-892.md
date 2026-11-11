# Conversation foundation (#892)

This note records the domain contract that replaces Adventures with one continuing conversation per quest and one private Chat per user. The quest workspace (#893) and standalone Chat (#894) build on it. Paths are relative to `apps/web/`.

The user asked for fewer features and less complexity. The construct is chosen when a conversation starts and never switched. The activity changes only through the construct's existing activity tool. Dailies is an ordinary quest with a mark.

## New persistent state

Each addition is the smallest state that the behavior needs.

| State | Why it's needed |
| --- | --- |
| `chats.continuing` (boolean, default false) with partial unique indexes on `project_id` and on standalone `user_id` | Gives atomic get-or-create of the one conversation per quest and the one Chat per user. The flag, rather than plain unique indexes, keeps the live build working while 0051 runs: it still writes several adventures per quest with `continuing = false`, and existing adventures stay until #898. |
| `projects.dailies` (boolean, default false) with a partial unique index on `user_id` | Gives the stable identity of the user's one Dailies quest, whatever its name, and atomic reuse under concurrent starts. |
| `milestones.chat_id` nullable, `on delete set null` | Lets Progress outlive the adventure it was recorded in, so the cutover (#898) keeps it. A milestone with no conversation still reads and shows. |

Migration 0051 is additive. It adds all three and is compatible with the live build. There is no new state for construct history, activity history, daily progress or Start the day.

## Cutover

Removing existing adventures is the destructive second step, in its own PR, #898, which holds migration `0052_remove_adventures`. It must not merge into `integration` until this release (#897, with 0051) and the replacement pages (#893, #894) are live in production, as the [project practices](../project-practices.md) require.

0052 deletes every chat that isn't continuing, and what belongs to it through foreign keys. It keeps accounts, balances, own definitions, quests, Journals, plans and milestones, which then have no conversation. Until 0052 runs, adventures stay in the database:

- The new build doesn't read them.
- Old links resolve through `resolveConversation`.
- A milestone keeps its link until its conversation is gone. After that it shows without a link.

Nobody runs the cutover by hand in production; the release workflow applies it.

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
- **`chats.name` and `chats.renamed_by_hand`.** This release still reads them. The second release (#898) drops them together with the adventure delete. That is safe only once the first release reads neither column: no `Chat.name`, and no `getTableColumns(chats)` or bare `returning()` on `chats`.
- **`getChat` reading any open chat, continuing or not.** Old links resolve safely through `resolveConversation`. Nothing lists leftovers.
