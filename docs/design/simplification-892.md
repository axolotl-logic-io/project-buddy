# Conversation foundation (#892)

This is the domain contract for replacing Adventures with one continuing conversation per quest and one private Chat per user. The quest workspace (#893) and standalone Chat (#894) build on it. Paths are relative to `apps/web/`.

## Storage

A conversation is still a `chats` row, so `ChatId`, `/api/chat` and the message, image, reply-run and unread tables keep working. Migration 0051 is additive:

- `chats.continuing` (boolean, default false). A continuing conversation is a quest's conversation or a user's private Chat. Partial unique indexes allow one continuing row per project and one per standalone user, so get-or-create is atomic (`insert … on conflict do nothing`, then read).
- `construct_sessions`: like `activity_sessions`, one row per construct the conversation used, with a snapshot of its name and parts and the message it started after. The newest row is the current construct. `chats.buddy_*` is kept as the current construct, written in the same transaction, so the live build keeps reading it.
- `messages.construct_session_id` (nullable): the construct that wrote a reply. Editing a construct never changes a snapshot.
- `milestones.chat_id` becomes nullable with `on delete set null`, so Progress outlives the conversation it was recorded in.

Migration 0052 removes legacy adventures: every `chats` row that isn't continuing. Its messages, images, image generations, reply runs and usage rows, activity sessions, unread marks, quest transfers, status approvals and construct-visual grants go with it through their foreign keys. Plan versions and milestones keep their rows with no conversation. Accounts, balances (`gold`, `orbs`, purchases), own constructs, activities and spells, Journals, Plans, members and invitations are untouched.

### Release sequencing

- The new build reads only continuing conversations, so it doesn't depend on 0052 having run.
- The old build keeps working on the 0051 schema. It writes `continuing = false`, so it never conflicts with the unique indexes.
- Adventures that the old build creates between 0052 and promotion are left over. They are ignored and invisible. Delete them in the next release with the same statement as 0052 (follow-up issue).
- Rollback restores old code with the conversations removed. No real user data is lost, by the user's approval.

## Domain API (`src/conversations/`)

All functions take the acting user first and treat a foreign or unknown id as not found.

| Function | Purpose |
| --- | --- |
| `readQuestConversation(viewer, projectId)` | The quest's `Conversation`, or `undefined`. Pure read. |
| `startQuestConversation(actingUser, projectId)` | Atomic get-or-create. Only the request that creates it writes the opening, charged to the acting user. Returns `started`, `outOfGold`, `claudeUnavailable` or `notFound`. Never makes a second opening. |
| `privateChat(user)` | The user's private Chat, created empty if missing. No opening, no batteries. |
| `readConversationHistory(viewer, conversationId)` | Messages, each reply with the `construct` (`{ id, name, parts }`) that wrote it, plus `transitions`: `{ kind: "activity" \| "construct", name, afterMessageId }[]`. |
| `changeConstruct(actingUser, conversationId, constructId)` | Records a construct transition. Applies to later replies. |
| `changeActivity(actingUser, conversationId, activityId)` | Records an activity transition. Applies to later replies. |
| `resolveConversation(viewer, chatId)` | `{ kind: "quest", projectId }`, `{ kind: "chat" }` or `undefined`. Use it to redirect old `/chats/[id]` URLs. |
| `unreadQuestIds(viewer)` | The quests whose conversation is unread for this viewer. |

A `Conversation` has `id: ChatId`, `project`, the current construct, the current activity and `unread`.

## Other behaviour

- `startProject` creates the quest and its continuing conversation, with its opening, in one transaction.
- The `create_project` quest transfer opens the new quest's conversation and moves no Chat messages into it.
- A check-in appends one construct message to the quest's conversation. If the quest has none, the message opens a new one. It marks the conversation unread for the owner and each member. The current activity doesn't change.
- A reply sends the Journal, the Plan, the current construct and the current activity, plus a bounded window of the newest messages (`CONVERSATION_WINDOW`).
- Automatic adventure naming is removed.

## Ownership

- #892 owns schema, migrations, these domain modules, replies, check-ins and `GLOSSARY.md`.
- #893 and #894 delete the obsolete multi-chat modules once they remove the last consumers: `startChat`, `listAllChats`, `listChats`, `listStandaloneChats`, `createStandaloneChat`, `newChatChoices`, `new-chat-selection`, `chat-name`, `renameChat` and the routes that use them.
