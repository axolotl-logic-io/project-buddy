# Use cases

How Autumn uses the Blender tutor, described from her side of the screen. Tests are derived from these cases.

## Conventions

- Each use case has a slug of the form `use_case_<name>`. Refer to a case by its slug. Cases are not numbered.
- A case describes what the user wants, what she does and what she sees. It says nothing about how the system is built: "send the message", not "press the submit button".
- **Prerequisites** lists the cases that must have happened first. Every listed case is required.
- **Steps** is the interaction, in order, from the user's point of view.
- **Outcome** is what is true when the case ends.
- **Next** lists cases the user might go on to, each with a hint about why she would.
- The document covers version 1 as planned, including parts not built yet. A case describes the intended behavior, not the current state of the code.
- There is one user, Autumn. "The user" and "she" both mean her.

## Access

### use_case_visit_signed_out

The user opens any page of the site without being signed in.

- **Prerequisites:** none.
- **Steps:**
  - She opens a page, either from a bookmark or by typing the address.
  - The site asks for the passphrase instead of showing the page.
- **Outcome:** nothing in the site is visible until she signs in. Calls to the site's data from outside the pages are refused too.
- **Next:**
  - `use_case_login_success`: she knows the passphrase.
  - `use_case_login_wrong_passphrase`: she mistypes it.

### use_case_login_success

The user signs in with the correct passphrase.

- **Prerequisites:** `use_case_visit_signed_out`.
- **Steps:**
  - She enters the passphrase.
  - The site lets her in and shows the home page.
- **Outcome:** she is signed in on this browser and stays signed in for about a month.
- **Next:**
  - `use_case_view_projects`: see what she has been working on.
  - `use_case_new_project`: start learning something new.
  - `use_case_return_signed_in`: come back another day without signing in again.

### use_case_login_wrong_passphrase

The user enters a wrong passphrase.

- **Prerequisites:** `use_case_visit_signed_out`.
- **Steps:**
  - She enters a passphrase that is wrong.
  - The site says the passphrase is wrong and asks again.
- **Outcome:** she is still signed out. The failed attempt counts toward the lockout.
- **Next:**
  - `use_case_login_success`: try again with the right one.
  - `use_case_login_locked_out`: keep getting it wrong.

### use_case_login_locked_out

The user has entered too many wrong passphrases in a short time.

- **Prerequisites:** `use_case_login_wrong_passphrase`, several times within a few minutes.
- **Steps:**
  - She enters a passphrase, right or wrong.
  - The site says there have been too many failed attempts and to try again later.
- **Outcome:** she cannot sign in from this connection until the waiting period ends. Then she can try again.
- **Next:**
  - `use_case_login_success`: after the wait.

### use_case_return_signed_in

The user comes back to the site later on the same browser.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She opens the site.
  - It goes straight to the page she asked for, without asking for the passphrase.
- **Outcome:** she picks up where she left off.
- **Next:**
  - `use_case_reopen_chat`: continue a lesson.
  - `use_case_view_projects`: look over her projects.
  - `use_case_session_expired`: she has been away for more than a month.

### use_case_session_expired

The user returns after her sign-in has lapsed.

- **Prerequisites:** `use_case_login_success`, about a month earlier.
- **Steps:**
  - She opens the site.
  - The site asks for the passphrase again.
- **Outcome:** she is signed out until she enters the passphrase.
- **Next:**
  - `use_case_login_success`: sign in again.

## Projects

### use_case_view_projects

The user looks over her projects.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She goes to her projects.
  - The site lists them, newest first. If there are none, it invites her to create one.
- **Outcome:** she can see every project she has.
- **Next:**
  - `use_case_open_project`: work on one of them.
  - `use_case_new_project`: start another.
  - `use_case_storage_unavailable`: the list will not load.

### use_case_new_project

The user starts a project for something she wants to make or learn in Blender.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She chooses to start a new project and gives it a name.
  - The site creates the project and starts its first chat, the interview.
- **Outcome:** the project exists, and the interview is under way.
- **Next:**
  - `use_case_project_interview`: tell the tutor what she is after.

### use_case_project_interview

The tutor learns what the user wants from a new project.

- **Prerequisites:** `use_case_new_project`.
- **Steps:**
  - The tutor asks about her goal, her skill level, what the result is for and any limits on time or hardware.
  - She answers in her own words, and the tutor asks follow-up questions where something is unclear.
  - The tutor sums up her goals and a path of milestones, and saves them to the project's memory.
