# Home

The conventions for these cases are in [the index](README.md#conventions).

## use_case_home_streaks

The user sees, and keeps up, every recurring task's streak in one place.

- **Prerequisites:** [`use_case_recurring_tasks`](tasks.md#use_case_recurring_tasks).
- **Steps:**
  - They open Home: the site's address with no path, or Home in the site panel. Signing in lands there.
  - They check off a square for a task on any of the last seven dates, or uncheck one.
  - They follow a quest's name.
- **Outcome:** Home starts with their experience: their circle's ring, its title, a bar toward the next circle, their experience and how much more the next circle needs, with a link to Profile's Experience card. Below it, Streaks lists each Active quest open to them that has a recurring task, oldest first. Each quest's name links to it, with its count of recurring tasks. Each of its recurring tasks has a row: a square for each of the last seven dates, up to the newest quest day among the quests, and its streak. Today's column is named Today. A square is filled when someone checked off the task that day, and empty when not. Checking off a square on the quest's today checks off the task itself, as in its list, and earns its experience. Checking off a square on an earlier date adds a check-off for that day and earns its experience. Unchecking one takes back every check-off that day. The streak follows either change, which shows at once and stays after a reload. A date before the task was added, or after its quest's today, can't be checked off. Screen readers announce each square's task, weekday and date, and whether it is checked off. On a phone each task's name sits above its squares, with its streak beside them, and nothing scrolls sideways.
- **Variations:**
  - With no recurring task in an Active quest, Streaks says how to make one.
  - A member sees the shared quest's streaks too, with days in the owner's time zone.
  - A quest that isn't open to them never shows, and its days can't be changed from Home.
- **Next:**
  - [`use_case_daily_streaks`](tasks.md#use_case_daily_streaks): see a task's streak chain in its list.
  - [`use_case_view_quests`](quests.md#use_case_view_quests): go to Quests, which sits under Home.
  - `use_case_home_tallies`: keep tallies up to date below Streaks.

## use_case_home_tallies

The user keeps every tally's daily counts up to date in one place.

- **Prerequisites:** [`use_case_tally_lists`](lists.md#use_case_tally_lists).
- **Steps:**
  - They open Home.
  - They choose a tally's total on any of the last seven dates, enter its new total and save it.
  - They choose a tally's Increment, enter an amount and add it.
- **Outcome:** below Streaks, Tallies lists each Active quest open to them that has a tally, oldest first. Each quest's name links to it, with its count of tallies. Each tally has a row: its name with its total under it, its day total on each of the last seven dates, up to the newest quest day among the quests, and Increment. Today's column is named Today. Saving a day's new total replaces that day's; Increment adds to the tally's quest's today. The row and the total follow at once and stay after a reload. A date after its quest's today shows no total and can't be changed. Amounts follow the same rules as on the tally's card. Screen readers announce each day's tally, weekday, date and total. On a phone each tally's name sits above its days, with Increment beside them, and nothing scrolls sideways.
- **Variations:**
  - With no tally in an Active quest, Tallies says how to make one.
  - A member sees the shared quest's tallies too, with days in the owner's time zone.
  - A quest that isn't open to them never shows, and its tallies can't be changed from Home.
- **Next:**
  - [`use_case_tally_lists`](lists.md#use_case_tally_lists): open a tally list to see each tally's bars.
