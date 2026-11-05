# Quests

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_projects

The user looks over her quests.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to her quests.
  - The site lists them, newest first. If there are none, it invites her to create one.
  - The new-quest form isn't on the page itself: a "New quest" button above the list opens it in a dialog named "New quest". The dialog takes the keyboard's focus and keeps it; Escape, or its close button, closes it and puts focus back on the button. Escape in the construct picker's open list closes only the list.
- **Outcome:** every quest she has is listed by name, newest first, and each one links to the quest. Team quests she is a member of are listed too, marked "Shared with you"; her own quests that have members are marked "Shared". With no quests, the page says there are none yet and points her to the "New quest" button on the same page. Merely opening the page, or opening and closing the dialog, creates nothing. Invitations to other people's quests that she hasn't answered are listed above her quests, under Quest invitations, each with Join and Decline (`use_case_join_project`).
- **Next:**
  - `use_case_open_project`: work on one of them.
  - `use_case_join_project`: join a quest she was invited to.
  - `use_case_new_project`: start another.
  - [`use_case_new_chat_without_projects`](chats.md#use_case_new_chat_without_projects): she wants to chat before creating a quest.
  - [`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable): the list will not load.

## use_case_new_project

The user starts a quest for something she wants to make or learn.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She chooses New quest on her quests page and gives the quest a name. She leaves Hippy chosen in the construct picker.
  - The site creates the quest and opens its first chat, in the quest interview. With a built-in construct it does so at once, with the construct's prepared opening ([`use_case_prepared_opening`](chats.md#use_case_prepared_opening)); with a construct of her own that she has edited, it takes a few seconds while the construct writes its opening, and shows that it is working meanwhile.
- **Outcome:** the quest is first in her quests list, under the name she gave it. Its interview chat is listed in the quest with Hippy, and the chat shows Hippy's name. The chat already holds the construct's first question, in Hippy's voice, before she has written anything.
- **Next:**
  - `use_case_project_interview`: tell the construct what she is after.
  - `use_case_resume_interview`: she has to stop before the interview is done.
  - `use_case_new_project_without_name`: she forgets to name it.
  - `use_case_new_project_name_too_long`: she gives it a name that is too long.
  - `use_case_new_project_with_construct`: she wants the interview with another construct, one of her own.
  - [`use_case_project_from_standalone_chat`](chats.md#use_case_project_from_standalone_chat): she talked the idea through in a chat, and asks the construct there to make it a quest.
  - [`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude): Claude is unavailable.

## use_case_new_project_with_construct

The user starts a quest whose interview is with a construct of her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), [`use_case_customize_construct`](guild.md#use_case_customize_construct).
- **Steps:**
  - She chooses to start a new quest and gives it a name. The form offers the built-in constructs, then her own, oldest first, with Hippy chosen; she chooses her construct.
  - The site creates the quest, as in `use_case_new_project`, and opens its interview chat.
- **Outcome:** the interview chat shows her construct's name, and the construct's first question is written in its voice. The chat keeps her construct as it was, so a later edit to the construct doesn't change it.
- **Next:**
  - `use_case_project_interview`: tell the construct what she is after.

## use_case_new_project_from_new_chat

The user starts a quest from the new-chat form, on the new chat page or in the Chats page's New chat dialog.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - With no quest chosen, she chooses "Quest interview" as the activity, and the quest becomes "New quest". Or she chooses "New quest" as the quest, and the activity becomes "Quest interview". Choosing another activity sets the quest back to "No quest"; choosing an existing quest keeps the chosen activity, including the interview. Choosing "No quest" leaves the interview for the open chat.
  - She chooses a construct and Start chat. A dialog asks her to name the new quest. Cancel closes it and leaves the form as it was.
  - She types a name and chooses Start quest.
- **Outcome:** the site creates the quest and opens its first chat, in the quest interview with the construct she chose, as in `use_case_new_project`. A name of only spaces, or one longer than 80 characters ([`use_case_new_project_name_too_long`](#use_case_new_project_name_too_long)), is refused in the name dialog, which stays open, and no quest is made. If Claude is unavailable, the form keeps her choices and the name she typed.
- **Next:**
  - `use_case_project_interview`: tell the construct what she is after.

## use_case_new_project_without_name

The user tries to start a quest without giving it a name.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She chooses to start a new quest and leaves the name empty, or types only spaces.
  - The site asks her for a name.
- **Outcome:** she is still on her quests page with the name field in front of her, rather than an error page. No new quest appears in her quests list.
- **Next:**
  - `use_case_new_project`: give it a name this time.

## use_case_new_project_name_too_long

The user tries to give a new quest a name longer than 80 characters.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She starts a new quest from the New quest form or the new-chat form's name dialog, and types or pastes a name longer than 80 characters.
  - The name field takes no more than 80 characters. If a longer name reaches the site anyway, the site refuses it.
- **Outcome:** the name field says to use a shorter name of at most 80 characters, and keeps the name and the construct she chose. No new quest appears in her quests list. Spaces around the name don't count, and a name of exactly 80 characters is accepted. Quests named before the limit keep their longer names, shown in full and wrapped, with no sideways scrolling on a phone.
- **Next:**
  - `use_case_new_project`: give it a shorter name.
  - [`use_case_project_from_standalone_chat`](chats.md#use_case_project_from_standalone_chat): she asks the construct for a quest with a long name instead.

## use_case_project_interview

The construct learns what the user wants from a new quest: a chat in the quest interview, such as the chat the quest was created with, interviews her while the memory doesn't yet hold her goal, what she already knows, what the result is for and a path of milestones.

- **Prerequisites:** `use_case_new_project`.
- **Steps:**
  - In the interview chat, the construct asks about three things, one question at a time: her goal (what she wants to make or learn), what she already knows about it, and what the result is for.
  - She answers in her own words, and the construct asks a follow-up question where something is unclear.
  - After each answer that tells it something new, the construct saves it to the quest's memory before it asks its next question.
  - Once it knows all three, the construct adds a path of milestones, each a small step she can take, saves them, and tells her the first one.
- **Outcome:** after each save, the chat shows a notice, set apart from the construct's words, with what it saved. The quest's memory shows her answers so far, and its history lists each save as a version made by the construct. Only a chat in the interview interviews her: every other chat she starts in the quest ([`use_case_new_chat`](chats.md#use_case_new_chat)) works from the memory without an interview, even while the interview is not done, and the quest's page lists the quest's first chat among its chats. Once the memory holds her goal, what she already knows, purpose and milestones, the interview chat stops interviewing her and helps from the memory *(checked by the real-Claude smoke test)*.
- **Next:**
  - [`use_case_view_memory`](memory.md#use_case_view_memory): check what the construct wrote down.
  - [`use_case_edit_memory`](memory.md#use_case_edit_memory): correct something it got wrong.
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on the first milestone.
  - `use_case_resume_interview`: she leaves before the interview is done.

## use_case_resume_interview

The user picks up an interview she left partway.

- **Prerequisites:** `use_case_new_project`, then she answers some of the construct's questions, and the construct saves each answer (`use_case_project_interview`), and she leaves the interview chat before the interview is done.
- **Steps:**
  - She opens the quest ([`use_case_open_project`](#use_case_open_project)) and follows its link to the quest's interview.
  - The interview chat opens as she left it, with everything she and the construct said.
  - She answers the next question, and the construct carries on with the interview, saving each answer, and in the end adds her milestones.
- **Outcome:** nothing she answered before she left is lost: the quest's memory holds it, and the interview chat shows it. The construct asks only for what the memory still lacks. Each later save shows its notice in the interview chat, and the memory holds her goal, what she already knows, purpose and milestones once the interview is done.
- **Next:**
  - [`use_case_view_memory`](memory.md#use_case_view_memory): check what the construct wrote down.
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on the first milestone.

## use_case_open_project

The user opens one of her quests.

- **Prerequisites:** `use_case_view_projects`.
- **Steps:**
  - She picks a quest.
  - The site shows a New chat button, with the new-chat form closed, and the quest's chats, newest first.
- **Outcome:** the page shows the quest's name, a way to open its memory, a New chat button that opens the form of [`use_case_new_chat`](chats.md#use_case_new_chat) in a dialog, the quest's progress timeline (`use_case_view_progress_timeline`), and every chat in the quest, newest first. Opening the page starts no chat. Each chat links to the chat by its name and its construct's name (by the construct's name alone before it has a name), then shows when it started. Chats from other quests do not appear. With no chats, the page says there are none yet. Below the chats, the page lists the quest's newest Quick Notes ([`use_case_quick_note`](memory.md#use_case_quick_note)), or says there are none yet, then its members: her, as its owner, and anyone else in it (`use_case_team_project_access`).
- **Next:**
  - [`use_case_reopen_chat`](chats.md#use_case_reopen_chat): continue an earlier chat.
  - [`use_case_new_chat`](chats.md#use_case_new_chat): start a fresh chat.
  - [`use_case_switch_construct`](chats.md#use_case_switch_construct): hear the quest from a different voice.
  - [`use_case_view_memory`](memory.md#use_case_view_memory): see where the quest stands.
  - `use_case_set_check_ins`: have the construct check in on the quest.
  - [`use_case_delete_note`](memory.md#use_case_delete_note): take back a Quick Note she no longer needs.
  - `use_case_remove_member`: someone should no longer work on her quest.
  - `use_case_view_progress_timeline`: see how far she has come.
  - `use_case_invite_to_project`: work on the quest with someone else.

## use_case_set_check_ins

The user asks the quest's construct to check in on the quest on a schedule.

- **Prerequisites:** `use_case_open_project`.
- **Steps:**
  - On the quest's page, under Check-ins, she sees that check-ins are Off.
  - She chooses how often the construct checks in: Daily, A few times a week or Weekly, and saves.
- **Outcome:** the page says the setting is saved, and shows her choice when she opens the quest again. The setting is for this quest alone: her other quests stay as they were, and no one else's quest can be changed this way. Choosing Off again stops the check-ins.
- **Variations:**
  - The site's scheduler secret isn't set: the quest's page has no Check-ins section, and the site refuses to save the setting.
- **Next:**
  - [`use_case_check_in`](chats.md#use_case_check_in): the construct checks in.

## use_case_construct_records_milestone

The construct adds something the user finished to the quest's progress timeline.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in a chat in one of her quests.
- **Steps:**
  - She tells the construct she finished something meaningful in the quest, such as "I blocked out the shell and body".
  - The construct records a milestone: one short line, in the past tense, of what she got done.
- **Outcome:** the chat shows the milestone, set apart from the construct's words, with a link to the quest's page, as soon as the construct records it and again when she reopens the chat. The quest's progress timeline lists it first, dated today and linked to this chat. The construct records milestones sparingly, for real achievements, not for every step, question or plan *(checked by the real-Claude smoke test)*, and never counts days or streaks or points out a pause.
- **Variations:**
  - In a chat with no quest, the construct can't record a milestone: no timeline gets one, and the chat shows that the milestone wasn't added if the construct tries.
  - A milestone with no text: the chat shows that the milestone wasn't added, and the timeline is unchanged.
- **Next:**
  - `use_case_view_progress_timeline`: see it among the others.
  - `use_case_edit_milestone`: the construct put it differently from how she would.

## use_case_view_progress_timeline

The user looks back at what she has done in a quest.

- **Prerequisites:** `use_case_open_project`.
- **Steps:**
  - She looks at the quest's progress timeline on its page.
- **Outcome:** the timeline lists every milestone of the quest, newest first, each with the day it was recorded, its text and a link to the chat it came from. Milestones of her other quests, and of other users, don't appear. With none yet, the timeline says the construct adds what she finishes in the quest's chats, without urging her on.
- **Next:**
  - [`use_case_reopen_chat`](chats.md#use_case_reopen_chat): follow a milestone back to its chat.
  - `use_case_edit_milestone`: change or remove one.

## use_case_edit_milestone

The user changes or deletes a milestone on the progress timeline.

- **Prerequisites:** `use_case_construct_records_milestone`, then `use_case_view_progress_timeline`.
- **Steps:**
  - She chooses to edit a milestone, changes its text and saves it. Or she cancels, and it stays as it was.
  - She chooses to delete another, and confirms.
- **Outcome:** the edited milestone shows her text, with the same day and chat link as before. The deleted one is gone from the timeline, and its chat is unchanged. Text that is empty, longer than one line or over 200 characters is refused with the reason, and her text stays in the field. Another user's milestone looks exactly like one that doesn't exist.
- **Next:**
  - `use_case_view_progress_timeline`: look over the result.

## use_case_team_project_access

The user works in a team quest: someone else's quest that she is a member of.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), and the quest's owner has made her a member, as accepting a quest invitation does.
- **Steps:**
  - She finds the quest in her quests list, the Chats page and its quest filter, Today and the Quick Note page.
  - She opens the quest, one of its chats and its memory. She continues a chat, starts a new one, edits the memory, adds and deletes a Quick Note, and edits and deletes a milestone.
  - She looks at the quest's Members section.
- **Outcome:** the quest, its chats, their messages and images, its memory and history, its Quick Notes and its progress timeline show to her as they do to its owner, and each change she makes is there for the owner too. Her quests list marks the quest "Shared with you". The Members section lists the owner first, then the members, each by name, or address when they have none, with their role and when they joined. She sees another person's email address only when they have no name; the owner sees everyone's name and address. She can't set the quest's check-ins, which stay the owner's, or remove anyone. Her standalone chats, her own constructs and activities, and her image gallery stay hers alone, except that a team quest chat she starts with her own construct, or that the construct moves into her own activity, runs on that construct's or activity's instructions for everyone in the quest. The chat's messages show the change of activity by its name, and never hold its instructions. Someone who isn't in the quest sees none of it, exactly as for a quest that doesn't exist ([`use_case_private_data`](accounts.md#use_case_private_data)).
- **Next:**
  - `use_case_leave_project`: she is done with the quest.

## use_case_remove_member

The owner takes a member out of her team quest.

- **Prerequisites:** `use_case_open_project`, for a quest with a member (`use_case_team_project_access`).
- **Steps:**
  - In the quest's Members section, she chooses Remove beside the member. A dialog asks her to confirm; she can keep them instead.
  - She confirms.
- **Outcome:** the member is gone from the Members section, and keyboard focus is on the section's heading. From then on the quest, its chats, memory, Quick Notes and milestones look to the removed member exactly like a quest that doesn't exist, and take none of their writes, even from a page they had open. What they wrote stays in the quest's chats. An image they generated in the quest's chats leaves their gallery. Members can't remove anyone.
- **Next:**
  - `use_case_open_project`: carry on with the quest.

## use_case_leave_project

A member leaves a team quest.

- **Prerequisites:** `use_case_team_project_access`.
- **Steps:**
  - In the quest's Members section, she chooses Leave quest. A dialog asks her to confirm; she can stay instead.
  - She confirms.
- **Outcome:** she is back on her quests list, without the quest. From then on the quest looks to her exactly like one that doesn't exist, as for a removed member (`use_case_remove_member`). What she wrote stays in its chats. The owner can't leave their own quest, and has no Leave quest button.
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
