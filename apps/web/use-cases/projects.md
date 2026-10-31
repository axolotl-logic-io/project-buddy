# Projects

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_projects

The user looks over her projects.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to her projects.
  - The site lists them, newest first. If there are none, it invites her to create one.
  - The new-project form isn't on the page itself: a "New project" button above the list opens it in a dialog named "New project". The dialog takes the keyboard's focus and keeps it; Escape, or its close button, closes it and puts focus back on the button. Escape in the buddy picker's open list closes only the list.
- **Outcome:** every project she has is listed by name, newest first, and each one links to the project. With no projects, the page says there are none yet and points her to the "New project" button on the same page. Merely opening the page, or opening and closing the dialog, creates nothing.
- **Next:**
  - `use_case_open_project`: work on one of them.
  - `use_case_new_project`: start another.
  - [`use_case_new_chat_without_projects`](chats.md#use_case_new_chat_without_projects): she wants to chat before creating a project.
  - [`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable): the list will not load.

## use_case_new_project

The user starts a project for something she wants to make or learn.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She chooses New project on her projects page and gives the project a name. She leaves Hippy chosen in the buddy picker.
  - The site creates the project and opens its first chat, in the project interview. With a built-in buddy it does so at once, with the buddy's prepared opening ([`use_case_prepared_opening`](chats.md#use_case_prepared_opening)); with a buddy of her own that she has edited, it takes a few seconds while the buddy writes its opening, and shows that it is working meanwhile.
- **Outcome:** the project is first in her projects list, under the name she gave it. Its interview chat is listed in the project with Hippy, and the chat shows Hippy's name. The chat already holds the buddy's first question, in Hippy's voice, before she has written anything.
- **Next:**
  - `use_case_project_interview`: tell the buddy what she is after.
  - `use_case_resume_interview`: she has to stop before the interview is done.
  - `use_case_new_project_without_name`: she forgets to name it.
  - `use_case_new_project_with_buddy`: she wants the interview with another buddy, one of her own.
  - [`use_case_project_from_standalone_chat`](chats.md#use_case_project_from_standalone_chat): she talked the idea through in a chat, and asks the buddy there to make it a project.
  - [`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude): Claude is unavailable.

## use_case_new_project_with_buddy

The user starts a project whose interview is with a buddy of her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), [`use_case_customize_buddy`](buddies.md#use_case_customize_buddy).
- **Steps:**
  - She chooses to start a new project and gives it a name. The form offers the built-in buddies, then her own, oldest first, with Hippy chosen; she chooses her buddy.
  - The site creates the project, as in `use_case_new_project`, and opens its interview chat.
- **Outcome:** the interview chat shows her buddy's name, and the buddy's first question is written in its voice. The chat keeps her buddy as it was, so a later edit to the buddy doesn't change it.
- **Next:**
  - `use_case_project_interview`: tell the buddy what she is after.

## use_case_new_project_without_name

The user tries to start a project without giving it a name.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She chooses to start a new project and leaves the name empty, or types only spaces.
  - The site asks her for a name.
- **Outcome:** she is still on her projects page with the name field in front of her, rather than an error page. No new project appears in her projects list.
- **Next:**
  - `use_case_new_project`: give it a name this time.

## use_case_project_interview

The buddy learns what the user wants from a new project: a chat in the project interview, such as the chat the project was created with, interviews her while the memory doesn't yet hold her goal, what she already knows, what the result is for and a path of milestones.

- **Prerequisites:** `use_case_new_project`.
- **Steps:**
  - In the interview chat, the buddy asks about three things, one question at a time: her goal (what she wants to make or learn), what she already knows about it, and what the result is for.
  - She answers in her own words, and the buddy asks a follow-up question where something is unclear.
  - After each answer that tells it something new, the buddy saves it to the project's memory before it asks its next question.
  - Once it knows all three, the buddy adds a path of milestones, each a small step she can take, saves them, and tells her the first one.
- **Outcome:** after each save, the chat shows a notice, set apart from the buddy's words, with what it saved. The project's memory shows her answers so far, and its history lists each save as a version made by the buddy. Only a chat in the interview interviews her: every other chat she starts in the project ([`use_case_new_chat`](chats.md#use_case_new_chat)) works from the memory without an interview, even while the interview is not done, and the project's page lists the project's first chat among its chats. Once the memory holds her goal, what she already knows, purpose and milestones, the interview chat stops interviewing her and helps from the memory *(checked by the real-Claude smoke test)*.
- **Next:**
  - [`use_case_view_memory`](memory.md#use_case_view_memory): check what the buddy wrote down.
  - [`use_case_edit_memory`](memory.md#use_case_edit_memory): correct something it got wrong.
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on the first milestone.
  - `use_case_resume_interview`: she leaves before the interview is done.

## use_case_resume_interview

The user picks up an interview she left partway.

- **Prerequisites:** `use_case_new_project`, then she answers some of the buddy's questions, and the buddy saves each answer (`use_case_project_interview`), and she leaves the interview chat before the interview is done.
- **Steps:**
  - She opens the project ([`use_case_open_project`](#use_case_open_project)) and follows its link to the project's interview.
  - The interview chat opens as she left it, with everything she and the buddy said.
  - She answers the next question, and the buddy carries on with the interview, saving each answer, and in the end adds her milestones.
- **Outcome:** nothing she answered before she left is lost: the project's memory holds it, and the interview chat shows it. The buddy asks only for what the memory still lacks. Each later save shows its notice in the interview chat, and the memory holds her goal, what she already knows, purpose and milestones once the interview is done.
- **Next:**
  - [`use_case_view_memory`](memory.md#use_case_view_memory): check what the buddy wrote down.
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on the first milestone.

## use_case_open_project

The user opens one of her projects.

- **Prerequisites:** `use_case_view_projects`.
- **Steps:**
  - She picks a project.
  - The site shows the new-chat form, with the project already chosen, and its chats, newest first.
- **Outcome:** the page shows the project's name, a way to open its memory, the new-chat form of [`use_case_new_chat`](chats.md#use_case_new_chat) with this project, the open chat and Hippy already chosen, and every chat in the project, newest first. Opening the page starts no chat. Each chat links to the chat by its name and its buddy's name (by the buddy's name alone before it has a name), then shows when it started. Chats from other projects do not appear. With no chats, the page says there are none yet.
- **Next:**
  - [`use_case_reopen_chat`](chats.md#use_case_reopen_chat): continue an earlier chat.
  - [`use_case_new_chat`](chats.md#use_case_new_chat): start a fresh chat.
  - [`use_case_switch_buddy`](chats.md#use_case_switch_buddy): hear the project from a different voice.
  - [`use_case_view_memory`](memory.md#use_case_view_memory): see where the project stands.
