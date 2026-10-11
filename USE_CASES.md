# Use cases

How Autumn uses the Blender tutor, described from her side of the screen. Tests are derived from these cases.

## Conventions

- Each use case has a slug of the form `use_case_<name>`. Refer to a case by its slug. Cases are not numbered.
- A case describes what the user wants, what she does and what she sees. It says nothing about how the system is built: "send the message", not "press the submit button".
- **Prerequisites** lists the cases that must have happened first. Every listed case is required.
- **Steps** is the interaction, in order, from the user's point of view.
- **Outcome** is what is true when the case ends. It names things she can see or do on the site, so that a test can check each one.
- **Next** lists cases the user might go on to, each with a hint about why she would.
- The document covers version 1 as planned, including parts not built yet. A case describes the intended behavior, not the current state of the code.
- There is one user, Autumn. "The user" and "she" both mean her.

## Access

### use_case_visit_signed_out

The user opens any page of the site without being signed in.

- **Prerequisites:** none.
- **Steps:**
  - She opens a page, either from a bookmark or by typing the address. The address can be any address on the site, including one that does not exist.
  - The site asks for the passphrase instead of showing the page.
- **Outcome:** the passphrase page shows only the site's name, the passphrase field and the manual credit. None of her projects, chats or memory appear. A request for the site's data from outside the pages, such as from a script, is refused as unauthorized and returns none of it.
- **Next:**
  - `use_case_login_success`: she knows the passphrase.
  - `use_case_login_wrong_passphrase`: she mistypes it.

### use_case_login_success

The user signs in with the correct passphrase.

- **Prerequisites:** `use_case_visit_signed_out`.
- **Steps:**
  - She enters the passphrase.
  - The site lets her in and shows the home page.
- **Outcome:** she is on the home page, which links to her projects. Every page now opens in this browser without the passphrase, and the sign-in lasts 30 days. Wrong passphrases entered before this no longer count toward the lockout.
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
- **Outcome:** the passphrase page is still showing and says the passphrase was wrong. Opening any other page still shows the passphrase page. The failed attempt counts toward the lockout.
- **Next:**
  - `use_case_login_success`: try again with the right one.
  - `use_case_login_locked_out`: keep getting it wrong.

### use_case_login_locked_out

The user has entered too many wrong passphrases in a short time.

- **Prerequisites:** `use_case_login_wrong_passphrase`, five times from the same connection within 15 minutes.
- **Steps:**
  - She enters a passphrase, right or wrong.
  - The site says there have been too many failed attempts and to try again later.
- **Outcome:** she is still signed out, even if she entered the right passphrase. Once 15 minutes have passed since the first of those failed attempts, the right passphrase signs her in again.
- **Next:**
  - `use_case_login_success`: after the wait.

### use_case_return_signed_in

The user comes back to the site later on the same browser.

- **Prerequisites:** `use_case_login_success`, less than 30 days earlier.
- **Steps:**
  - She opens the site at any page, such as a bookmarked chat.
  - It goes straight to the page she asked for, without asking for the passphrase.
- **Outcome:** the page she opened shows its content, and she did not have to enter the passphrase.
- **Next:**
  - `use_case_reopen_chat`: continue a lesson.
  - `use_case_view_projects`: look over her projects.
  - `use_case_session_expired`: she has been away for more than a month.
  - `use_case_session_expired_in_chat`: her sign-in lapses while a chat is open.

### use_case_session_expired

The user returns after her sign-in has lapsed.

- **Prerequisites:** `use_case_login_success`, more than 30 days earlier.
- **Steps:**
  - She opens the site.
  - The site asks for the passphrase again.
- **Outcome:** every page shows the passphrase page until she enters the passphrase. Once she does, she is signed in for another 30 days.
- **Next:**
  - `use_case_login_success`: sign in again.

### use_case_session_expired_in_chat

The user's sign-in lapses while a chat is open, and she sends a message.

- **Prerequisites:** `use_case_reopen_chat`, with the chat left open until her sign-in lapses.
- **Steps:**
  - She sends a message.
  - Instead of a reply, the chat says she has been signed out and needs to sign in again, with a link to the passphrase page.
- **Outcome:** no reply appears, and the chat shows the signed-out message rather than a general error. The link leads to the passphrase page. After she signs in and reopens the chat, the message she sent while signed out is not in it, so she can send it again.
- **Next:**
  - `use_case_login_success`: sign in again.
  - `use_case_send_message`: send the message again.

