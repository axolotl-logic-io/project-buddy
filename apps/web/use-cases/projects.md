# Quests

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_projects

The user looks over their quests and the ways to start one.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - They go to Quests.
- **Outcome:** Start a quest offers four starting points, Dailies, Learn a thing, Make a thing and Do a thing (`use_case_browse_premade_quests`). Below them, Active, Completed and Abandoned tabs list their quests as compact rows, newest first, Active by default, as described in [quest status](quest-status.md). Each row links to the quest, which opens on its conversation. With no quests, the page says there are none yet and points to the starting points above. Merely opening the page creates nothing.
- **Next:**
  - `use_case_open_project`: work on one of them.
  - `use_case_new_project`: start another.
  - [`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable): the list will not load.

## use_case_new_project

The user starts a quest to learn, make or do something.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), with batteries.
- **Steps:**
  - Under Start a quest, they choose Learn a thing, Make a thing or Do a thing. Its details open filled in: a name, a starting Journal and the construct, their New quest construct or Vellum.
  - They change anything they like, or nothing, and choose Start quest.
- **Outcome:** the quest opens straight on its one conversation, with no further step, and already holds the construct's opening in its voice, guided by the starting point's activity, which they never choose themselves: Learn a thing asks what they want to learn and where they start from, Make a thing helps find something to make, and Do a thing helps break a goal into steps. The Journal holds the starting Journal as their first version; its possible milestones are plans, not progress. Each starting point can be started again for another goal, as a quest of its own. With a built-in construct and the starting point's Journal unchanged, the opening is the construct's prepared one ([`use_case_prepared_opening`](chats.md#use_case_prepared_opening)). The quest is first in their quests list.
- **Variations:**
  - Closing the details instead creates nothing and spends nothing.
  - They are out of batteries, or Claude is unavailable: the details stay open with every edit, say why, and nothing is saved ([`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude)).
- **Next:**
  - [`use_case_construct_updates_memory`](memory.md#use_case_construct_updates_memory): save goals and plans from the conversation.
  - `use_case_new_project_without_name`: they clear its name.
  - `use_case_new_project_with_construct`: they want another construct, one of their own.
  - [`use_case_project_from_standalone_chat`](chats.md#use_case_project_from_standalone_chat): they talked the idea through in Chat first.

## use_case_new_project_with_construct

The user starts a quest with a construct of their own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), [`use_case_customize_construct`](constructs.md#use_case_customize_construct).
- **Steps:**
  - They open a starting point's details (`use_case_new_project`), pick their own construct, after the built-in ones, and start the quest.
- **Outcome:** the quest's conversation shows their construct's name, and its opening is written in its voice. The conversation keeps the construct as it was when the quest started, so a later edit to the construct doesn't change it. A construct that isn't theirs, or is retired, is refused, and nothing is saved.
- **Next:**
  - [`use_case_construct_updates_memory`](memory.md#use_case_construct_updates_memory): save goals and plans from the conversation.

## use_case_new_project_without_name

The user tries to start a quest without a name.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - In a starting point's details, they clear the name, or leave only spaces, and choose Start quest.
- **Outcome:** the details stay open with their edits and ask for a name. No quest is made.
- **Next:**
  - `use_case_new_project`: give it a name this time.

## use_case_new_project_name_too_long

The user tries to give a new quest a name longer than 80 characters.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - In a starting point's details, they type or paste a name longer than 80 characters.
  - The name field takes no more than 80 characters. If a longer name reaches the site anyway, the site refuses it.
- **Outcome:** the details say to use a shorter name of at most 80 characters, and keep their edits. No quest is made. Spaces around the name don't count, and a name of exactly 80 characters is accepted. Quests named before the limit keep their longer names, shown in full and wrapped, with no sideways scrolling on a phone.
- **Next:**
  - `use_case_new_project`: give it a shorter name.

## use_case_open_project

The user opens one of their quests, from Quests.

- **Prerequisites:** `use_case_view_projects`.
- **Steps:**
  - They open the quest.
- **Outcome:** the quest opens on its one continuing conversation, with the composer ready, under the quest's title, the page's heading in the site header's trail band, and the quest's frame: Rename, the status and its actions, then the sections Conversation, Quest Journal, Plan, Progress and Versions. There is no list of conversations to choose from and nothing to start. Beside the conversation, or above it on a narrow screen, the quest's plan shows its next step. Opening the quest marks its conversation read for them alone, writes nothing else and spends nothing. Each section is a link; the selected one is underlined, and moving between sections keeps the composer's unsent draft. Controls wrap on phones, without sideways scrolling.
- **Variations:**
  - A quest without a conversation yet, as after the move from adventures: `use_case_start_quest_conversation`.
  - The Dailies quest: `use_case_dailies`.
  - Another user's quest is not found, even for someone who was once its member ([`use_case_private_data`](accounts.md#use_case_private_data)).
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): carry on the conversation.
  - [`use_case_view_memory`](memory.md#use_case_view_memory): see where the quest stands.
  - `use_case_view_progress_timeline`: see how far they have come.

## use_case_start_quest_conversation

The user starts the conversation of a quest that has none yet, such as one made before the move from adventures.

- **Prerequisites:** `use_case_open_project`, for a quest without a conversation.
- **Steps:**
  - The quest's page says its conversation hasn't started and offers Start the conversation. They choose it.
- **Outcome:** the page shows the conversation with the construct's opening, charged to them. Opening the page before that wrote nothing and spent nothing. Starting it again, as from a second tab, makes no second conversation and no second opening.
- **Variations:**
  - Out of batteries, or Claude is unavailable: the page says why and saves nothing.

## use_case_dailies

The user starts their day in Dailies, their one ongoing quest for it.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - Under Start a quest, they choose Dailies and start it, as in `use_case_new_project`.
  - On a later day, Dailies under Start a quest reads Open Dailies; they open it, or open it from Quests.
  - They choose Start the day, beside the composer.
- **Outcome:** Dailies is a quest like any other, with its name, Journal, Plan and conversation theirs to change. It opens with the construct asking what matters to them today. Start the day sends "Let's start the day." as their own message, in the same conversation, and the construct helps them notice what matters and choose one manageable next step. It is an ordinary message, charged as any other, and leaves the composer's draft. Nothing is cleared or reset: the conversation, Journal, Plan and status carry on from day to day. Opening the quest sends nothing. Starting Dailies again, even twice at once, opens the same quest; renaming it doesn't make another. There are no streaks, missed days or deadlines.
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

- **Prerequisites:** `use_case_open_project`.
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
- **Steps:** under Start a quest, they read the four starting points, open one's details, look at its name, starting Journal and construct, then close it.
- **Outcome:** Dailies, Learn a thing, Make a thing and Do a thing each say what they are for. Opening and closing details makes no quest and no model call, and spends nothing. Once they have a Dailies quest, its starting point opens it instead.

## use_case_rename_quest

The owner changes the quest title inline on its overview or Journal page.

- **Prerequisites:** signed in as the quest owner.
- **Steps:** choose Rename, enter the name, then choose Save title or press Enter.
- **Outcome:** the trimmed title is saved and appears as the quest's heading, in the trail band of its Journal and in its list. Cancel title edit or Escape discards the draft. Closing the editor returns focus to Rename. Empty names and names longer than 80 characters are refused; failures retain the draft for retry. Pending saves prevent duplicate submissions and cancellation. Other users, including former members, cannot rename the quest.
