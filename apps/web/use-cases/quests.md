# Quests

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_quests

The user looks over their quests to find the one they want.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - They go to Quests.
- **Outcome:** the trail band reads Quests, with New quest at its right (`use_case_new_quest`). The page opens on one surface. First come any unanswered invitations, each a notice naming who invited them to which quest, with Accept and Decline ([`use_case_accept_pending_quest`](quest-members.md#use_case_accept_pending_quest)). Then their Life is pinned (`use_case_life`). Below it are a search (`use_case_find_quest`) and their other quests, their own and those they are a member of. Active, Completed and Abandoned form one segmented control, each with its count, Active by default, as described in [quest status](quest-status.md). Shared narrows the list to quests with others in them, and a sort orders it by recent activity, the default, by name or by newest. Each row shows the quest's construct's initial on a seal, its name, a running rite, a Shared or Shared by tag, how long ago something last happened in it, how many of its tasks were checked off this week, from Monday in its owner's time zone, when any were, and its count of open tasks. A task checked off and unchecked again does not count, and a recurring task counts once for each day it was done. Something happens in a quest when it starts, a task is added, a message is sent in one of its rites, or the user checks off a task or completes something in it. An Active quest with nothing happening for 30 days is marked Resting. The whole row opens the quest on Overview. A Completed or Abandoned row offers Restore quest. Opening the page creates nothing but their Life, if they have none yet, and makes no model call.
- **Next:**
  - `use_case_open_quest`: work on one of them.
  - `use_case_find_quest`: search for a quest or a task.
  - `use_case_new_quest`: start another.
  - [`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable): the list will not load.

## use_case_find_quest

The user searches for a quest or a task and checks a task off where it is found.

- **Prerequisites:** `use_case_view_quests`.
- **Steps:**
  - On Quests, they press / or choose the search, and type part of a quest's name or a task's text.
  - They check off a task in the results, or open its quest.
- **Outcome:** as they pause typing, the quest list gives way to results, and the search is kept in the address as `?q=`. Quests lists the quests open to them whose names hold the search, of any status, their Life included. Tasks lists the tasks of their Active quests whose text holds the search, from task lists only, with how many are open and how many were done today. Lists and other list items are never searched. Matching ignores case, and the matching text is marked. Each task shows its quest, a recurring task how often it repeats and its streak, and Open leads to its quest. Its checkbox checks it off or unchecks it in place, as in the quest. One-off tasks checked off before today are folded under Show N tasks checked off earlier. Clear, or Escape in the search, empties it and brings the list back.

## use_case_new_quest

The user starts a quest to learn, make or do something.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - On Quests, they choose New quest in the trail band. A dialog asks for the quest's name and an optional Why.
  - They name the quest, optionally fill in Why, and choose Start quest.
- **Outcome:** the quest opens on Overview. It has an empty Tasks list and an empty Ideas list, and no active performance. The Why becomes its starting context, which its construct reads. It is listed first under Active on Quests.
- **Variations:**
  - Cancelling the dialog, with its close button, Escape or a click outside, creates nothing and spends nothing.
  - Storage is unavailable: the dialog keeps its edits and explains why nothing was saved ([`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable)).
- **Next:**
  - `use_case_new_quest_without_name`: the name is empty.
  - `use_case_new_quest_with_construct`: the quest's construct.

## use_case_new_quest_with_construct

A new quest has the default construct.

- **Prerequisites:** signed in.
- **Steps:** start a quest, with no construct selector.
- **Outcome:** the quest uses Vellum, and keeps it. The server ignores a submitted construct.

## use_case_new_quest_without_name

The user tries to start a quest without a name.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - They start a quest whose name is empty or only spaces.
- **Outcome:** the request is refused with a name error. No quest is made.
- **Next:**
  - `use_case_new_quest`: name it and start it again.

## use_case_new_quest_name_too_long

The site receives a quest start request with a name longer than 80 characters.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - A malformed request supplies a name longer than 80 characters.
  - The site refuses it before creating a quest.
- **Outcome:** the request fails with a shorter-name error. No quest is made. Spaces around the name don't count, and a name of exactly 80 characters is accepted.
- **Next:**
  - `use_case_new_quest`: give it a shorter name.

## use_case_open_quest

- **Prerequisites:** `use_case_view_quests`.
- **Steps:** Choose a quest, then open a list from Overview or Members from the quest panel. Use the link back to the quest to return.
- **Outcome:** Overview sits in the page's ornate frame. It shows the quest's name with its status and privacy on the same line, wrapping under it on a narrow screen, and then the add box: the search box of a list's page, such as "Search or add a task to Tasks", with the quest's lists under it as choices and New list. The add box starts on the first task list, marked in gold, and its section is marked in gold too. Typing narrows every section to the list items that contain the text, all of them rather than the first five, marks the match in each, and says how many match; a section with none says so. Enter adds the text to the chosen list, empties the field and keeps focus in it, so the next list item can follow at once, unless that list already has a list item with the same text; then the box says so and adds nothing. Escape empties the box. Choosing another list moves the field to it. New list turns the field to naming a new task list; Enter makes it and moves the add box to it, and Escape goes back. Under the add box, each of the quest's lists has a section, in the lists' order, between ornamented rules. A section's heading names the list, linked to it, with its size, then Add and a candle that opens Perform a rite. Add opens an editor above the section's list items that stays open after each one; Done or Escape closes it. A section shows its first five list items, which the user checks off and edits in place, and a link to the rest, such as "2 more in Tasks". List items added on the page stay in view. A task list's section shows its open one-off tasks and its recurring tasks, each recurring task with its streak, and counts the open ones. A one-off task checked off there leaves the section at once; a recurring task stays in its place, struck through until its next period. The next task is marked with a pointing hand. The quest panel holds Members, Complete and Abandon, and the Timer; it docks on wide screens and opens as a drawer on phones, which closes when the user follows Members. The title in the trail band opens its rename editor. While a performance is active, it shows after the sections and the sections have no candle.
- **Next:**
  - `use_case_quest_panel`: see the quest's members or change its status.
  - [`use_case_perform_rite`](performances.md#use_case_perform_rite): perform a rite on one of the lists.
- **Access:** Only the quest's owner and accepted members can open it.

## use_case_quest_panel

The user finds who is in a quest and ends it, from beside any of its pages.

- **Prerequisites:** `use_case_open_quest`.
- **Steps:** Open the quest panel.
- **Outcome:** the quest panel starts with Members, which says how many are in the quest, such as "Just you. Invite others by email." or "3 in this quest", and opens the Members page. Under it, Complete and Abandon sit side by side, or Restore quest once the quest has ended, with what they did and Undo beneath them. Life has no status controls. The Timer comes last.
- **Next:**
  - [`use_case_invite_to_quest`](quest-members.md#use_case_invite_to_quest): invite someone from Members.
  - [`use_case_change_quest_status`](quest-status.md#use_case_change_quest_status): complete or abandon the quest.

## use_case_life

Every user has one Life, a quest for the things they do every day.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - They go to Quests, or list their quests through the API.
  - On Quests, they check off the Suggested task, or choose Open.
- **Outcome:** a user without a Life gets one, named Life, with a Tasks list and an Ideas list. They never have two. Quests pins it above their other quests, with a sun on its seal. Its name and Open both open it. The pin says how many of its recurring tasks are done, as 3 of 5 recurring done today; a weekly or monthly task counts as done until its week or month ends. Under it, Suggested offers one of those not done yet, picked at random, with how often it repeats and its streak, to check off in place; once it is checked off, another takes its place, until all are done. Only Life's recurring tasks are suggested. Life is otherwise like any quest: it has a next task, members can join it, and any of its tasks can be made to repeat daily, weekly or monthly. It stays Active: it has no status controls, and a request to complete or abandon it is refused.
- **Next:**
  - [`use_case_recurring_tasks`](tasks.md#use_case_recurring_tasks): make tasks repeat daily, weekly or monthly.

## use_case_rename_quest

Anyone in the quest, its owner or an accepted member, changes the quest title inline on its overview.

- **Prerequisites:** signed in as the quest's owner or one of its members.
- **Steps:** choose the pencil beside the quest name, enter the name, then choose Save title or press Enter.
- **Outcome:** the trimmed title is saved and appears as the quest's heading, in its list. Cancel title edit or Escape discards the draft. Closing the editor returns focus to Rename. Empty names and names longer than 80 characters are refused; failures retain the draft for retry. Pending saves prevent duplicate submissions and cancellation. Everyone in the quest sees the new name. Other users, a pending invitee or removed member included, cannot rename the quest.

## use_case_tailored_quest_overviews

- **Steps:** Open an Active quest, then a Completed one.
- **Outcome:** each quest's Overview shows its lists' sections and marks its next task. A Completed or Abandoned quest's Overview says so, and its quest panel offers Restore quest. While a quest is Active, its construct's portrait and name sit after the breadcrumbs and before the quest panel control, clear of docked panels, and open the construct's profile ([`use_case_view_character_profile`](constructs.md#use_case_view_character_profile)). A Completed or Abandoned quest's trail band shows no construct.
