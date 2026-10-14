# Projects

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_projects

The user looks over her projects.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to her projects.
  - The site lists them, newest first. If there are none, it invites her to create one.
- **Outcome:** every project she has is listed by name, newest first, and each one links to the project. With no projects, the page says there are none yet and offers a way to create one on the same page.
- **Next:**
  - `use_case_open_project`: work on one of them.
  - `use_case_new_project`: start another.
  - [`use_case_new_chat_without_projects`](chats.md#use_case_new_chat_without_projects): she wants to chat before creating a project.
  - [`use_case_storage_unavailable`](when-things-go-wrong.md#use_case_storage_unavailable): the list will not load.

## use_case_new_project

The user starts a project for something she wants to make or learn in Blender.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She chooses to start a new project and gives it a name. The buddy picker is hidden unless she has switched the interview buddy extra on in Settings, so the project's first chat is with Hippy.
  - The site creates the project, which takes a few seconds while the tutor writes its first question, and shows that it is working meanwhile. Then it opens the project's first chat, the interview.
- **Outcome:** the project is first in her projects list, under the name she gave it. Its interview chat is listed in the project with Hippy, and the chat shows Hippy's name. The chat already holds the tutor's first question, in Hippy's voice, before she has written anything.
- **Next:**
  - `use_case_project_interview`: tell the tutor what she is after.
  - `use_case_resume_interview`: she has to stop before the interview is done.
  - `use_case_new_project_without_name`: she forgets to name it.
  - `use_case_new_project_with_buddy`: she wants the interview with another buddy, one of her own.
  - [`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude): Claude is unavailable.

## use_case_new_project_with_buddy

The user starts a project whose interview is with a buddy of her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), [`use_case_customize_buddy`](buddies.md#use_case_customize_buddy).
- **Steps:**
  - In Settings, she switches the interview buddy extra on.
  - She chooses to start a new project and gives it a name. The form offers the built-in buddies, then her own, oldest first, with Hippy chosen; she chooses her buddy.
  - The site creates the project, as in `use_case_new_project`, and opens its interview chat.
- **Outcome:** the interview chat shows her buddy's name, and the tutor's first question is written in its voice. The chat keeps her buddy as it was, so a later edit to the buddy doesn't change it.
- **Next:**
  - `use_case_project_interview`: tell the tutor what she is after.

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

The tutor learns what the user wants from a new project: the chat the project was created with, its interview chat, interviews her while the memory doesn't yet hold her goal, her skill level, what the result is for and a path of milestones.

- **Prerequisites:** `use_case_new_project`.
- **Steps:**
  - In the interview chat, the tutor asks about three things, one question at a time: her goal (what she wants to make or learn), her skill level with Blender, and what the result is for.
  - She answers in her own words, and the tutor asks a follow-up question where something is unclear.
  - After each answer that tells it something new, the tutor saves it to the project's memory before it asks its next question.
  - Once it knows all three, the tutor adds a path of milestones, each a small step she can do in Blender, saves them, and tells her the first one.
- **Outcome:** after each save, the chat shows a notice, set apart from the tutor's words, with what it saved. The project's memory shows her answers so far, and its history lists each save as a version made by the tutor. Only the interview chat interviews her: every other chat she starts in the project ([`use_case_new_chat`](chats.md#use_case_new_chat)) is an ordinary lesson that works from the memory, even while the interview is not done, and the project's page links back to the interview chat. Once the memory holds her goal, skill level, purpose and milestones, the interview chat too is an ordinary lesson, with no interview *(checked by the real-Claude smoke test)*.
- **Next:**
  - [`use_case_view_memory`](memory.md#use_case_view_memory): check what the tutor wrote down.
  - [`use_case_edit_memory`](memory.md#use_case_edit_memory): correct something it got wrong.
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on the first milestone.
  - `use_case_resume_interview`: she leaves before the interview is done.

## use_case_resume_interview

The user picks up an interview she left partway.

- **Prerequisites:** `use_case_new_project`, then she answers some of the tutor's questions, and the tutor saves each answer (`use_case_project_interview`), and she leaves the interview chat before the interview is done.
- **Steps:**
  - She opens the project ([`use_case_open_project`](#use_case_open_project)) and follows its link to the project's interview.
  - The interview chat opens as she left it, with everything she and the tutor said.
  - She answers the next question, and the tutor carries on with the interview, saving each answer, and in the end adds her milestones.
- **Outcome:** nothing she answered before she left is lost: the project's memory holds it, and the interview chat shows it. The tutor asks only for what the memory still lacks. Each later save shows its notice in the interview chat, and the memory holds her goal, skill level, purpose and milestones once the interview is done.
- **Next:**
  - [`use_case_view_memory`](memory.md#use_case_view_memory): check what the tutor wrote down.
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on the first milestone.

## use_case_open_project

The user opens one of her projects.

- **Prerequisites:** `use_case_view_projects`.
- **Steps:**
  - She picks a project.
  - The site shows its chats, newest first, and a way to start another.
- **Outcome:** the page shows the project's name, a way to open its memory, a link to its interview chat if it has one, a way to start a chat, and every chat in the project, newest first. Each chat links to the chat by its name and its buddy's name (by the buddy's name alone before it has a name), then shows when it started. Chats from other projects do not appear. With no chats, the page says there are none yet.
- **Next:**
  - [`use_case_reopen_chat`](chats.md#use_case_reopen_chat): continue an earlier lesson.
  - [`use_case_new_chat`](chats.md#use_case_new_chat): start a fresh chat.
  - [`use_case_switch_buddy`](chats.md#use_case_switch_buddy): hear the project from a different voice.
  - [`use_case_view_memory`](memory.md#use_case_view_memory): see where the project stands.
