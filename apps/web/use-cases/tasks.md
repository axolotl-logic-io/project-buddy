# Tasks

A task is a list item in a task list ([`use_case_list_types`](lists.md#use_case_list_types)). Each list names checking off and unchecking in its own words.

## use_case_ask_whats_next

The user finds the quest's next task.

- **Prerequisites:** a quest with open tasks in its lists.
- **Steps:** open the quest's Overview and look for the pointing hand.
- **Outcome:** the next task is the first open task in the quest, taking its lists in order and each list's list items in their saved order, and a pointing hand, read as Next task, marks it in its list's section. A quest with no open tasks has no next task.

## use_case_change_tasks

The user checks off, unchecks and edits the quest's tasks.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), with tasks in a list.
- **Steps:**
  - The user opens a list that holds tasks.
  - The user checks off a task, unchecks a checked-off one, adds one, edits one, moves one up or down, or removes one.
- **Outcome:** tasks show compact rows with square check-off controls, and the controls say "Check off" and "Uncheck". Each row's menu shows its stable task number. Each change shows at once, before the server replies. It makes no model request, and the page says what changed, with Undo. If the server refuses it, the change is undone. Undo puts the list back as it would be without that change, keeping later ones: a task edited again since keeps its newer text, a task removed since stays removed, and a task whose old neighbour was removed since goes back at the end. When nothing that change did is left to undo, Undo says so and changes nothing. A change refused for a reason, such as a missing task, says why in the same quiet line. A change that failed, because it couldn't be saved or the quest is no longer available, is an alert in the danger colour with the alert icon, announced at once. Checked-off tasks sit under Done, with their count, after the open ones. The owner and accepted members share the tasks. Anyone else's quest, a pending invitee's or a removed member's included, looks exactly like one that doesn't exist, and they can't change its tasks.
- **Next:**
  - [`use_case_home_tasks`](home.md#use_case_home_tasks): check off one-off tasks from every Active quest on Home.

## use_case_tasks_panel

- **Intent:** Change tasks from the quest page during a performance.
- **Steps:** With a performance active, open a list from Overview, then add, edit, reorder or check off a task.
- **Outcome:** The page saves the change directly and offers Undo. The same controls work whether or not a performance is active, and a task added by hand appears beside those added by messages.

## use_case_recurring_tasks

The user marks a task to do every day, every week or every month.

- **Prerequisites:** a task in an Active quest open to the user, their own or one they are a member of.
- **Steps:** the user opens the task's menu and chooses Repeat daily, Repeat weekly or Repeat monthly. Later, they can choose another of them, or Make one-off to change it back.
- **Outcome:** the task shows a repeat icon, named by its cadence, such as "Repeats weekly". The page says what changed, with Undo, as for any task change. When the task's next period starts in the quest owner's time zone ([`use_case_set_time_zone`](accounts.md#use_case_set_time_zone)), a checked-off recurring task reads as unchecked again, keeping its text, number and place: a daily task at midnight, a weekly one at midnight on Monday and a monthly one at midnight on the 1st. A checked-off one-off task stays checked off. Starting a new period takes back no experience, and checking the task off again earns it again.
- **Variations:**
  - A list item in a plain or quick-note list has no Repeat choices.
  - A task checked off this week that changes from daily to weekly stays checked off until Monday.
  - Midnight is the same for everyone in a shared quest: the owner's.
- **Next:**
  - `use_case_daily_streaks`: see how often each recurring task gets done.

## use_case_daily_streaks

The user sees how many days, weeks or months in a row they have checked off each recurring task.

- **Prerequisites:** `use_case_recurring_tasks`.
- **Steps:**
  - The user looks at a recurring task in its list.
  - The user looks at its list's section on the quest's Overview, which shows each recurring task with its streak chain.
- **Outcome:** each recurring task shows its streak chain under its text: one filled link for each period of its cadence in a row, up to the current one, in which someone checked it off, then the current period's link, dashed until the task is checked off. A line under the chain gives the streak and what checking the task off does next, such as "4-day streak. Check it off to make it 5." or "2-week streak.". The current period counts once the task is checked off, and an open task doesn't end the streak until the period ends. A period the task wasn't checked off in ends the streak. Each day starts at midnight in the quest owner's time zone, each week on Monday and each month on the 1st.
- **Variations:**
  - A recurring task with no streak shows only today's link and says "Check it off to start a streak."
  - The chain shows at most the 30 most recent links.
  - A period that ended before the task was added shows as not added yet.
  - A check-off by any member counts toward the streak.
  - Home shows every quest's streaks together, and checks them off in any of the last seven periods ([`use_case_home_streaks`](home.md#use_case_home_streaks)).
