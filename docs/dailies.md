# Dailies

Dailies is the user's one ongoing quest for starting the day ([Premade quests](premade-quests.md)). This page covers what only Dailies has: Start Day, recurring steps and their streaks. The [glossary](../GLOSSARY.md#dailies) defines the words it uses.

## Start Day

A day begins only when the user chooses **Start Day** in the quest sidebar's Actions tab and confirms. Nothing starts a day on a timer. Under the button, a line says how long ago the last day started: in hours for the first two days, then in days. The browser fills in the line after the page loads, because only the browser knows its own clock.

Start Day (`startDay` in `apps/web/src/dailies/day-store.ts`) does all of this in one transaction:

1. It records how the last day ended: each recurring step, and whether it was done.
2. It reopens the done recurring steps as one tasks change, so the change has its own Tasks version. One-off steps stay done or open.
3. If the user chose to, it removes every step, every Idea, or both.
4. It sets the old conversation aside and opens an empty conversation with the same construct, without a model request. The old conversation's artwork moves to the new conversation ([Construct visuals](construct-visuals.md)).
5. It records the new day, dated with the browser's calendar date when the user confirmed.

The server takes the browser's date only when it is within two days of the server's own UTC date (`dayDate` in `apps/web/src/dailies/dailies.ts`). Otherwise, it uses the server's date.

## Undo Start Day

Until anyone sends a message in the new day's conversation, the Actions tab offers **Undo Start Day** (`undoStartDay`). It brings back the conversation from before, with its messages, active spell and artwork. It undoes the Start Day tasks change and puts back the removed Ideas. A step added since stays, because the undo keeps later changes ([Quest tasks](quest-tasks.md#operations)). The day's record is deleted, and the day before is going again.

To make Undo possible, Start Day doesn't delete the old conversation. It parks it: the conversation leaves the quest and belongs to the user alone, so no page opens it. The next Start Day deletes the parked conversation. Until then, a milestone recorded in it still links to it.

## Recurring steps

In the Dailies quest, each step's menu offers **Make recurring** or **Make one-off**. These use the `recur` tasks operation, so they save a tasks change with Undo like any other. A recurring step is saved with `recurring: true`, and a one-off step has no mark. The construct sees recurring steps marked `[recurring]` in its prompt.

## Streaks

A recurring step's streak is the number of dates in a row, up to the current day, on which the step was done (`streaks` in `apps/web/src/dailies/dailies.ts`). The step's row in Tasks shows it beside a repeat icon.

- The current day counts once the step is done. An open step doesn't end the streak until the next Start Day records it.
- A date on which the step wasn't done ends the streak.
- A gap ends every streak. A gap is a calendar date between two days with no day started on it.
- Two days started on one date count as one date, done if the step was done in either.

The Progress section's [day grid](progress-timeline.md#day-grid) shows each recurring step's last seven dates. A date before the step became recurring shows as untracked.

## Storage

The `dailies_days` table (`apps/web/src/db/tables/dailies-days.ts`) holds one row per day, with its quest, its date, when it started, its conversation and, once it has ended, its recurring steps. Each row also keeps what Undo needs: the parked conversation and its spell, the Start Day tasks version and the removed Ideas. Rows are deleted with their quest. `apps/web/src/dailies/day-store.ts` is the only module that reads or writes the table, and a day is open to the quest's owner alone.