- **Outcome:** the project's memory holds her goals and milestones, and the tutor shows what it saved.
- **Next:**
  - `use_case_view_memory`: check what the tutor wrote down.
  - `use_case_edit_memory`: correct something it got wrong.
  - `use_case_ask_blender_question`: start on the first milestone.

### use_case_open_project

The user opens one of her projects.

- **Prerequisites:** `use_case_view_projects`.
- **Steps:**
  - She picks a project.
  - The site shows its chats, newest first, and a way to start another.
- **Outcome:** she sees everything that belongs to the project.
- **Next:**
  - `use_case_reopen_chat`: continue an earlier lesson.
  - `use_case_new_chat`: start a fresh chat.
  - `use_case_switch_persona`: hear the project from a different voice.
  - `use_case_view_memory`: see where the project stands.

## Chats

### use_case_new_chat

The user starts a chat in a project with the persona she wants.

- **Prerequisites:** `use_case_login_success`. At least one project exists (`use_case_new_project`).
- **Steps:**
  - She chooses to start a chat.
  - She picks the project and a persona: Hippy, Mr. T, Ford Pines, Stan Pines, Egon Spengler or Roland Deschain. Hippy is already chosen unless she picks another.
  - The site opens the new, empty chat.
- **Outcome:** the chat belongs to that project and speaks as that persona for its whole life. The tutor already knows the project's memory.
- **Next:**
  - `use_case_send_message`: say hello or ask something.
  - `use_case_ask_blender_question`: get straight to a Blender question.

### use_case_send_message

The user writes to the tutor and gets a reply.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She types a message and sends it.
  - Her message appears in the chat at once.
  - The tutor's reply appears a little at a time, in the persona's voice.
  - She cannot send another message until the reply has finished.
- **Outcome:** both her message and the reply are saved in the chat.
- **Next:**
  - `use_case_send_message`: keep the conversation going.
  - `use_case_ask_blender_question`: ask how to do something.
  - `use_case_reply_fails`: the reply does not arrive.

### use_case_ask_blender_question

The user asks how to do something in Blender and gets an answer backed by the manual.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks how to do something, such as beveling an edge.
  - The tutor looks the topic up in the Blender Reference Manual, sometimes more than once.
  - It answers in the persona's voice. Steps, menu paths and keyboard shortcuts are exact whichever persona is speaking.
  - Each fact taken from the manual comes with a link to the manual section it came from, shown apart from the persona's words.
- **Outcome:** she has an answer she can follow and check against the manual.
- **Next:**
  - `use_case_follow_citation`: read the manual section for more detail.
  - `use_case_send_message`: ask a follow-up.
  - `use_case_tutor_updates_memory`: report that she finished a milestone.

### use_case_follow_citation

The user opens the manual section the tutor cited.

- **Prerequisites:** `use_case_ask_blender_question`.
- **Steps:**
  - She opens one of the links under the answer.
  - The official Blender manual opens at the section the tutor used, for the current Blender release.
- **Outcome:** she reads the source in the manual itself.
- **Next:**
  - `use_case_send_message`: come back and ask about something she read.

### use_case_reopen_chat

The user returns to an earlier chat.

- **Prerequisites:** `use_case_open_project`, in a project with at least one chat.
- **Steps:**
  - She picks a chat.
  - The site shows the whole conversation so far, with the same persona.
- **Outcome:** the chat is ready to continue.
- **Next:**
  - `use_case_continue_chat`: pick up the conversation.

### use_case_continue_chat

The user carries on an earlier conversation, and the tutor remembers it.

- **Prerequisites:** `use_case_reopen_chat`.
- **Steps:**
  - She sends a message that refers to something said earlier, such as "repeat that shortcut".
  - The tutor answers with the earlier conversation in mind.
- **Outcome:** the conversation continues as if she had never left.
- **Next:**
  - `use_case_send_message`: keep going.

### use_case_switch_persona

The user wants a different voice for the same project.

- **Prerequisites:** `use_case_open_project`.
- **Steps:**
  - She starts a new chat in the same project and picks a different persona.
  - The new persona already knows the project's goals and progress from its memory.
- **Outcome:** she has a chat in the new voice. Earlier chats keep their own persona.
- **Next:**
  - `use_case_ask_blender_question`: hear the new persona explain something.

### use_case_open_missing_page

The user follows a link to a project or chat that does not exist.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She opens an old or mistyped link.
  - The site says the project or chat cannot be found.
- **Outcome:** nothing changes, and she can find her way back to her projects.
- **Next:**
  - `use_case_view_projects`: find what she was looking for.

## Project memory

