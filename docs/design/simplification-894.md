# Standalone Chat and simplified start actions (#894)

This page records what issue #894 changes, after the scope correction that the redesign must remove features rather than add them. It builds on the conversation foundation (#892, `docs/design/simplification-892.md`) and the quest workspace (#893).

## What the user gets

- **Chat** at `/chat`: one private conversation per user, for talking without a goal. It has no list, chooser, name or New adventure button. Opening it calls `privateChat`, which gets or creates the conversation without an opening, so it spends nothing. It uses the default construct and the Chat activity. It has no Journal, Plan or milestone tools because it has no quest.
- **Start a quest from this** in Chat's header: the shared quest start (`QuestStartChoices`, #893) on Do a thing, with a draft Journal made from the user's latest Chat messages. The user edits and confirms; closing creates nothing. No Chat message moves into the quest.
- **Activity and Construct start actions**: the shared quest start, in a dialog, with that activity or construct preset. There is no other start flow.
- **Old addresses**: `/chats/[chatId]` redirects to the owning quest or to `/chat` through `resolveConversation`, and is otherwise not found. `/chats/new` redirects to `/chat`.

## Removed

- The Adventures page at `/chat`: the list of every adventure, its All/Quest/Standalone tabs, its quest filter and quest badges (`chat-project-filter.tsx`, `no-adventures.tsx`).
- The new-adventure page at `/chats/new`, its form and dialog (`new-chat-form.tsx`, `new-chat-dialog.tsx`, `new-chat-selection.ts`, `new-chat-choices.ts`, `app/(workspace)/chats/actions.ts`).
- Starting a second conversation: `startChat` (`chats/start-chat.ts`) and `createChatWithOpening`.
- Renaming an adventure: `app/(workspace)/chats/[chatId]/actions.ts` and `rename-chat-form.tsx`.
- The conversation page at `/chats/[chatId]`, replaced by a redirect.
- Use cases `use_case_new_chat`, `use_case_new_chat_without_projects`, `use_case_list_all_chats`, `use_case_filter_chats_by_project`, `use_case_chat_project_badge`, `use_case_chat_named_automatically`, `use_case_rename_chat`, `use_case_new_project_from_new_chat` and `use_case_activity_premade_quest_entry`, with their tests.

## Not added

The first draft of this contract proposed continuing an existing quest or Chat with a chosen activity or construct. The scope correction dropped that: a quest chooses its construct when it starts, and activities change only through the construct's `select_activity` tool. No new persistent state comes from this change.

## Retained compatibility

- `app/(workspace)/chats/[chatId]/page.tsx` and `chats/new/page.tsx` stay as redirects, because emails, generated images, milestones and bookmarks link to them.
- `create_project`, the construct's quest proposal, stays; its confirmation now links to the quest.