## Projects

### use_case_view_projects

The user looks over her projects.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She goes to her projects.
  - The site lists them, newest first. If there are none, it invites her to create one.
- **Outcome:** every project she has is listed by name, newest first, and each one links to the project. With no projects, the page says there are none yet and offers a way to create one on the same page.
- **Next:**
  - `use_case_open_project`: work on one of them.
  - `use_case_new_project`: start another.
  - `use_case_new_chat_without_projects`: she wants to chat before creating a project.
  - `use_case_storage_unavailable`: the list will not load.

### use_case_new_project

The user starts a project for something she wants to make or learn in Blender.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She chooses to start a new project and gives it a name.
  - The site creates the project and opens its first chat, the interview.
- **Outcome:** the project is first in her projects list, under the name she gave it. Its interview chat is listed in the project. The interview chat shows the tutor's first question, about what she wants to make, before she has written anything.
- **Next:**
  - `use_case_project_interview`: tell the tutor what she is after.
  - `use_case_new_project_without_name`: she forgets to name it.

### use_case_new_project_without_name

The user tries to start a project without giving it a name.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She chooses to start a new project and leaves the name empty, or types only spaces.
  - The site asks her for a name.
- **Outcome:** she is still on her projects page with the name field in front of her, rather than an error page. No new project appears in her projects list.
- **Next:**
  - `use_case_new_project`: give it a name this time.

### use_case_project_interview

The tutor learns what the user wants from a new project.

- **Prerequisites:** `use_case_new_project`.
- **Steps:**
  - The tutor asks about her goal, her skill level, what the result is for and any limits on time or hardware.
  - She answers in her own words, and the tutor asks follow-up questions where something is unclear.
  - The tutor sums up her goals and a path of milestones, and saves them to the project's memory.
- **Outcome:** the chat shows a notice, set apart from the tutor's words, with the goals and milestones it saved. The project's memory shows the same goals and milestones, and its history lists them as a version made by the tutor.
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
- **Outcome:** the page shows the project's name, a way to open its memory, a way to start a chat, and every chat in the project, newest first. Each chat shows its persona and when it started, and links to the chat. Chats from other projects do not appear. With no chats, the page says there are none yet.
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
  - She picks the project and a persona: Hippy, Mr. T, Ford Pines, Stan Pines, Egon Spengler or Roland Deschain. Hippy is already chosen unless she picks another. If she started from a project's page, that project is already chosen.
  - The site opens the new, empty chat.
- **Outcome:** the chat shows the project's name and the persona's name, and has no messages yet. It is first in the project's list of chats, with that persona. It keeps that persona for its whole life. The tutor already knows the project's memory (see `use_case_ask_whats_next`).
- **Next:**
  - `use_case_send_message`: say hello or ask something.
  - `use_case_ask_blender_question`: get straight to a Blender question.

### use_case_new_chat_without_projects

The user tries to start a chat before she has any projects.

- **Prerequisites:** `use_case_login_success`, with no projects yet.
- **Steps:**
  - She chooses to start a chat.
  - The site says she needs to create a project first, with a link to her projects.
- **Outcome:** no chat is started, and the page offers no project or persona to pick. The link leads to her projects, where she can create one.
- **Next:**
  - `use_case_new_project`: create the project the chat will belong to.

### use_case_send_message

The user writes to the tutor and gets a reply.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She types a message and sends it.
  - Her message appears in the chat at once, under her name.
  - The chat shows that the persona is thinking, then the reply appears a little at a time, under the persona's name and in the persona's voice.
  - She cannot send another message until the reply has finished.
- **Outcome:** her message and the reply are in the chat, in that order, and both are still there after she reloads the page. An empty message, or one of only spaces, cannot be sent.
- **Next:**
  - `use_case_send_message`: keep the conversation going.
  - `use_case_ask_blender_question`: ask how to do something.
  - `use_case_read_formatted_reply`: the reply has steps, shortcuts or a script.
  - `use_case_leave_during_reply`: she has to go before the reply finishes.
  - `use_case_reply_fails`: the reply does not arrive.

### use_case_read_formatted_reply

The user reads a reply laid out with headings, lists and code, the way a written guide would be.