### use_case_tutor_updates_memory

The tutor records progress or a change of plan in the project's memory.

- **Prerequisites:** `use_case_send_message`, in a chat where she reports progress, changes a goal or states a preference.
- **Steps:**
  - She says something worth remembering, such as "I finished the roof" or "I'd rather use keyboard shortcuts".
  - The tutor updates the project's memory and shows the change in the chat.
- **Outcome:** every chat in the project, present and future, knows about the change.
- **Next:**
  - `use_case_view_memory`: look at the whole memory.
  - `use_case_undo_memory_change`: the tutor got it wrong.

### use_case_view_memory

The user reads the project's memory.

- **Prerequisites:** `use_case_open_project`.
- **Steps:**
  - She opens the project's memory.
  - The site shows her goals, milestones, progress and preferences as the tutor and she have written them.
- **Outcome:** she sees exactly what the tutor knows about the project.
- **Next:**
  - `use_case_edit_memory`: fix or add something.
  - `use_case_undo_memory_change`: roll back a change.

### use_case_edit_memory

The user changes the project's memory herself.

- **Prerequisites:** `use_case_view_memory`.
- **Steps:**
  - She edits the memory and saves it.
  - The site keeps her version and the one before it.
- **Outcome:** chats in the project use her version from the next message on.
- **Next:**
  - `use_case_send_message`: carry on with the corrected memory.
  - `use_case_undo_memory_change`: change her mind.
  - `use_case_memory_edit_conflict`: the tutor changed the memory while she was editing.

### use_case_undo_memory_change

The user takes back a change to the project's memory.

- **Prerequisites:** `use_case_tutor_updates_memory` or `use_case_edit_memory`.
- **Steps:**
  - She looks at the earlier versions of the memory.
  - She picks a change and undoes it.
- **Outcome:** the memory is back to how it was before that change, and the undo itself is kept as a new version.
- **Next:**
  - `use_case_view_memory`: check the result.

### use_case_memory_edit_conflict

The memory changed while the user was editing it.

- **Prerequisites:** `use_case_edit_memory` started, then `use_case_tutor_updates_memory` in another chat before she saved.
- **Steps:**
  - She saves her edit.
  - The site tells her the memory changed since she started and does not overwrite the newer version.
- **Outcome:** no change is lost. She sees the newer version and can make her edit again.
- **Next:**
  - `use_case_edit_memory`: redo her edit on the newer version.

## When things go wrong

### use_case_reply_fails

The tutor cannot reply to a message.

- **Prerequisites:** `use_case_send_message`.
- **Steps:**
  - She sends a message.
  - Instead of a reply, the chat shows a short, plain message that says what kind of problem it is. Each kind has its own fixed message:
    - the tutor's account has run out of credit;
    - the tutor's account key is not accepted;
    - the tutor is getting too many requests;
    - the tutor is overloaded right now;
    - the conversation has grown too long;
    - the tutor's service is having trouble;
    - the tutor cannot be reached;
    - the site cannot reach its storage;
    - something unexpected went wrong.
- **Outcome:** her message stays in the chat. The full details of the problem are recorded for Autumn to look into later. They are not shown in the chat.
- **Next:**
  - `use_case_send_message`: try again once the problem is fixed.
  - `use_case_new_chat`: start fresh if the conversation has grown too long.

### use_case_storage_unavailable

The site cannot load or save the user's projects and chats.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She opens her projects, a chat or the memory, or tries to save something.
  - The site shows a short, plain message saying it cannot reach its storage right now.
- **Outcome:** nothing is half-saved. The details are recorded for Autumn to look into.
- **Next:**
  - `use_case_view_projects`: try again later.

## Site upkeep

### use_case_see_manual_credit

The user sees credit given to the Blender manual.

- **Prerequisites:** none.
- **Steps:**
  - She looks at the bottom of any page, including the passphrase page.
  - It credits the Blender Reference Manual and its CC BY-SA 4.0 license, with links to both.
- **Outcome:** the manual is credited everywhere its content can appear.
- **Next:** none.

### use_case_update_manual

Autumn updates the tutor's copy of the manual when a new stable Blender release ships.

- **Prerequisites:** a new stable Blender release exists.
- **Steps:**
  - She points the site at the new release and runs one command to rebuild the tutor's copy of the manual.
  - The tutor's copy is replaced in one go, so answers never mix two releases.
- **Outcome:** the tutor answers from the new release, and its links lead to matching pages in the manual.
- **Next:**
  - `use_case_ask_blender_question`: ask about something new in the release.
