# Tasks

## use_case_ask_whats_next

The user finds the next task in a quest's Tasks.

- **Prerequisites:** a quest whose Tasks holds agreed tasks.
- **Steps:** open Quests and read Continue, or open the quest's Tasks.
- **Outcome:** the next task is the first open task. A quest with no open tasks has no next task. Asking the local construct in prose returns command guidance; it does not infer an answer from the Tasks.

## use_case_change_tasks

The user changes the quest's tasks herself, without the construct.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - The user opens the quest's Tasks section.
  - The user checks off a task, reopens a done one, adds one, edits one, moves one up or down, or removes one.
- **Outcome:** the Tasks shows compact task rows with square completion controls. Clicking a task’s text opens the shared inline editor. Enter, Save or clicking outside commits and closes it; clicking another task also opens that editor. Escape or Cancel discards the draft. Failed saves retain the draft. Add a task opens a new row above the list and saves the new task at the end of the Tasks. Drag a row’s handle to reorder it, or focus the handle and use the arrow keys. Each row’s menu offers Move up, Move down and Remove task, and shows its stable task number. Each change is saved at once, makes no model request, and the page says what changed, with Undo. Undo puts the tasks back as it would be without that change, keeping later ones: a task edited again since keeps its newer text, a task removed since stays removed, and a task whose old neighbour was removed since goes back at the end. When nothing that change did is left to undo, Undo says so and changes nothing. A change refused for a reason, such as a missing task, says why in the same quiet line. A change that failed, because it couldn't be saved or the quest is no longer available, is an alert in the danger colour with the alert icon, announced at once. A task must be one line of at most 200 characters; empty text is refused with the reason, and their text stays in the field. The Tasks has no limit on the number of open or done tasks. Done tasks fold away under Done. The owner and accepted members share the tasks. Anyone else's quest, a pending invitee's or a removed member's included, looks exactly like one that doesn't exist, and they can't change its tasks.

## use_case_tasks_panel

- **Intent:** Change Tasks from the quest page.
- **Steps:** Open Tasks from Overview, then add, edit, reorder or complete a task.
- **Outcome:** The page saves the change directly and offers Undo. The same controls work while a spell is active or a reply is in progress.

## use_case_recurring_tasks

The user marks a task in Dailies to do every day.

- **Prerequisites:** [`use_case_dailies`](quests.md#use_case_dailies), with a task in its Tasks.
- **Steps:** the user opens the step's menu and chooses Make recurring. Later, they can choose Make one-off, to change it back.
- **Outcome:** the task shows a repeat icon. The page says what changed, with Undo, as for any tasks change. Each Start Day reopens the task if it is done ([`use_case_start_day`](quests.md#use_case_start_day)), while a done one-off task stays done.
- **Variations:**
  - Tasks in a quest not started as Dailies have no Make recurring.
- **Next:**
  - `use_case_daily_streaks`: see how often each recurring task gets done.

## use_case_daily_streaks

The user sees how many days in a row they have done each recurring task.

- **Prerequisites:** `use_case_recurring_tasks`, and days begun with [`use_case_start_day`](quests.md#use_case_start_day).
- **Steps:**
  - The user looks at a recurring task in Tasks.
  - The user opens Day grid from Dailies Overview.
- **Outcome:** each recurring task shows its streak chain under its text: one filled link for each day in a row, up to the current day, on which it was done, then the current day's link, dashed until the task is done. The chain ends at the next milestone: 3, 7, 14 or 30 days, then every 30 days. A line under the chain gives the streak and what checking the task off does next, such as “4-day streak. Check it off to make it 5.” The current day counts once the task is done, and an open task doesn't end the streak until the next Start Day. A day the task wasn't done ends the streak. So does a gap: a calendar date with no day started. Two days started on one date count as one date. The separate Day grid tab shows each recurring task's last seven dates: filled when done, empty when not, and dashed for a gap. Screen readers announce each date's weekday, date and mark.
- **Variations:**
  - Before the first Start Day, the grid says that Start Day begins counting. With no recurring tasks, it says how to make one.
  - Before the first Start Day, a recurring task shows its repeat icon alone.
  - A recurring task with no streak shows an empty chain toward 3 and says “Check it off to start a streak.”
  - On the day a streak reaches a milestone, the chain is full and the line says “Milestone reached.”
  - Past 30 days, the chain starts at the last multiple of 30, so it never has more than 30 links.
  - A date before a task became recurring shows as untracked.
  - A quest not started as Dailies shows no streaks or day grid.