- **Prerequisites:** `use_case_send_message`, asking for something whose answer has steps, shortcuts or a Python script.
- **Steps:**
  - The reply arrives.
  - Headings, bold and italic words, numbered and bulleted lists, tables and links appear formatted. Code is set apart in a fixed-width font, with Python colored by its syntax.
- **Outcome:** once the reply has finished, it shows no raw formatting marks, such as `**`, a leading `#` or backticks, and it looks the same after she reopens the chat. Her own messages appear exactly as she typed them, marks included.
- **Next:**
  - `use_case_send_message`: ask about one of the steps.
  - `use_case_ask_blender_question`: ask for something she can follow step by step.

### use_case_leave_during_reply

The user leaves the chat while the tutor is still replying.

- **Prerequisites:** `use_case_send_message`, with the reply still arriving.
- **Steps:**
  - She reloads the page, closes it or loses her connection before the reply has finished.
  - Later, she opens the chat again.
- **Outcome:** once the tutor has had time to finish, the reopened chat shows her message and the whole reply, as if she had stayed. The reply is not cut off where she left.
- **Next:**
  - `use_case_continue_chat`: carry on from the reply.

### use_case_ask_blender_question

The user asks how to do something in Blender and gets an answer backed by the manual.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks how to do something, such as beveling an edge.
  - The tutor looks the topic up in the Blender Reference Manual, sometimes more than once.
  - It answers in the persona's voice. Steps, menu paths and keyboard shortcuts are exact whichever persona is speaking.
  - Each fact taken from the manual comes with a link to the manual section it came from, shown apart from the persona's words.
- **Outcome:** the reply gives steps with menu paths and keyboard shortcuts as the manual gives them. Under the persona's words is a list of manual links, each named after a section the tutor looked up for this answer. The links are still there after she reopens the chat.
- **Next:**
  - `use_case_follow_citation`: read the manual section for more detail.
  - `use_case_send_message`: ask a follow-up.
  - `use_case_topic_not_in_manual`: ask about something the manual may not cover.
  - `use_case_ask_outside_blender`: ask about something other than Blender.
  - `use_case_tutor_updates_memory`: report that she finished a milestone.

### use_case_follow_citation

The user opens the manual section the tutor cited.

- **Prerequisites:** `use_case_ask_blender_question`.
- **Steps:**
  - She opens one of the links under the answer.
  - The official Blender manual opens at the section the tutor used, for the current Blender release.
- **Outcome:** the link leads to the official Blender Reference Manual for the current release, at the page and heading the link is named after.
- **Next:**
  - `use_case_send_message`: come back and ask about something she read.

### use_case_topic_not_in_manual

The user asks about something the Blender manual does not cover.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks about something the manual has nothing on, such as a third-party add-on.
  - The tutor looks the topic up in the manual and finds nothing about it.
  - It says plainly, in the persona's voice, that the manual does not cover this. If it found a related section, it points her to that, with a link.
- **Outcome:** the reply says the manual does not cover the topic, and it gives no Blender steps without a manual link. Any link under the reply leads to a real manual section that the tutor looked up. When nothing related was found, no links appear.
- **Next:**
  - `use_case_follow_citation`: read the related section.
  - `use_case_ask_blender_question`: ask about something the manual does cover.

### use_case_ask_outside_blender

The user asks the tutor something that has nothing to do with Blender.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks about something else, such as a recipe.
  - The tutor answers briefly in the persona's voice and offers to get back to her project.
- **Outcome:** the reply answers her, offers to return to the project and shows no manual links. Her next Blender question is answered as usual, with its manual links.
- **Next:**
  - `use_case_ask_blender_question`: get back to the project.

### use_case_reopen_chat

The user returns to an earlier chat.

- **Prerequisites:** `use_case_open_project`, in a project with at least one chat.
- **Steps:**
  - She picks a chat.
  - The site shows the whole conversation so far, with the same persona.
- **Outcome:** the chat shows every message, hers and the tutor's, in the order they were sent, under the same persona's name. Replies keep their formatting and their manual links. She can send a new message.
- **Next:**
  - `use_case_continue_chat`: pick up the conversation.
  - `use_case_persona_voice_consistent`: check the persona still sounds like itself.

### use_case_continue_chat

The user carries on an earlier conversation, and the tutor remembers it.

