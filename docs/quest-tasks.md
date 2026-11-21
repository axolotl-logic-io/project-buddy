# Quest tasks

Each quest has Tasks: its ordered tasks of remaining work, which the construct and the people in the quest, its owner and [members](multi-user-quests.md), keep together. Tasks is the quest’s todo list. The construct changes it with a tool, and the owner or a member changes it directly, without a model call, from the quest's page, from the Tasks panel beside a conversation, or with commands in the message box. The [glossary](../GLOSSARY.md#tasks) defines the words this page uses.

## Tasks

A task is one line of at most 200 characters, open or done. Each has a number, given in order and never given again, which names it for the whole of the quest, such as #3. Tasks has no limit on the number of tasks. Done tasks keep their places, and the site shows them folded away under **Done**.

The next task is the first open task in Tasks. Click text to edit inline; Enter or clicking outside saves and closes the editor; clicking another row also opens its editor. Escape cancels. Add a task opens a new editor above the list and saves the new task at the end of Tasks. Drag a row’s handle to change its position, or use the arrow keys while the handle is focused. The row menu holds move and remove actions and its stable task number. In the Dailies quest, it also holds Make recurring or Make one-off, and a recurring task's row shows its streak (see [Dailies](dailies.md)).

## Operations

Tasks has seven operations: add, change, complete, reopen, move, remove and recur. The construct's tool, the user's controls and the commands all apply them through one module, so they follow the same rules. `recur` makes a task a [recurring task](dailies.md#recurring-tasks), which Start Day reopens each day, or a one-off task again. Add and move take an optional task to go before; without one they go at the end.

A batch applies all or none. It saves nothing if a task it names isn't there or if no operation changes anything; an operation that changes nothing, such as completing a done task, is skipped. Each change records what each operation did, in words, and the operations that undo it.

An undo keeps the changes made since. It skips an operation on a task removed since, and reverts a text only while the task still has the text the change set, so a newer edit stays. A removal or a move whose old neighbour was removed since goes back at the end. An undo with nothing left to do saves nothing and says so.

## The construct

Every quest conversation's prompt lists the current Tasks between `<quest_tasks>` tags, one task per line with its number, done tasks marked `[done]` and recurring tasks marked `[recurring]`. The `change_tasks` tool takes a batch of operations and returns the tasks after it, or the tasks as they are and why nothing changed. The global prompt's tasks rules tell the construct to add only agreed tasks, to check off a task the user finished, to keep a finished task apart from a milestone and to name tasks by their `#` numbers rather than restate them as a list with its own numbering.

The conversation shows each call as a **Tasks change** with Undo, while the reply streams and after the user reopens the quest. The tool is active only in quest conversations.

## People in the quest

The owner and members change the tasks through Server Actions. None calls a model:

- The quest page's **Tasks** section, `/quests/QUEST_ID?section=tasks`, where `QUEST_ID` is the quest's id. A change there says what it did, with Undo, and a refused change says why in the same status line. A change that failed (it couldn't be saved, or the quest is gone) shows as an `Alert`, here and in the Tasks panel.
- **Commands** in the message box: typing "/" lists them, with how to write each and what it does. The arrow keys move through the list; Tab, Enter or a click picks one.

The commands are `/tasks`, `/add`, `/done`, `/reopen`, `/edit`, `/move`, `/drop`, `/recur`, `/once` and `/undo`. `/tasks` enters Tasks, so subsequent messages become open tasks until the spell changes or stops. `/done` without a task checks off the next task. `/move` places an open task among the open tasks, 1 being first. `/undo` undoes the user's last tasks change in this conversation that has something left to undo.

`TASK` is the task's number, with or without "#". In a quest's conversation, any message that starts with "/" and a name runs as a command: an unknown one says so under the message box and keeps the text.

A change made by a command is saved to the conversation as a task message: a user message whose one part is a `data-tasks-change` or `data-tasks-card` part. No reply answers one, so it never counts as a stopped reply. None is saved while the conversation's newest message awaits a reply, so a retry or "send again" always resends a conversation that ends in that message; the change itself is refused too, by the same check in its `insert … select`. The construct reads it on its next reply as a note marked `[Tasks change]`, and the tasks in its prompt is current anyway. Changes and Undo from the quest page save directly to Tasks. Their saved Tasks versions remain available, and the construct reads the current Tasks on its next reply.

Only the quest's owner and its accepted [members](multi-user-quests.md) can change its tasks. Each change records its author.

## Shared list controls

Tasks and Ideas share one editable list: rows, inline editing, adding, action menus and pointer or keyboard reordering. A toolbar counts open tasks beside the add control, square completion controls mark agreed work, and a leading rule identifies the next task. Done tasks stay folded below the open tasks until expanded. An empty list keeps the add control available. Open the Tasks section from Overview.

Domain modules validate text and save their own operations. A failed save keeps the editor and its draft open. Sidebar changes send commands and save their results in conversation history. Direct changes from the quest section add no conversation message.

## Storage

Each change saves one version: the whole tasks after it, what it did, the operations that undo it, the version it undid if it is an undo, its author, the person who made it and the conversation it was made in. The newest version is the tasks. A change is saved on top of the newest version in one `insert … select`, and tried again from the newest tasks when another change saved that version first. Unique indexes keep two changes, or two undos of one change, from both landing. Versions go with their quest; a deleted conversation or account leaves them, without the link. A version is open to its quest's owner and members.

## Quest context

Tasks holds agreed tasks; a quest has no separate Goal, Preferences or Journal. [Ideas](quest-ideas.md) separately holds saved possibilities and can move an idea into Tasks. Ideas are not model context. The model reads the current Tasks and the conversation, and can change agreed tasks with `change_tasks`. Quest starts keep their supplied context in the opening conversation.
