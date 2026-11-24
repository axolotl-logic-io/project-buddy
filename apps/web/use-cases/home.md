# Home

The conventions for these cases are in [the index](README.md#conventions).

## use_case_home_streaks

The user sees, and keeps up, every recurring task's streak in one place.

- **Prerequisites:** [`use_case_recurring_tasks`](tasks.md#use_case_recurring_tasks), and days begun with [`use_case_start_day`](quests.md#use_case_start_day).
- **Steps:**
  - They open Home: the site's address with no path, or Home in the site panel. Signing in lands there.
  - They check off a square for a task on any of the last seven dates, or uncheck one.
  - They follow a quest's name.
- **Outcome:** Home starts with their experience: their circle's ring, its title, a bar toward the next circle, their experience and how much more the next circle needs, with a link to Profile's Experience card. Below it, Streaks lists each Active Dailies quest they own that has a recurring task, oldest first. Each quest's name links to it, with its count of recurring tasks, and each of its recurring tasks has a row: a square for each of the last seven dates, up to the newest day started in any of the quests, and its streak. Today's column is named Today. A square is filled when the task was checked off that date, empty when not, and dashed for a gap, a date with no day started. Checking off a square on the current day checks off the task itself, as in its list, and earns its experience. Checking off a square on an earlier date changes what that day recorded, and the streak follows. Either one shows at once and stays after a reload. A gap and a date before the task became recurring can't be checked off. Screen readers announce each square's task, weekday and date, and whether it is checked off. On a phone each task's name sits above its squares, with its streak beside them, and nothing scrolls sideways.
- **Variations:**
  - With no recurring task in an Active Dailies quest, Streaks says how to make one.
  - Before the first Start Day, Streaks says that Start Day begins counting.
  - A quest that is not theirs never shows, and its days can't be changed from Home.
- **Next:**
  - [`use_case_daily_streaks`](tasks.md#use_case_daily_streaks): see a task's streak chain in its list.
  - [`use_case_view_quests`](quests.md#use_case_view_quests): go to Quests, which sits under Home.
