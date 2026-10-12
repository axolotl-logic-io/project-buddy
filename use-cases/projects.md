# Projects

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_projects

The user looks over her projects.

- **Prerequisites:** [`use_case_login_success`](access.md#use_case_login_success).
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

- **Prerequisites:** [`use_case_login_success`](access.md#use_case_login_success).
- **Steps:**
  - She chooses to start a new project and gives it a name. She doesn't pick a persona: the project's first chat is always with Hippy.
  - The site creates the project, which takes a few seconds while the tutor writes its first question, and shows that it is working meanwhile. Then it opens the project's first chat, the interview.
- **Outcome:** the project is first in her projects list, under the name she gave it. Its interview chat is listed in the project with Hippy, and the chat shows Hippy's name. The chat already holds the tutor's first question, in Hippy's voice, before she has written anything.
- **Next:**
  - `use_case_project_interview`: tell the tutor what she is after.
  - `use_case_resume_interview`: she has to stop before the interview is done.
  - `use_case_new_project_without_name`: she forgets to name it.
  - [`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude): Claude is unavailable.

## use_case_new_project_without_name

The user tries to start a project without giving it a name.

- **Prerequisites:** [`use_case_login_success`](access.md#use_case_login_success).
- **Steps:**
  - She chooses to start a new project and leaves the name empty, or types only spaces.
  - The site asks her for a name.
- **Outcome:** she is still on her projects page with the name field in front of her, rather than an error page. No new project appears in her projects list.
- **Next:**
  - `use_case_new_project`: give it a name this time.

## use_case_project_interview

The tutor learns what the user wants from a project whose memory doesn't yet hold her goal, her skill level, what the result is for and a path of milestones.

- **Prerequisites:** `use_case_new_project`, or any chat in a project whose memory still lacks one of those ([`use_case_new_chat`](chats.md#use_case_new_chat)).
- **Steps:**
  - The tutor asks about three things, one question at a time: her goal (what she wants to make or learn), her skill level with Blender, and what the result is for.
  - She answers in her own words, and the tutor asks a follow-up question where something is unclear.
  - After each answer that tells it something new, the tutor saves it to the project's memory before it asks its next question.
  - Once it knows all three, the tutor adds a path of milestones, each a small step she can do in Blender, saves them, and tells her the first one.
- **Outcome:** after each save, the chat shows a notice, set apart from the tutor's words, with what it saved. The project's memory shows her answers so far, and its history lists each save as a version made by the tutor. Once the memory holds her goal, skill level, purpose and milestones, the project's chats are ordinary lessons that work from that memory, with no interview *(checked by the real-Claude smoke test)*.
- **Next:**
  - [`use_case_view_memory`](memory.md#use_case_view_memory): check what the tutor wrote down.
  - [`use_case_edit_memory`](memory.md#use_case_edit_memory): correct something it got wrong.
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on the first milestone.
  - `use_case_resume_interview`: she leaves before the interview is done.

## use_case_resume_interview

The user picks up an interview she left partway.

- **Prerequisites:** `use_case_new_project`, then she answers some of the tutor's questions, and the tutor saves each answer (`use_case_project_interview`), and she leaves the chat before the interview is done.
- **Steps:**
  - She opens the project and starts a new chat in it ([`use_case_new_chat`](chats.md#use_case_new_chat)), with any persona.
  - Before she writes anything, the chat opens with the tutor, in that persona's voice, summing up what she already told it and asking the next thing the interview still needs.
  - She answers, and the tutor carries on with the interview as the first chat did, saving each answer, and in the end adds her milestones.
- **Outcome:** nothing she answered in the first chat is lost: the project's memory holds it, and the new chat's opening sums it up. The new chat asks only for what the memory still lacks. Each later save shows its notice in the new chat, and the memory holds her goal, skill level, purpose and milestones once the interview is done.
- **Next:**
  - [`use_case_view_memory`](memory.md#use_case_view_memory): check what the tutor wrote down.
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): start on the first milestone.

## use_case_open_project

The user opens one of her projects.

- **Prerequisites:** `use_case_view_projects`.
- **Steps:**
  - She picks a project.
  - The site shows its chats, newest first, and a way to start another.
- **Outcome:** the page shows the project's name, a way to open its memory, a way to start a chat, and every chat in the project, newest first. Each chat links to the chat by its name and its persona's name (by the persona's name alone before it has a name), then shows when it started. Chats from other projects do not appear. With no chats, the page says there are none yet.
- **Next:**
  - [`use_case_reopen_chat`](chats.md#use_case_reopen_chat): continue an earlier lesson.
  - [`use_case_new_chat`](chats.md#use_case_new_chat): start a fresh chat.
  - [`use_case_switch_persona`](chats.md#use_case_switch_persona): hear the project from a different voice.
  - [`use_case_view_memory`](memory.md#use_case_view_memory): see where the project stands.
