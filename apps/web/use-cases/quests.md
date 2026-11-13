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

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), with batteries.
- **Steps:**
  - Under Start a quest, they choose Learn a thing, Make a thing or Do a thing. A modal opens with the construct, their New quest construct or Vellum, and an optional Why field. The name and activity come from the starting point automatically.
  - They choose a construct, optionally fill in Why, and choose Start quest.
- **Outcome:** the quest opens straight on its one conversation, with no further step, and already holds the construct's opening in its voice. Any starting context or Why appears as a user message before the opening. Plan starts empty and no spell is active. Each starting point can be used again for another quest. The quest is first in their quests list.
- **Variations:**
  - Closing the details instead creates nothing and spends nothing.
  - They are out of batteries, or Claude is unavailable: the details stay open with every edit, say why, and nothing is saved ([`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude)).
- **Next:**
  - [`use_case_construct_changes_plan`](plan.md#use_case_construct_changes_plan): save goals and plans from the conversation.
  - `use_case_new_quest_without_name`: an invalid request has no name.
  - `use_case_new_quest_with_construct`: they want another construct, one of their own.
  - [`use_case_quest_from_standalone_chat`](chats.md#use_case_quest_from_standalone_chat): they talked the idea through in Chat first.

## use_case_new_quest_with_construct

The user starts a quest with a construct of their own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), [`use_case_customize_construct`](constructs.md#use_case_customize_construct).
- **Steps:**
  - They open a starting point's details (`use_case_new_quest`), pick their own construct, after the built-in ones, and start the quest.
- **Outcome:** the quest's conversation shows their construct's name, and its opening is written in its voice. The conversation keeps the construct as it was when the quest started, so a later edit to the construct doesn't change it. A construct that isn't theirs, or is retired, is refused, and nothing is saved.
- **Next:**
  - [`use_case_construct_changes_plan`](plan.md#use_case_construct_changes_plan): save goals and plans from the conversation.

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
- **Outcome:** the request fails with a shorter-name error. No quest is made. Spaces around the name don't count, and a name of exactly 80 characters is accepted. Quests named before the limit keep their longer names, shown in full and wrapped, with no sideways scrolling on a phone.
- **Next:**
  - `use_case_new_quest`: give it a shorter name.

## use_case_open_quest

The user opens one of their quests, from Quests.

- **Prerequisites:** `use_case_view_quests`.
- **Steps:**
  - They open the quest.
- **Outcome:** the quest opens on its one continuing conversation, with the composer ready, under the quest's title, the page's heading in the site header's trail band, and the sections Conversation, Plan and Progress. The construct's portrait, without its name, sits to the left of Conversation in the pinned section row and opens its profile. A pencil beside the quest name opens the rename dialog. The three-dot Quest actions menu beside the sections holds the status and its actions. There is no list of conversations to choose from and nothing to start. Beside the conversation, or above it on a narrow screen, the quest's plan shows its next step. Opening the quest marks its conversation read for them alone, writes nothing else and spends nothing. Each section is a link; the selected one is underlined, and moving between sections keeps the composer's unsent draft. Section links scroll within their row on phones, without sideways page scrolling.
- **Variations:**
  - A quest without a conversation yet, as after the move from adventures: `use_case_start_quest_conversation`.
  - The Dailies quest: `use_case_dailies`.
  - Another user's quest is not found, even for someone who was once its member ([`use_case_private_data`](accounts.md#use_case_private_data)).
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): carry on the conversation.
  - [`use_case_change_plan`](plan.md#use_case_change_plan): see where the quest stands.
  - `use_case_view_progress_timeline`: see how far they have come.

## use_case_start_quest_conversation

The user starts the conversation of a quest that has none yet, such as one made before the move from adventures.

- **Prerequisites:** `use_case_open_quest`, for a quest without a conversation.
- **Steps:**
  - The quest's page says its conversation hasn't started and offers Start the conversation. They choose it.
- **Outcome:** the page shows the conversation with the construct's opening, charged to them. Opening the page before that wrote nothing and spent nothing. Starting it again, as from a second tab, makes no second conversation and no second opening.
- **Variations:**
  - Out of batteries, or Claude is unavailable: the page says why and saves nothing.

## use_case_dailies

The user starts their day in Dailies, their one ongoing quest for it.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - Under Start a quest, they choose Dailies and start it, as in `use_case_new_quest`.
  - On a later day, they choose Dailies under Start a quest again, which opens their Dailies quest, or open it from their quests list or Continue.
  - They choose Start the day, beside the composer.
- **Outcome:** Dailies is a quest like any other, with its name, Plan and conversation theirs to change. It opens with the construct asking what matters to them today. Start the day sends "Let's start the day." as their own message, in the same conversation, and the construct helps them notice what matters and choose one manageable next step. It is an ordinary message, charged as any other, and leaves the composer's draft. Nothing is cleared or reset: the conversation, Plan and status carry on from day to day. Opening the quest sends nothing. Starting Dailies again, even twice at once, opens the same quest; renaming it doesn't make another. There are no streaks, missed days or deadlines.
- **Variations:**
  - A quest the user named Dailies by hand has no Start the day: only a quest started as Dailies offers it.

## use_case_construct_records_milestone

The construct adds something the user finished to the quest's progress timeline.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in a quest's conversation.
- **Steps:**
  - They tell the construct they finished something meaningful in the quest, such as "I blocked out the shell and body".
  - The construct records a milestone: one short line, in the past tense, of what they got done.
- **Outcome:** the conversation shows the milestone, set apart from the construct's words, with a link to the quest's page, as soon as the construct records it and again when they reopen the quest. The quest's progress timeline lists it first, dated today. The construct records milestones sparingly, for real achievements, not for every step, question or plan *(checked by the real-Claude smoke test)*, and never counts days or streaks or points out a pause.
- **Variations:**
  - In Chat, which has no quest, the construct can't record a milestone: no timeline gets one, and Chat shows that the milestone wasn't added if the construct tries.
  - A milestone with no text: the conversation shows that the milestone wasn't added, and the timeline is unchanged.
- **Next:**
  - `use_case_view_progress_timeline`: see it among the others.
  - `use_case_edit_milestone`: the construct put it differently from how they would.

## use_case_view_progress_timeline

The user looks back at what she has done in a quest.

- **Prerequisites:** `use_case_open_quest`.
- **Steps:**
  - She looks at the quest's progress timeline on its page.
- **Outcome:** the timeline lists every milestone of the quest, newest first, each with the day it was recorded and its text. Milestones of her other quests, and of other users, don't appear. With none yet, the timeline says the construct adds what she finishes in the quest's conversation, without urging her on.
- **Next:**
  - `use_case_edit_milestone`: change or remove one.

## use_case_edit_milestone

The user changes or deletes a milestone on the progress timeline.

- **Prerequisites:** `use_case_construct_records_milestone`, then `use_case_view_progress_timeline`.
- **Steps:**
  - She chooses to edit a milestone, changes its text and saves it. Or she cancels, and it stays as it was.
  - She chooses to delete another, and confirms.
- **Outcome:** the edited milestone shows her text, with the same day as before. The deleted one is gone from the timeline, and the conversation is unchanged. Text that is empty, longer than one line or over 200 characters is refused with the reason, and her text stays in the field. Another user's milestone looks exactly like one that doesn't exist.
- **Next:**
  - `use_case_view_progress_timeline`: look over the result.

## use_case_set_interview_construct

The user chooses which construct new quests start with.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - The user opens Settings and chooses a New quest construct from the built-in constructs or their own.
  - They choose Save new quest construct.
- **Outcome:** the choice is saved to their account across devices. Every starting point's details default to it; the user can choose a different construct for each quest. Other users' choices and existing quests stay unchanged. Vellum is the default and the fallback if the saved construct is deleted or unavailable. Another user's construct cannot be saved.

## use_case_browse_premade_quests

The user looks at the ways to start a quest without starting one.

- **Prerequisites:** signed in on Quests.
- **Steps:** under Start a quest, they read the four starting points, choose one, review its construct and optional Why, then cancel.
- **Outcome:** Dailies, Learn a thing, Make a thing and Do a thing are tiles, each with an icon, its name and one short line on what it is for. A whole tile is one target, named by its starting point; there is no separate Choose button. Choosing one opens a modal dialog with what it is for in full, its construct and optional Why. The only setup fields are Construct and Why. Focus stays in the dialog until Cancel, Escape or a click outside closes it and returns focus to its tile. Opening and closing details makes no quest and no model call, and spends nothing. Once they have a Dailies quest, its tile opens it instead.

## use_case_rename_quest

The owner changes the quest title inline on its overview.

- **Prerequisites:** signed in as the quest owner.
- **Steps:** choose the pencil beside the quest name, enter the name, then choose Save title or press Enter.
- **Outcome:** the trimmed title is saved and appears as the quest's heading, in its list. Cancel title edit or Escape discards the draft. Closing the editor returns focus to Rename. Empty names and names longer than 80 characters are refused; failures retain the draft for retry. Pending saves prevent duplicate submissions and cancellation. Other users, including former members, cannot rename the quest.
