# Quests

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_projects

The user looks over their quests and the ways to start one.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - They go to Quests.
- **Outcome:** Start a quest offers four starting points, Dailies, Learn a thing, Make a thing and Do a thing (`use_case_browse_premade_quests`). Below them, Active, Completed and Abandoned tabs list their quests as compact rows, newest first, Active by default, as described in [quest status](quest-status.md). Each row links to the quest, which opens on its conversation. Team quests they are a member of are listed too, marked "Shared with you"; their own quests that have members are marked "Shared". A quest whose conversation has messages they haven't read, such as a check-in, is marked "New messages", for them alone. With no quests, the page says there are none yet and points to the starting points above. Merely opening the page creates nothing. Invitations to other people's quests that they haven't answered are listed above, under Quest invitations, each with Join and Decline (`use_case_join_project`).
- **Next:**
  - `use_case_open_project`: work on one of them.
  - `use_case_join_project`: join a quest they were invited to.
  - `use_case_new_project`: start another.
  - [`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable): the list will not load.

## use_case_new_project

The user starts a quest to learn, make or do something.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), with batteries.
- **Steps:**
  - Under Start a quest, they choose Learn a thing, Make a thing or Do a thing. Its details open filled in: a name, a starting Journal and the construct, their New quest construct or Vellum.
  - They change anything they like, or nothing, and choose Start quest.
- **Outcome:** the quest opens straight on its one conversation, with no further step, and already holds the construct's opening in its voice, guided by the starting point's activity: Learn a thing asks what they want to learn and where they start from, Make a thing helps find something to make, and Do a thing helps break a goal into steps. The Journal holds the starting Journal as their first version; its possible milestones are plans, not progress. Each starting point can be started again for another goal, as a quest of its own. With a built-in construct and the starting point's Journal unchanged, the opening is the construct's prepared one ([`use_case_prepared_opening`](chats.md#use_case_prepared_opening)). The quest is first in their quests list.
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

The user opens one of their quests, from Quests, Home or a notification.

- **Prerequisites:** `use_case_view_projects`.
- **Steps:**
  - They open the quest.
- **Outcome:** the quest opens on its one continuing conversation, with the composer ready, under the quest's title, status and sections: Conversation, Quest Journal, Plan, Progress, Versions, and Members and check-ins. There is no list of conversations to choose from and nothing to start. Beside the conversation, or above it on a narrow screen, the quest's plan shows its next step. Opening the quest marks its conversation read for them alone, writes nothing else and spends nothing. Each section is a link; the selected one is underlined, and moving between sections keeps the composer's unsent draft. The owner sees the status actions. Controls wrap on phones, without sideways scrolling.
- **Variations:**
  - A quest without a conversation yet, as after the move from adventures: `use_case_start_quest_conversation`.
  - The Dailies quest: `use_case_dailies`.
  - A quest that isn't open to them is not found ([`use_case_private_data`](accounts.md#use_case_private_data)).
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): carry on the conversation.
  - [`use_case_view_memory`](memory.md#use_case_view_memory): see where the quest stands.
  - `use_case_set_check_ins`: have the construct check in on the quest.
  - `use_case_remove_member`: someone should no longer work on their quest.
  - `use_case_view_progress_timeline`: see how far they have come.
  - `use_case_invite_to_project`: work on the quest with someone else.

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
  - On a later day, Dailies under Start a quest reads Open Dailies; they open it, or open it from Quests or Home.
  - They choose Start the day, beside the composer.
- **Outcome:** Dailies is a quest like any other, with its name, Journal, Plan and conversation theirs to change. It opens with the construct asking what matters to them today. Start the day sends "Let's start the day." as their own message, in the same conversation, and the construct helps them notice what matters and choose one manageable next step. It is an ordinary message, charged as any other, and leaves the composer's draft. Nothing is cleared or reset: the conversation, Journal, Plan and status carry on from day to day. Opening the quest sends nothing. Starting Dailies again, even twice at once, opens the same quest; renaming it doesn't make another. There are no streaks, missed days or deadlines.
- **Variations:**
  - A member of a team quest named Dailies sees no Start the day: only a quest started as Dailies offers it.

## use_case_set_check_ins

The user asks the quest's construct to check in on the quest on a schedule.

- **Prerequisites:** `use_case_open_project`.
- **Steps:**
  - On the quest's Members and check-ins section, under Check-ins, she sees that check-ins are Off.
  - She chooses how often the construct checks in: Daily, A few times a week or Weekly, and saves.
- **Outcome:** the page says the setting is saved, and shows her choice when she opens the quest again. The setting is for this quest alone: her other quests stay as they were, and no one else's quest can be changed this way. Choosing Off again stops the check-ins.
- **Variations:**
  - The site's scheduler secret isn't set: the quest's page has no Check-ins section, and the site refuses to save the setting.
- **Next:**
  - [`use_case_check_in`](chats.md#use_case_check_in): the construct checks in.

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

## use_case_team_project_access

The user works in a team quest: someone else's quest that she is a member of.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), and the quest's owner has made her a member, as accepting a quest invitation does.
- **Steps:**
  - She finds the quest in her quests list, and, while Active, in Home's Continue. Completing or abandoning removes it from those choices; restoring it makes it available again.
  - She opens the quest and its Journal. She writes in its conversation, edits the Journal, and edits and deletes a milestone.
  - She looks at the quest's Members section.
- **Outcome:** the quest, its conversation with its messages and images, its Journal and history and its progress timeline show to her as they do to its owner, and each change she makes is there for the owner too. Her quests list marks the quest "Shared with you". The Members section lists the owner first, then the members, each by name, or address when they have none, with their role and when they joined. She sees another person's email address only when they have no name; the owner sees everyone's name and address. She can't set the quest's check-ins, which stay the owner's, or remove anyone. Her Chat, her own constructs and activities, and her image gallery stay hers alone, except that when the construct moves the quest's conversation into her own activity, it runs on that activity's instructions for everyone in the quest. The conversation shows the change of activity by its name, and never holds its instructions. A check-in marks the conversation unread for each of them separately. Someone who isn't in the quest sees none of it, exactly as for a quest that doesn't exist ([`use_case_private_data`](accounts.md#use_case_private_data)).
- **Next:**
  - `use_case_leave_project`: she is done with the quest.

## use_case_remove_member

The owner takes a member out of her team quest.

- **Prerequisites:** `use_case_open_project`, for a quest with a member (`use_case_team_project_access`).
- **Steps:**
  - In the quest's Members section, she chooses Remove beside the member. A dialog asks her to confirm; she can keep them instead.
  - She confirms.
- **Outcome:** the member is gone from the Members section, and keyboard focus is on the section's heading. From then on the quest, its conversation, Journal and milestones look to the removed member exactly like a quest that doesn't exist, and take none of their writes, even from a page they had open. What they wrote stays in the quest's conversation. An image they generated in it leaves their gallery. Members can't remove anyone.
- **Next:**
  - `use_case_open_project`: carry on with the quest.

## use_case_leave_project

A member leaves a team quest.

- **Prerequisites:** `use_case_team_project_access`.
- **Steps:**
  - In the quest's Members section, she chooses Leave quest. A dialog asks her to confirm; she can stay instead.
  - She confirms.
- **Outcome:** she is back on her quests list, without the quest. From then on the quest looks to her exactly like one that doesn't exist, as for a removed member (`use_case_remove_member`). What she wrote stays in its conversation. The owner can't leave their own quest, and has no Leave quest button.
- **Next:**
  - `use_case_view_projects`: carry on with her own quests.

## use_case_invite_to_project

The owner of a quest invites someone to work on it with them, by their email address.

- **Prerequisites:** `use_case_open_project`, for a quest of her own.
- **Steps:**
  - On the quest's page, under Invite someone, she enters the person's email address and sends the invitation.
- **Outcome:** the form says "If ADDRESS has a Project Buddy account, we've sent them a quest invitation." Once it's sent, the quest's page lists it under Pending invitations, with the address and the day she sent it. The person gets one email that names her and the quest, with a link that signs them in and opens the invitation (`use_case_join_project`). The invitation also waits on their Quests page. Nobody joins until they accept.
- **Variations:**
  - The address has no account: the form gives the same answer, as soon and counting the same against her limits, and Pending invitations lists it the same way, so nothing shows whether the address has an account, as sign-in doesn't. The invitation is saved by the address alone. No email is sent and no account is made; only an admin can bring someone new to the site ([`use_case_admin_invites`](accounts.md#use_case_admin_invites)). No one can see or answer the invitation until an account has that address; then it waits on that account's Quests page (`use_case_join_project`).
  - Her own address, or the address of someone already a member: the form says so, and sends nothing.
  - An address that isn't an email address: the form asks for one, and sends nothing.
  - She invites the same person again: the newer invitation replaces the pending one, whose link no longer opens it.
  - Send limits: she can send 20 quest invitations an hour, and an address gets at most one a minute, counting addresses with no account the same. Past the limit, the form says so and sends nothing. If the email fails, the invitation still waits on the invitee's Quests page, and she can try again at once.
  - A member of the quest, or anyone else, sees no invite form or pending invitations, and can't invite anyone to it.
- **Next:**
  - `use_case_revoke_project_invitation`: she changes her mind.

## use_case_join_project

The person invited to a quest joins it.

- **Prerequisites:** `use_case_invite_to_project`.
- **Steps:**
  - They open the email's link, and continue on the page it opens, as in [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). Or, signed in, they open the Quests page, where Quest invitations lists it. An invitation to an address that had no account when it was sent has no email; it shows on the Quests page once an admin's invitation has made an account with that address.
  - The invitation asks "Join PROJECT?", says who invited them, and offers Join and Decline. They choose Join.
- **Outcome:** they are a member of the quest, on its page, and the quest is in their quests list. The invitation is gone from their list and from the owner's pending invitations. Opening the email's link again leads to a page that isn't found. The link signs them in for 30 minutes, like any sign-in link; after that they sign in as usual and find the invitation on the Quests page.
- **Variations:**
  - Only the invited person can see or answer the invitation: the account it was sent to, or, for one sent to an address with no account, the account that has that address when they open or answer it. For anyone else, including the quest's owner, its page and its Join and Decline are not found, exactly as for an invitation that doesn't exist.
  - A revoked, replaced or already answered invitation is not found.
- **Next:**
  - `use_case_team_project_access`: work in the quest with its owner.

## use_case_decline_project_invitation

The person invited to a quest says no.

- **Prerequisites:** `use_case_invite_to_project`.
- **Steps:**
  - On the invitation's page or the Quests page, they choose Decline.
- **Outcome:** the Quests page shows, without the invitation, and focuses a confirmation that the quest invitation was declined. Reloading does not repeat that confirmation. They aren't a member, and the owner's pending invitations no longer list it. The invitation can't be accepted afterwards; the owner can send a new one.

## use_case_revoke_project_invitation

The owner of a quest takes back an invitation before it is answered.

- **Prerequisites:** `use_case_invite_to_project`.
- **Steps:**
  - On the quest's page, under Pending invitations, she chooses Revoke beside the invitation, then confirms. She can keep the invitation instead.
- **Outcome:** the invitation is gone from her pending invitations and from the invitee's Quests page, and its email's link leads to a page that isn't found. The invitee can't join with it. Only the quest's owner can revoke its invitations.

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
- **Steps:** choose Edit quest title, enter the name, then choose Save title or press Enter.
- **Outcome:** the trimmed title is saved and appears on the quest and its list. Cancel title edit or Escape discards the draft. Closing the editor returns focus to the pencil. Empty names and names longer than 80 characters are refused; failures retain the draft for retry. Pending saves prevent duplicate submissions and cancellation. Members and other users cannot rename the quest.
