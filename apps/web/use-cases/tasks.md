# Tasks

A task is a list item in a task list ([`use_case_list_types`](lists.md#use_case_list_types)). Each list names checking off and unchecking in its own words.

## use_case_ask_whats_next

The user finds the quest's next task.

- **Prerequisites:** a quest with open tasks in its lists.
- **Steps:** open Quests and read Continue, or open the quest's Overview.
- **Outcome:** the next task is the first open task in the quest, taking its lists in order and each list's list items in their saved order. A quest with no open tasks has no next task.

## use_case_change_tasks

The user checks off, unchecks and edits the quest's tasks.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), with tasks in a list.
- **Steps:**
  - The user opens a list that holds tasks.
  - The user checks off a task, unchecks a checked-off one, adds one, edits one, moves one up or down, or removes one.
- **Outcome:** tasks show compact rows with square check-off controls, and the controls and feedback use the list's verbs, such as "Complete" and "Reopen". Each row's menu shows its stable task number. Each change is saved at once, makes no model request, and the page says what changed, with Undo. Undo puts the list back as it would be without that change, keeping later ones: a task edited again since keeps its newer text, a task removed since stays removed, and a task whose old neighbour was removed since goes back at the end. When nothing that change did is left to undo, Undo says so and changes nothing. A change refused for a reason, such as a missing task, says why in the same quiet line. A change that failed, because it couldn't be saved or the quest is no longer available, is an alert in the danger colour with the alert icon, announced at once. Checked-off tasks fold away under Done. The owner and accepted members share the tasks. Anyone else's quest, a pending invitee's or a removed member's included, looks exactly like one that doesn't exist, and they can't change its tasks.

## use_case_tasks_panel

- **Intent:** Change tasks from the quest page during a performance.
- **Steps:** With a performance active, open a list from Overview, then add, edit, reorder or check off a task.
- **Outcome:** The page saves the change directly and offers Undo. The same controls work whether or not a performance is active, and a task added by hand appears beside those added by messages.

## use_case_recurring_tasks

The user marks a task in Dailies to do every day.

- **Prerequisites:** [`use_case_dailies`](quests.md#use_case_dailies), with a task in one of its lists.
- **Steps:** the user opens the task's menu and chooses Make recurring. Later, they can choose Make one-off, to change it back.
- **Outcome:** the task shows a repeat icon. The page says what changed, with Undo, as for any task change. Each Start Day unchecks the task if it is checked off ([`use_case_start_day`](quests.md#use_case_start_day)), while a checked-off one-off task stays checked off.
- **Variations:**
  - Tasks in a quest not started as Dailies have no Make recurring.
- **Next:**
  - `use_case_daily_streaks`: see how often each recurring task gets done.

## use_case_daily_streaks

The user sees how many days in a row they have checked off each recurring task.

- **Prerequisites:** `use_case_recurring_tasks`, and days begun with [`use_case_start_day`](quests.md#use_case_start_day).
- **Steps:**
  - The user looks at a recurring task in its list.
  - The user opens Day grid from Dailies Overview.
- **Outcome:** each recurring task shows its streak chain under its text: one filled link for each day in a row, up to the current day, on which it was checked off, then the current day's link, dashed until the task is checked off. A line under the chain gives the streak and what checking the task off does next, such as "4-day streak. Check it off to make it 5." The current day counts once the task is checked off, and an open task doesn't end the streak until the next Start Day. A day the task wasn't checked off ends the streak. So does a gap: a calendar date with no day started. Two days started on one date count as one date. The separate Day grid tab shows each recurring task's last seven dates: filled when checked off, empty when not, and dashed for a gap. Screen readers announce each date's weekday, date and mark.
- **Variations:**
  - Before the first Start Day, the grid says that Start Day begins counting. With no recurring tasks, it says how to make one.
  - Before the first Start Day, a recurring task shows its repeat icon alone.
  - A recurring task with no streak shows only the current day's link and says "Check it off to start a streak."
  - The chain shows at most the 30 most recent links.
  - A date before a task became recurring shows as untracked.
  - A quest not started as Dailies shows no streaks or day grid.
