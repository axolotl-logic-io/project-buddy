# Dailies

Dailies is the user's one ongoing quest for starting the day ([Premade quests](premade-quests.md)). This page covers what only Dailies has: Start Day, recurring tasks and their streaks. The [glossary](../GLOSSARY.md#dailies) defines the words it uses.

## Start Day

A day begins only when the user chooses **Start Day** in the quest sidebar's Actions tab and confirms. Nothing starts a day on a timer. Under the button, a line says how long ago the last day started: in hours for the first two days, then in days. The browser fills in the line after the page loads, because only the browser knows its own clock.

Start Day (`startDay` in `apps/web/src/dailies/day-store.ts`) does all of this in one transaction:

1. It records how the last day ended: each recurring task, and whether it was done.
2. It reopens the done recurring tasks as one tasks change, so the change has its own Tasks version. One-off tasks stay done or open.
3. If the user chose to, it removes every task, every Idea, or both.
4. It sets the old conversation aside and opens an empty conversation with the same construct, without a model request. The old conversation's artwork moves to the new conversation ([Construct visuals](construct-visuals.md)).
5. It records the new day, dated with the browser's calendar date when the user confirmed.

The server takes the browser's date only when it is within two days of the server's own UTC date (`dayDate` in `apps/web/src/dailies/dailies.ts`). Otherwise, it uses the server's date.

## Undo Start Day

Until anyone sends a message in the new day's conversation, the Actions tab offers **Undo Start Day** (`undoStartDay`). It brings back the conversation from before, with its messages, active spell and artwork. It undoes the Start Day tasks change and puts back the removed Ideas. A task added since stays, because the undo keeps later changes ([Quest tasks](quest-tasks.md#operations)). The day's record is deleted, and the day before is going again.

To make Undo possible, Start Day doesn't delete the old conversation. It parks it: the conversation leaves the quest and belongs to the user alone, so no page opens it. The next Start Day deletes the parked conversation. Until then, a milestone recorded in it still links to it.

## Recurring tasks

In the Dailies quest, each task's menu offers **Make recurring** or **Make one-off**. These use the `recur` tasks operation, so they save a tasks change with Undo like any other. A recurring task is saved with `recurring: true`, and a one-off task has no mark. The construct sees recurring tasks marked `[recurring]` in its prompt.

## Streaks

A recurring task's streak is the number of dates in a row, up to the current day, on which the task was done (`streaks` in `apps/web/src/dailies/dailies.ts`). The task's row in Tasks shows it beside a repeat icon.

- The current day counts once the task is done. An open task doesn't end the streak until the next Start Day records it.
- A date on which the task wasn't done ends the streak.
- A gap ends every streak. A gap is a calendar date between two days with no day started on it.
- Two days started on one date count as one date, done if the task was done in either.

The Progress section's [day grid](progress-timeline.md#day-grid) shows each recurring task's last seven dates. A date before the task became recurring shows as untracked.

## Storage

The `dailies_days` table (`apps/web/src/db/tables/dailies-days.ts`) holds one row per day, with its quest, its date, when it started, its conversation and, once it has ended, its recurring tasks. Each row also keeps what Undo needs: the parked conversation and its spell, the Start Day tasks version and the removed Ideas. Rows are deleted with their quest. `apps/web/src/dailies/day-store.ts` is the only module that reads or writes the table, and a day is open to the quest's owner alone.