- **Prerequisites:** `use_case_reopen_chat`.
- **Steps:**
  - She sends a message that refers to something said earlier, such as "repeat that shortcut".
  - The tutor answers with the earlier conversation in mind.
- **Outcome:** the reply uses what was said earlier in the chat. Asked to repeat a shortcut, it gives the same shortcut as before.
- **Next:**
  - `use_case_send_message`: keep going.

### use_case_switch_persona

The user wants a different voice for the same project.

- **Prerequisites:** `use_case_open_project`.
- **Steps:**
  - She starts a new chat in the same project and picks a different persona.
  - The new persona already knows the project's goals and progress from its memory.
- **Outcome:** the project lists the new chat with the new persona, and the earlier chats with their own personas. Each earlier chat still shows its original persona when opened. Asked what comes next, the new persona names the same milestone that the project's memory gives.
- **Next:**
  - `use_case_ask_blender_question`: hear the new persona explain something.
  - `use_case_same_facts_any_persona`: check that the new voice teaches the same steps.

### use_case_persona_voice_consistent

The persona keeps its voice for the whole chat, across visits.

- **Prerequisites:** `use_case_send_message`, several times in one chat.
- **Steps:**
  - She chats for a while, leaves, and later reopens the chat and carries on.
  - Every reply comes from the same persona, in its own manner of speech, such as Hippy's calm talk of a lesson as a journey.
- **Outcome:** the chat's heading and every reply show the same persona's name, before and after she reopens it. Every reply speaks in that persona's manner, from the first to the last, and none speaks as another persona or in a plain assistant voice.
- **Next:**
  - `use_case_switch_persona`: try a different voice in a new chat.

### use_case_same_facts_any_persona

The user asks two personas the same question and gets the same facts in different voices.

- **Prerequisites:** `use_case_switch_persona`, so the project has chats with two different personas.
- **Steps:**
  - She asks the same Blender question in both chats, such as how to bevel an edge.
  - Each persona answers in its own voice.
- **Outcome:** the two replies are worded differently, but they give the same steps, menu paths and keyboard shortcuts. The manual links under both replies lead to the same sections.
- **Next:**
  - `use_case_follow_citation`: check the steps in the manual.

### use_case_open_missing_page

The user follows a link to a project or chat that does not exist.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She opens an old, mistyped or garbled link to a project or chat, or an address the site does not have.
  - The site says the project or chat cannot be found.
- **Outcome:** the page says it cannot be found, rather than showing an error, and links back to her projects. Her projects and chats are unchanged.
- **Next:**
  - `use_case_view_projects`: find what she was looking for.

## Project memory

### use_case_tutor_updates_memory

The tutor records progress or a change of plan in the project's memory.

- **Prerequisites:** `use_case_send_message`, in a chat where she reports progress, changes a goal or states a preference.
- **Steps:**
  - She says something worth remembering, such as "I finished the roof" or "I'd rather use keyboard shortcuts".
  - The tutor updates the project's memory and shows the change in the chat.
- **Outcome:** the chat shows a notice, set apart from the tutor's words, with what changed in the memory. The project's memory shows the change, and its history lists it as a new version made by the tutor. Every chat in the project, present and future, works from the changed memory from its next reply on (see `use_case_ask_whats_next`).
- **Next:**
  - `use_case_view_memory`: look at the whole memory.
  - `use_case_undo_memory_change`: the tutor got it wrong.

### use_case_view_memory

The user reads the project's memory.

- **Prerequisites:** `use_case_open_project`.
- **Steps:**
  - She opens the project's memory.
  - The site shows her goals, milestones, progress and preferences as the tutor and she have written them.
- **Outcome:** the page shows the newest version of the memory, formatted, exactly as it was last saved. Its history lists every version, newest first, with when it was made and whether she or the tutor made it. If nothing has been saved yet, the page says so and lets her write the memory herself.
- **Next:**
  - `use_case_edit_memory`: fix or add something.
  - `use_case_undo_memory_change`: roll back a change.
  - `use_case_ask_whats_next`: ask the tutor which milestone comes next.

### use_case_edit_memory

The user changes the project's memory herself.

- **Prerequisites:** `use_case_view_memory`.
- **Steps:**
  - She edits the memory and saves it.
  - The site keeps her version and the one before it.
