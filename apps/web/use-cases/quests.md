# Quests

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_quests

The user looks over their quests and the ways to start one.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - They go to Quests.
- **Outcome:** the page opens with its heading and a line inviting them to pick up where they left off or start something new. Below it, Continue offers their current quest (`use_case_continue_quest`), when they have an Active one. Start a quest then offers four starting points as a strip of tiles, Dailies, Learn a thing, Make a thing and Do a thing (`use_case_browse_premade_quests`). Last, Active, Completed and Abandoned tabs, each with its count, list their quests as compact rows, newest first, Active by default, as described in [quest status](quest-status.md). Each row links to the quest, which opens on its conversation. With no quests, the page says there are none yet and points to the starting points above. Nothing sits in a frame of its own, and on a phone the tiles are two by two. Merely opening the page creates nothing and makes no model call.
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
- **Outcome:** above Start a quest, Continue names their current quest: their own Active quest whose conversation has the newest message, or, for one with no messages, that started most recently. It shows the quest's next step when it has one: the first open step of its plan. Continue opens the quest on its conversation. Completed and Abandoned quests, Chat and other users' quests are never offered. With no Active quest, there is no Continue. Showing it makes no model call and spends nothing.
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): carry on the conversation.

## use_case_new_quest

The user starts a quest to learn, make or do something.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - Under Start a quest, they choose Learn a thing, Make a thing or Do a thing. A modal opens with an optional Why field. The name and starting context come from the starting point automatically.
  - They optionally fill in Why, and choose Start quest.
- **Outcome:** the quest opens straight on its one conversation, with no further step, and already holds the construct's local command greeting. Any starting context or Why appears as a user message before the opening. Plan starts empty and no spell is active. Each starting point can be used again for another quest. The quest is first in their quests list.
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

The user opens one of their quests, from Quests.

- **Prerequisites:** `use_case_view_quests`.
- **Steps:**
  - They open the quest.
- **Outcome:** the quest opens on its one continuing conversation, with the composer ready, under the quest's title, the page's heading in the site header's trail band, and a collapsible sidebar for Plan, Ideas and Progress. A pencil beside the quest name opens the rename dialog. The composer offers `/complete`, `/abandon` and `/restore` for quest status changes. There is no list of conversations to choose from and nothing to start. The sidebar holds the quest’s Plan; on phones it opens as a drawer. Opening the quest shows saved messages without sending a reply request. Plan, Ideas and Progress are tabs at the top of the sidebar; switching tabs retains drafts. The sidebar docks flush with the page edge on wide screens. On phones it starts collapsed; the panel icon opens a modal drawer, and Escape closes it without losing edits or scrolling the page sideways.
- **Variations:**
  - The Dailies quest: `use_case_dailies`.
  - Another user's quest is not found ([`use_case_private_data`](accounts.md#use_case_private_data)).
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): carry on the conversation.
  - [`use_case_change_plan`](plan.md#use_case_change_plan): see where the quest stands.
  - `use_case_view_progress_timeline`: see how far they have come.

## use_case_dailies

The user starts their day in Dailies, their one ongoing quest for it.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - Under Start a quest, they choose Dailies and choose Start quest. The first start offers no Why field.
  - On a later day, they choose Dailies under Start a quest again, which opens their Dailies quest, or open it from their quests list or Continue.
  - They choose Reset Day above the workspace tabs and confirm in a modal. They can choose to remove Steps and Ideas separately; both options are off by default.
- **Outcome:** Dailies is a quest like any other, with its name, Plan and conversation theirs to change. It opens with local command guidance. Reset Day clears the conversation and active spell and starts an empty conversation with the same construct, without a model request. Plan and Ideas endure; completed Plan steps become open again, keeping their text, numbers and order. Progress and quest status remain. Opening the quest sends nothing. Starting Dailies again, even twice at once, opens the same quest; renaming it doesn't make another. There are no streaks, missed days or deadlines.
- **Variations:**
  - A quest the user named Dailies by hand has no Reset Day: only a quest started as Dailies offers it.

## use_case_view_progress_timeline

The user looks back at what the user has done in a quest.

- **Prerequisites:** `use_case_open_quest`.
- **Steps:**
  - The user looks at the quest's progress timeline on its page.
- **Outcome:** the timeline lists every milestone of the quest, newest first, each with the day it was recorded and its text. Milestones of their other quests, and of other users, don't appear. With none yet, the timeline says no milestones have been recorded.
- **Next:**
  - `use_case_edit_milestone`: change or remove one.

## use_case_edit_milestone

The user changes or deletes a milestone on the progress timeline.

- **Prerequisites:** `use_case_view_progress_timeline`, with a recorded milestone.
- **Steps:**
  - The user chooses to edit a milestone, changes its text and saves it. Or the user cancels, and it stays as it was.
  - The user chooses to delete another, and confirms.
- **Outcome:** the edited milestone shows their text, with the same day as before. The deleted one is gone from the timeline, and the conversation is unchanged. Text that is empty, longer than one line or over 200 characters is refused with the reason, and their text stays in the field. Another user's milestone looks exactly like one that doesn't exist.
- **Next:**
  - `use_case_view_progress_timeline`: look over the result.

## use_case_browse_premade_quests

The user looks at the ways to start a quest without starting one.

- **Prerequisites:** signed in on Quests.
- **Steps:** under Start a quest, they read the four starting points, choose one, review its description and optional Why, then cancel.
- **Outcome:** Dailies, Learn a thing, Make a thing and Do a thing are tiles, each with an icon, its name and one short line on what it is for. A whole tile is one target, named by its starting point; there is no separate Choose button. Choosing one opens a modal dialog with what it is for in full. Learn a thing, Make a thing and Do a thing also offer an optional Why field; Dailies requires no additional fields. Focus stays in the dialog until Cancel, Escape or a click outside closes it and returns focus to its tile. Opening and closing details makes no quest and no model call, and spends nothing. Once they have a Dailies quest, its tile opens it instead.

## use_case_rename_quest

The owner changes the quest title inline on its overview.

- **Prerequisites:** signed in as the quest owner.
- **Steps:** choose the pencil beside the quest name, enter the name, then choose Save title or press Enter.
- **Outcome:** the trimmed title is saved and appears as the quest's heading, in its list. Cancel title edit or Escape discards the draft. Closing the editor returns focus to Rename. Empty names and names longer than 80 characters are refused; failures retain the draft for retry. Pending saves prevent duplicate submissions and cancellation. Other users cannot rename the quest.
