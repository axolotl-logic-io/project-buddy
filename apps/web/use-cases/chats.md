# Chats

The conventions for these cases are in [the index](README.md#conventions).

## use_case_new_chat

The user starts a chat in a project with the buddy she wants.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). At least one project exists ([`use_case_new_project`](projects.md#use_case_new_project)).
- **Steps:**
  - She chooses to start a chat.
  - She picks the project and a buddy: Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler or Roland Dustchain. Hippy is already chosen unless she picks another. If she started from a project's page, that project is already chosen.
  - The site starts the chat, which takes a few seconds while the tutor writes its opening, and shows that it is working meanwhile. Then it opens the new chat.
- **Outcome:** the chat shows the project's name and the buddy's name. Before she writes anything, it holds one message from the tutor, in the buddy's voice: a brief synopsis of what the project's memory holds, if it holds anything, then one question: what to work on, such as the next milestone. The chat is a lesson: only the chat the project was created with interviews her ([`use_case_project_interview`](projects.md#use_case_project_interview)), even while that interview is not done. Its heading reads "New chat" until it has a name. It is first in the project's list of chats, with that buddy. It keeps that buddy for its whole life. The tutor already knows the project's memory (see [`use_case_ask_whats_next`](memory.md#use_case_ask_whats_next)).
- **Next:**
  - `use_case_send_message`: say hello or ask something.
  - `use_case_ask_blender_question`: get straight to a Blender question.
  - `use_case_chat_named_automatically`: see the chat get a name from her first message.
  - `use_case_rename_chat`: give the chat a name of her own.
  - [`use_case_resume_interview`](projects.md#use_case_resume_interview): the project's interview was left unfinished; she goes back to its chat.
  - [`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude): Claude is unavailable.

## use_case_new_chat_without_projects

The user tries to start a chat before she has any projects.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), with no projects yet.
- **Steps:**
  - She chooses to start a chat.
  - The site says she needs to create a project first, with a link to her projects.
- **Outcome:** no chat is started, and the page offers no project or buddy to pick. The link leads to her projects, where she can create one.
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project): create the project the chat will belong to.

## use_case_send_message

The user writes to the tutor and gets a reply.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She types a message and sends it.
  - Her message appears in the chat at once, under her name.
  - The chat shows that the buddy is thinking, then the reply appears a little at a time, under the buddy's name and in the buddy's voice.
  - She cannot send another message until the reply has finished.
  - She types her next message while the reply is finishing: her text stays in the box, and she can send it once the reply has finished.
- **Outcome:** her message and the reply are in the chat, in that order, and both are still there after she reloads the page. An empty message, or one of only spaces, cannot be sent.
- **Variations:**
  - In her central chat, which is in no project, the reply arrives the same way. The tutor helps her talk an idea through and decide whether it should become a project, and nothing is saved to a project's memory.
- **Next:**
  - `use_case_send_message`: keep the conversation going.
  - `use_case_chat_named_automatically`: her first message gives the chat a name.
  - `use_case_ask_blender_question`: ask how to do something.
  - `use_case_read_formatted_reply`: the reply has steps, shortcuts or a script.
  - `use_case_leave_during_reply`: she has to go before the reply finishes.
  - [`use_case_reply_fails`](when-things-go-wrong.md#use_case_reply_fails): the reply does not arrive.

## use_case_read_formatted_reply

The user reads a reply laid out with headings, lists and code, the way a written guide would be.

- **Prerequisites:** `use_case_send_message`, asking for something whose answer has steps, shortcuts or a Python script.
- **Steps:**
  - The reply arrives.
  - Headings, bold and italic words, numbered and bulleted lists, tables and links appear formatted. Code is set apart in a fixed-width font, with Python colored by its syntax.
- **Outcome:** once the reply has finished, it shows no raw formatting marks, such as `**`, a leading `#` or backticks, and it looks the same after she reopens the chat. Her own messages appear exactly as she typed them, marks included.
- **Next:**
  - `use_case_send_message`: ask about one of the steps.
  - `use_case_ask_blender_question`: ask for something she can follow step by step.

## use_case_leave_during_reply

The user leaves the chat while the tutor is still replying.

- **Prerequisites:** `use_case_send_message`, with the reply still arriving.
- **Steps:**
  - She reloads the page, closes it or loses her connection before the reply has finished.
  - Later, she opens the chat again.
  - Her browser sends the message again after the reply was saved: the chat shows her message and its reply once, and the tutor doesn't answer or charge for it again.
  - Her browser sends the message again while the reply is still arriving: the tutor doesn't start a second reply or charge for it again, and the first reply is still saved. If the first reply failed, the message sent again is answered at once.
- **Outcome:** once the tutor has had time to finish, the reopened chat shows her message and the whole reply, as if she had stayed. The reply is not cut off where she left. A chat reopened before the reply is saved shows only her message; the reply appears when she reopens or reloads it after the reply is saved (`reload-during-reply-known-gap`).
- **Next:**
  - `use_case_continue_chat`: carry on from the reply.

## use_case_ask_blender_question

The user asks how to do something in Blender and gets an answer backed by the manual.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks how to do something, such as beveling an edge.
  - The tutor looks the topic up in the Blender Reference Manual, sometimes more than once.
  - It answers in the buddy's voice. Steps, menu paths and keyboard shortcuts are exact whichever buddy is speaking.
  - Each fact taken from the manual comes with a link to the manual section it came from, shown apart from the buddy's words.
  - The answer arrives once, in the same reply, even when the tutor's last step after its searches held no words for her. She never has to ask again.
- **Outcome:** the reply gives steps with menu paths and keyboard shortcuts as the manual gives them. Under the buddy's words is a list of manual links, each named after a section the tutor looked up for this answer. The links are still there after she reopens the chat.
- **Next:**
  - `use_case_follow_citation`: read the manual section for more detail.
  - `use_case_send_message`: ask a follow-up.
  - `use_case_topic_not_in_manual`: ask about something the manual may not cover.
  - `use_case_ask_outside_blender`: ask about something other than Blender.
  - [`use_case_tutor_updates_memory`](memory.md#use_case_tutor_updates_memory): report that she finished a milestone.

## use_case_see_working_note

The user tells the tutor's working notes apart from its answer.

- **Prerequisites:** `use_case_ask_blender_question`, with a reply in which the tutor notes what it needs before it looks something up.
- **Steps:**
  - The reply arrives. Before a search of the manual, the tutor writes a short note to itself, such as which page it needs.
  - The note shows where it was written, before the search, smaller and quieter than the answer and labelled as a working note.
  - The answer, written after the tutor's last search, reads as normal prose.
  - She reopens the chat.
- **Outcome:** the note shows as a quiet, labelled working note before the search, and the answer shows as normal prose after it. Both look the same after she reopens the chat. Her own messages are never shown as notes.
- **Next:**
  - `use_case_follow_citation`: read the manual section the answer came from.
  - `use_case_send_message`: ask a follow-up.

## use_case_follow_citation

The user opens the manual section the tutor cited.

- **Prerequisites:** `use_case_ask_blender_question`.
- **Steps:**
  - She opens one of the links under the answer.
  - The official Blender manual opens at the section the tutor used, for the current Blender release.
- **Outcome:** the link leads to the official Blender Reference Manual for the current release, at the page and heading the link is named after.
- **Next:**
  - `use_case_send_message`: come back and ask about something she read.

## use_case_topic_not_in_manual

The user asks about something the Blender manual does not cover.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks about something the manual has nothing on, such as a third-party add-on.
  - The tutor looks the topic up in the manual and finds nothing about it.
  - It says plainly, in the buddy's voice, that the manual does not cover this. If it found a related section, it points her to that, with a link.
- **Outcome:** the reply says the manual does not cover the topic, and it gives no Blender steps without a manual link. Any link under the reply leads to a real manual section that the tutor looked up. When nothing related was found, no links appear.
- **Next:**
  - `use_case_follow_citation`: read the related section.
  - `use_case_ask_blender_question`: ask about something the manual does cover.

## use_case_ask_outside_blender

The user asks the tutor something that has nothing to do with Blender.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks about something else, such as a recipe.
  - The tutor answers briefly in the buddy's voice and offers to get back to her project.
- **Outcome:** the reply answers her, offers to return to the project and shows no manual links. Her next Blender question is answered as usual, with its manual links.
- **Next:**
  - `use_case_ask_blender_question`: get back to the project.

## use_case_reopen_chat

The user returns to an earlier chat.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project), in a project with at least one chat.
- **Steps:**
  - She picks a chat.
  - The site shows the whole conversation so far, with the same buddy.
- **Outcome:** the chat shows its name (or "New chat" before it has one) and the same buddy's name, then every message, hers and the tutor's, in the order they were sent, under the buddy's name. Replies keep their formatting and their manual links. She can send a new message.
- **Next:**
  - `use_case_continue_chat`: pick up the conversation.
  - `use_case_buddy_voice_consistent`: check the buddy still sounds like itself.
  - `use_case_rename_chat`: the chat's name no longer fits.

## use_case_continue_chat

The user carries on an earlier conversation, and the tutor remembers it.

- **Prerequisites:** `use_case_reopen_chat`.
- **Steps:**
  - She sends a message that refers to something said earlier, such as "repeat that shortcut".
  - The tutor answers with the earlier conversation in mind.
- **Outcome:** the reply uses what was said earlier in the chat. Asked to repeat a shortcut, it gives the same shortcut as before.
- **Next:**
  - `use_case_send_message`: keep going.

## use_case_switch_buddy

The user wants a different voice for the same project.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She starts a new chat in the same project and picks a different buddy.
  - The new buddy already knows the project's goals and progress from its memory: the chat opens with its synopsis of them.
- **Outcome:** the project lists the new chat with the new buddy, and the earlier chats with their own buddies. Each earlier chat still shows its original buddy when opened. Asked what comes next, the new buddy names the same milestone that the project's memory gives.
- **Next:**
  - `use_case_ask_blender_question`: hear the new buddy explain something.
  - `use_case_same_facts_any_buddy`: check that the new voice teaches the same steps.

## use_case_buddy_voice_consistent

The buddy keeps its voice for the whole chat, across visits.

- **Prerequisites:** `use_case_send_message`, several times in one chat.
- **Steps:**
  - She chats for a while, leaves, and later reopens the chat and carries on.
  - Every reply comes from the same buddy, in its own manner of speech, such as Hippy's calm talk of a lesson as a journey.
- **Outcome:** the chat's heading and every reply show the same buddy's name, before and after she reopens it. Every reply speaks in that buddy's manner, from the first to the last, and none speaks as another buddy or in a plain assistant voice.
- **Next:**
  - `use_case_switch_buddy`: try a different voice in a new chat.

## use_case_same_facts_any_buddy

The user asks two buddies the same question and gets the same facts in different voices.

- **Prerequisites:** `use_case_switch_buddy`, so the project has chats with two different buddies.
- **Steps:**
  - She asks the same Blender question in both chats, such as how to bevel an edge.
  - Each buddy answers in its own voice.
- **Outcome:** the two replies are worded differently, but they give the same steps, menu paths and keyboard shortcuts. The manual links under both replies lead to the same sections.
- **Next:**
  - `use_case_follow_citation`: check the steps in the manual.

## use_case_chat_named_automatically

The tutor names the chat from the conversation, so she can find it again in the project's list.

- **Prerequisites:** `use_case_new_chat`.
- **Steps:**
  - She sends her first message and the reply arrives (`use_case_send_message`).
  - The site names the chat from the conversation so far, in a few words.
  - She keeps chatting. The site names the chat again after her 3rd, 5th, 7th and 14th messages, as the conversation finds its topic, and at no other time.
- **Outcome:** after she reloads the chat, or opens it from the project, its heading shows the name instead of "New chat", above the buddy's name. The project's list of chats links to the chat by that name, followed by its buddy's name. After her 2nd message the name stays as it was; after her 3rd it can change. If naming fails, the chat keeps its old name (or "New chat"), and neither the reply nor the chat shows an error. A chat she has renamed by hand (`use_case_rename_chat`) is never renamed by the site.
- **Next:**
  - `use_case_rename_chat`: she prefers a name of her own.
  - `use_case_reopen_chat`: find the chat again by its name.

## use_case_rename_chat

The user gives a chat a name of her own.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - On the chat, she chooses to rename it, types a name of up to 60 characters and saves it.
  - The chat's heading shows her name at once.
  - She keeps chatting.
- **Outcome:** the chat's heading and the project's list of chats show her name, after a reload too. The site never renames the chat again, whatever she sends. An empty name, or one of only spaces, is refused with a message asking for a name; her text stays in the field and the chat keeps its old name.
- **Next:**
  - `use_case_send_message`: carry on under the new name.
  - [`use_case_open_project`](projects.md#use_case_open_project): see the chat listed under her name.

## use_case_open_missing_page

The user follows a link to a project or chat that does not exist.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens an old, mistyped or garbled link to a project or chat, or an address the site does not have.
  - The site says the project or chat cannot be found.
- **Outcome:** the page says it cannot be found, rather than showing an error, and links back to her projects. Her projects and chats are unchanged.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): find what she was looking for.

## use_case_breadcrumbs_in_long_chat

The user is deep in a long chat and wants to go back to the project, without scrolling up.

- **Prerequisites:** `use_case_reopen_chat`, in a chat longer than the screen.
- **Steps:**
  - She scrolls down to the newest message, on a laptop or a phone.
  - She follows the link back to the project, above the chat's name.
- **Outcome:** wherever she has scrolled, the link back to the project, the chat's name and the box she writes in stay on screen, and nothing covers them. On a phone, in every theme, the pinned header takes at most a quarter of the screen, and the box she writes in stays above the on-screen keyboard. Jumping to a message shows it below the header, not under it.
- **Next:**
  - [`use_case_open_project`](projects.md#use_case_open_project): back on the project.