- **Outcome:** the memory shows her text. Its history lists her version as the newest, made by her, with the version before it still listed. Chats in the project work from her version from their next reply on (see `use_case_ask_whats_next`).
- **Next:**
  - `use_case_send_message`: carry on with the corrected memory.
  - `use_case_undo_memory_change`: change her mind.
  - `use_case_memory_edit_conflict`: the tutor changed the memory while she was editing.

### use_case_undo_memory_change

The user takes back a change to the project's memory by restoring an earlier version.

- **Prerequisites:** `use_case_tutor_updates_memory` or `use_case_edit_memory`.
- **Steps:**
  - She looks at the earlier versions of the memory.
  - She picks the version from before the change and restores it.
- **Outcome:** the memory shows that earlier version's text again. Its history lists the restore as the newest version, made by her, and every version before it is still listed, so she can restore any of them later.
- **Next:**
  - `use_case_view_memory`: check the result.

### use_case_memory_edit_conflict

The memory changed while the user was editing it.

- **Prerequisites:** `use_case_edit_memory` started, then `use_case_tutor_updates_memory` in another chat before she saved.
- **Steps:**
  - She saves her edit.
  - The site tells her the memory changed since she started and does not overwrite the newer version.
- **Outcome:** the memory and its history still show the tutor's newer version as the newest, with no version from her save. The site shows her that newer version and keeps her unsaved text on screen, so she can make her edit again on top of it.
- **Next:**
  - `use_case_edit_memory`: redo her edit on the newer version.

### use_case_ask_whats_next

The user asks the tutor what to work on next, and it answers from the project's memory.

- **Prerequisites:** `use_case_project_interview`, so the memory holds milestones, then `use_case_new_chat` or `use_case_reopen_chat` in the same project.
- **Steps:**
  - She asks what she should work on next.
  - The tutor answers from the project's memory, in the persona's voice.
- **Outcome:** the reply names the first milestone that the memory does not mark as done. It names the same milestone in every chat of the project, whichever persona is speaking. After the memory changes, the next reply uses the changed memory.
- **Next:**
  - `use_case_ask_blender_question`: start on that milestone.
  - `use_case_tutor_updates_memory`: tell the tutor she has already done it.

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
    - the tutor's service refused the request;
    - the tutor's service is having trouble;
    - the tutor cannot be reached;
    - the site cannot reach its storage;
    - the site's storage refused a request;
    - something unexpected went wrong.
- **Outcome:** the chat shows the fixed message for that kind of problem and no reply. Her message is still in the chat after she reloads the page. The site's log records the problem for Autumn to look into later, and the chat shows none of those details.
- **Next:**
  - `use_case_send_message`: try again once the problem is fixed.
  - `use_case_new_chat`: start fresh if the conversation has grown too long.

### use_case_storage_unavailable

The site cannot load or save the user's projects and chats.

- **Prerequisites:** `use_case_login_success`.
- **Steps:**
  - She opens her projects, a chat or the memory, or tries to save something.
  - The site shows a short, plain message saying it cannot reach its storage right now.
- **Outcome:** the page shows that message in place of its content. Anything she tried to save is not there once the storage is back, not even in part. The site's log records the problem for Autumn to look into.
- **Next:**
  - `use_case_view_projects`: try again later.

## Site upkeep

### use_case_see_manual_credit

The user sees credit given to the Blender manual.

- **Prerequisites:** none.
- **Steps:**
  - She looks at the bottom of any page, including the passphrase page.
  - It credits the Blender Reference Manual and its CC BY-SA 4.0 license, with links to both.
- **Outcome:** every page, signed in or not, including the passphrase page and the not-found page, ends with the credit. It links to the Blender Reference Manual and to the CC BY-SA 4.0 license.
- **Next:** none.

### use_case_update_manual

Autumn updates the tutor's copy of the manual when a new stable Blender release ships.

- **Prerequisites:** a new stable Blender release exists.
- **Steps:**
  - She points the site at the new release and runs one command to rebuild the tutor's copy of the manual.
  - The tutor's copy is replaced in one go, so answers never mix two releases.
- **Outcome:** the tutor finds sections that are new in the release, and its links lead to the matching pages of the manual. If the command fails partway, the tutor still answers from the old copy, with nothing from the new release mixed in. Running the command again gives the same result.
- **Next:**
  - `use_case_ask_blender_question`: ask about something new in the release.
