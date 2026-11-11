# Quest plan

Each quest has a plan: its ordered steps of remaining work, which the construct and the quest's people keep together. The plan is the Journal's first typed section. The construct changes it with a tool, and people change it directly, without a model call, from the quest's page, from the Plan panel beside a conversation, or with commands in the message box. The [glossary](../GLOSSARY.md#plan) defines the words this page uses, and the [design](design/quest-plan.md) records how the three ways in were chosen.

## Steps

A step is one line of at most 200 characters (`PLAN_STEP_TEXT` in `src/plan/plan.ts`), open or done. Each has a number, given in order and never given again, which names it for the whole of the quest, such as #3. A plan holds at most 30 open steps, counted on the plan a change leaves. Done steps keep their places, and the site shows them folded away under **Done**.

The next step is the plan's first open step. Home's Continue, the Plan panel and check-in openings read it through `nextStepOfQuest` in `src/memory/next-step.ts`. A quest whose plan has never had a step falls back to its Journal's line that starts "Next step:", which the construct kept before plans. Once the plan has had one, it alone says: an emptied plan, or one with every step done, has no next step. The premade quests' Journals hold no next step.

## Operations

`src/plan/plan.ts` alone knows what the operations do. The construct's tool, the user's controls and the commands all apply them through `applyPlanOperations`:

| Operation | Input | Effect |
| --- | --- | --- |
| `add` | text, optional `before` step | Adds an open step at the end, or before the given step. |
| `change` | step, text | Rewrites the step's text. |
| `complete` | step | Marks the step done. |
| `reopen` | step | Marks a done step open again. |
| `move` | step, optional `before` step | Moves the step before another, or to the end. |
| `remove` | step | Deletes the step. |

A batch applies all or none. It saves nothing if a step it names isn't there, if the plan it leaves would hold more than 30 open steps, or if no operation changes anything; an operation that changes nothing, such as completing a done step, is skipped. So a batch may add a step and remove another at the limit. Each change records what each operation did, in words, and the operations that undo it.

An undo (`applyPlanUndo`) keeps the changes made since. It skips an operation on a step removed since, and reverts a text only while the step still has the text the change set, so a newer edit stays. A removal or a move whose old neighbour was removed since goes back at the end. An undo with nothing left to do saves nothing and says so (`nothing-to-undo`).

## The construct

Every quest conversation's prompt lists the plan beside the Journal, between `<quest_plan>` tags, one step per line with its number and done steps marked (`src/replies/plan-prompt.ts`). The `change_plan` tool (`src/replies/tools/change-plan.ts`) takes a batch of operations and returns the plan after it, or the plan as it is and why nothing changed. The global prompt's plan rules (`src/replies/global-prompt.ts`) tell the construct to add only agreed steps, to check off a step the user finished, to keep a finished step apart from a milestone, never to count open steps or days, and to name steps by their `#` numbers rather than restate the plan as a list with its own numbering. `update_memory`'s description now sends remaining work and the next step to the plan.

The conversation shows each call as a **Plan change** with Undo (`src/components/chat/plan-change-part.tsx`), while the reply streams and after the user reopens the quest. The tool is active only in quest conversations.

## People

People change the plan through the Server Actions in `src/plan/plan-actions.ts`. None calls a model or spends batteries:

- The quest page's **Plan** section, `/projects/PROJECT_ID?section=plan`, where `PROJECT_ID` is the quest's id. A change there says what it did, with Undo, and a refused change says why in the same status line. A change that failed (it couldn't be saved, or the quest is gone) shows as an `Alert`, here and in the Plan panel.
- The **Plan panel** beside a quest's conversation: a column beside the conversation on a wide screen, and a button above it on a narrower one, which names the next step and opens the panel. Its controls wait while the conversation's last message awaits a reply: while one runs, here or for another member, and after one failed or stopped, so that Retry or "send again" still answers that message.
- **Commands** in the message box (`src/plan/plan-commands.ts`): typing "/" lists them, with how to write each and what it does. The arrow keys move through the list; Tab, Enter or a click picks one.

| Command | Effect |
| --- | --- |
| `/plan` | Shows the plan as a card with every control. Only the newest card holds them. |
| `/add TEXT` | Adds a step at the end. |
| `/done [STEP]` | Checks off the step, or the next step without one. |
| `/reopen STEP` | Reopens a done step. |
| `/edit STEP TEXT` | Changes a step's text. |
| `/move STEP PLACE` | Moves an open step to a place among the open steps, 1 being first. |
| `/drop STEP` | Removes a step. |
| `/undo` | Undoes the user's last plan change in this conversation that has something left to undo. |

`STEP` is the step's number, with or without "#". In a quest's conversation, any message that starts with "/" and a name runs as a command: an unknown one says so under the message box and keeps the text. In a standalone conversation, only a plan command's name runs, and says it needs a quest; any other "/word" message goes to the construct as written. While the mock model runs, its own `/mock-…` commands are listed too and still go to it as messages (`src/replies/mock-command-listings.ts`), so tests can drive `change_plan` with `/mock-tool change_plan …`.

A change made in a conversation, by the panel, a card or a command, is saved to the conversation as a plan message (`src/plan/plan-message.ts`): a user message whose one part is a `data-plan-change` or `data-plan-card` part. No reply answers one, so it never counts as a stopped reply, a conversation's naming or a reply's cost. None is saved while the conversation's newest message awaits a reply (`chatAwaitsReply` in `src/chats/store.ts`), so a retry or "send again" always resends a conversation that ends in that message; the change itself is refused too, by the same check in its `insert … select`. The construct reads it on its next reply as a note marked `[Plan change]` (`src/replies/plan-message-prompt.ts`), and the plan in its prompt is current anyway. A change made on the quest's page adds no message.

In a [team quest](team-projects.md), every member can change the plan and undo anyone's change. Each change records its author.

## Storage

The `plan_versions` table (`src/db/tables/plan-versions.ts`) holds one row per change: the whole plan after it, what it did, the operations that undo it, the version it undid if it is an undo, its author, the person who made it and the conversation it was made in. The newest version is the plan. A change is saved on top of the newest version in one `insert … select`, and tried again from the newest plan when another change saved that version first; a unique index on the quest and version, and another on the quest and the version undone, keep two changes, or two undos of one change, from both landing. Versions go with their quest; a deleted conversation or account leaves them, without the link.

`src/plan/plan-store.ts` is the only module that reads or writes the table. A version is open to everyone in its quest through `planVersionOpenTo` in `src/accounts/owner-scope.ts`. Migration 0050 adds the table; it is an additive migration, which the live build can run beside.

## Later

Moving existing Journals' "Next step:" lines into plans (#853), and typed Goal (#854), Preferences (#855) sections, are separate issues.

Quick Notes removal supersedes the separate-storage proposal (#856). Historical Note paragraphs remain ordinary Journal content, with no rewrite or migration.
