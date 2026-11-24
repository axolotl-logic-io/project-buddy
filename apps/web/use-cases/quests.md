# Quests

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_quests

The user looks over their quests and the ways to start one.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - They go to Quests.
- **Outcome:** the page opens with its heading and a line inviting them to pick up where they left off or start something new. Below it, Continue offers their current quest (`use_case_continue_quest`), when they have an Active one. Start a quest then offers four starting points as a strip of tiles, Dailies, Learn a thing, Make a thing and Do a thing (`use_case_browse_premade_quests`). Last, Active, Completed and Abandoned tabs, each with its count, list the quests open to them, their own and those they are a member of, as compact rows, newest first, Active by default, as described in [quest status](quest-status.md). A Pending tab, also with its count, lists their unaccepted quest invitations ([`use_case_accept_pending_quest`](quest-members.md#use_case_accept_pending_quest)). Each row links to the quest, which opens on Overview. With no quests, the page says there are none yet and points to the starting points above. Nothing sits in a frame of its own, and on a phone the tiles are two by two. Merely opening the page creates nothing and makes no model call.
- **Next:**
  - `use_case_continue_quest`: pick up the quest they were last working on.
  - `use_case_open_quest`: work on one of them.
  - `use_case_new_quest`: start another.
  - [`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable): the list will not load.

## use_case_continue_quest

The user picks up the quest they were last working on.

- **Prerequisites:** `use_case_new_quest`, with at least one Active quest.
- **Steps:**
  - They go to Quests and choose Continue.
- **Outcome:** above Start a quest, Continue names their current quest: the Active quest open to them, their own or one they are a member of, with the newest message in any of its performances, or, for one with none, that started most recently. It shows the quest's next task when it has one ([`use_case_ask_whats_next`](tasks.md#use_case_ask_whats_next)). Continue opens the quest on Overview. Completed and Abandoned quests, pending invitations and quests not open to them are never offered. With no Active quest, there is no Continue. Showing it makes no model call and spends nothing.
- **Next:**
  - [`use_case_send_message`](performances.md#use_case_send_message): carry on sending messages.

## use_case_new_quest

The user starts a quest to learn, make or do something.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - Under Start a quest, they choose Learn a thing, Make a thing or Do a thing. A modal opens with an optional Why field. The name and starting context come from the starting point automatically.
  - They optionally fill in Why, and choose Start quest.
- **Outcome:** the quest opens on Overview. It has an empty Tasks list and an empty Ideas list, and no active performance. Each starting point can be used again for another quest. The quest is first in their quests list.
- **Variations:**
  - Closing the details instead creates nothing and spends nothing.
  - Storage is unavailable: the details retain their edits and explain why nothing was saved ([`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable)).
- **Next:**
  - `use_case_new_quest_without_name`: an invalid request has no name.
  - `use_case_new_quest_with_construct`: the starting point assigns its construct.

## use_case_new_quest_with_construct

Each starting point assigns the quest’s construct.

- **Prerequisites:** signed in.
- **Steps:** choose a starting point and start the quest, with no construct selector.
- **Outcome:** Dailies and Learn a thing use Vellum. Make a thing and Do a thing use Lumen. The server ignores submitted construct overrides. Existing quests keep their saved construct.

## use_case_new_quest_without_name

The site receives a quest start request without a name.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - A malformed request supplies an empty or whitespace-only name. The normal start dialog supplies the starting point’s name automatically.
- **Outcome:** the request is refused with a name error. No quest is made.
- **Next:**
  - `use_case_new_quest`: start from a quest’s normal start dialog.

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
- **Steps:** Choose a quest, then open a section from Overview. Use Back to overview to return.
- **Outcome:** Overview shows a summary of each of the quest's lists, Performances, Rites & status, and Members. An ordinary quest shows Next task. Each section has its own actions. The title in the trail band opens its rename editor. The Timer panel docks on wide screens and opens as a drawer on phones. The active performance appears below the workspace.
- **Access:** Only the quest's owner and accepted members can open it.

## use_case_dailies

The user starts a quest for the things they do every day.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:** under Start a quest, they choose Dailies and choose Start quest. Dailies offers no Why field.
- **Outcome:** a new quest named Dailies opens on Overview. It works like any other quest: it has Next task and Day grid, members can join it, and any of its tasks can be made recurring. Each start makes a new quest, as for the other starting points.
- **Next:**
  - [`use_case_recurring_tasks`](tasks.md#use_case_recurring_tasks): mark the tasks to do every day.

## use_case_browse_premade_quests

The user looks at the ways to start a quest without starting one.

- **Prerequisites:** signed in on Quests.
- **Steps:** under Start a quest, they read the four starting points, choose one, review its description and optional Why, then cancel.
- **Outcome:** Dailies, Learn a thing, Make a thing and Do a thing are tiles, each with an icon, its name and one short line on what it is for. A whole tile is one target, named by its starting point; there is no separate Choose button. Choosing one opens a modal dialog with what it is for in full. Learn a thing, Make a thing and Do a thing also offer an optional Why field; Dailies requires no additional fields. Focus stays in the dialog until Cancel, Escape or a click outside closes it and returns focus to its tile. Opening and closing details makes no quest and no model call, and spends nothing.

## use_case_rename_quest

Anyone in the quest, its owner or an accepted member, changes the quest title inline on its overview.

- **Prerequisites:** signed in as the quest's owner or one of its members.
- **Steps:** choose the pencil beside the quest name, enter the name, then choose Save title or press Enter.
- **Outcome:** the trimmed title is saved and appears as the quest's heading, in its list. Cancel title edit or Escape discards the draft. Closing the editor returns focus to Rename. Empty names and names longer than 80 characters are refused; failures retain the draft for retry. Pending saves prevent duplicate submissions and cancellation. Everyone in the quest sees the new name. Other users, a pending invitee or removed member included, cannot rename the quest.

## use_case_tailored_quest_overviews

- **Steps:** Open an Active quest, then a Completed one.
- **Outcome:** each quest's Overview shows Next task and links to its lists, Rites & status, Performances, Day grid and Members, whichever starting point it came from. While a quest is Active, its construct's portrait and name sit after the breadcrumbs and before the Timer panel control, clear of docked panels, and open the construct's profile ([`use_case_view_character_profile`](constructs.md#use_case_view_character_profile)). A Completed or Abandoned quest's trail band shows no construct.
