# Chats

The conventions for these cases are in [the index](README.md#conventions).

## use_case_new_chat

The user starts a chat in a project with the buddy she wants.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). At least one project exists ([`use_case_new_project`](projects.md#use_case_new_project)).
- **Steps:**
  - She opens the new chat page, or a project's page, which shows the same form.
  - She picks the project, an activity, and a buddy: Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler, Roland Dustchain or one of her own. The open chat and Hippy are already chosen unless she picks others. On a project's page, that project is already chosen.
  - The site starts the chat and opens it. With a built-in buddy and activity it starts at once, with the buddy's prepared opening (`use_case_prepared_opening`). With a buddy or activity of her own that she has edited, it takes a few seconds while the buddy writes its opening, and shows that it is working meanwhile.
- **Outcome:** the chat shows the project's name and the buddy's name. Before she writes anything, it holds one message from the buddy, in the buddy's voice: its prepared opening, which in the open chat asks what she would like to work on. An opening the buddy writes follows the activity's opening request: in the open chat, a brief synopsis of what the project's memory holds, if it holds anything, then one question: what to work on, such as the next milestone. The chat doesn't interview her: only a chat in the project interview does ([`use_case_project_interview`](projects.md#use_case_project_interview)), such as the chat the project was created with. Its heading reads "New chat" until it has a name. It is first in the project's list of chats, with that buddy. It keeps that buddy for its whole life. The buddy already knows the project's memory (see [`use_case_ask_whats_next`](memory.md#use_case_ask_whats_next)).
- **Next:**
  - `use_case_send_message`: say hello or ask something.
  - `use_case_ask_blender_question`: get straight to a Blender question.
  - `use_case_chat_named_automatically`: see the chat get a name from her first message.
  - `use_case_rename_chat`: give the chat a name of her own.
  - [`use_case_resume_interview`](projects.md#use_case_resume_interview): the project's interview was left unfinished; she goes back to its chat.
  - [`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude): Claude is unavailable.
  - `use_case_standalone_chat`: chat without choosing a project, in a standalone chat.
  - [`use_case_start_chat_in_activity`](activities.md#use_case_start_chat_in_activity): start a chat in another activity.
  - `use_case_talk_idea_through`: talk over an idea before it is a project.

## use_case_standalone_chat

The user starts or reopens a standalone chat, without choosing a project.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). She needs no project.
- **Steps:**
  - She signs in and lands on Home as always, not in a chat.
  - She opens Chats from Home, beside Projects, or from any signed-in page's header.
  - The Chats page offers a new-chat form and previous chats, standalone and project chats together, newest first (`use_case_list_all_chats`). Merely opening the page creates nothing.
  - She leaves the project at "No project", and chooses an activity and a buddy, built in or one of her own, and starts a chat. The open chat and Hippy are chosen initially.
  - The picker shows one buddy at a time: its name, its place in the order, such as "1 of 7", and a short description. Bars on either side step to the previous and next buddy, through the built-in buddies and then her own, and wrap round at either end. "Choose a buddy…" puts the list of every buddy in the card's place, at the same height, so nothing else on the page moves; choosing one, or pressing Escape, puts the card back. The keyboard alone can do all of this.
  - The site starts the chat, at once with a built-in buddy and activity (`use_case_prepared_opening`). The conversation opens at its own `/chats/[chatId]` URL, with the buddy's opening, which asks what she would like to work on or talk about. Starting it makes no project.
  - She sends a message, follows the Chats link above the conversation to return to the list, and later reopens the conversation.
- **Outcome:** each chat keeps its original buddy and messages across visits. The page shows its name, or "New chat" until it has one, and its buddy's name, with a link back to Chats rather than to a project. Starting another chat never replaces an earlier one. A standalone chat started before it got an opening keeps its history and buddy unchanged. Standalone chats are private and appear in no project's list.
- **Variations:**
  - Editing or deleting an owned buddy later does not change a chat's saved name or voice.
  - An invalid buddy or another user's buddy is refused, saving no chat.
  - While Claude is unavailable, a chat with a prepared opening still starts; one whose buddy has to write its opening is not saved ([`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude)).
  - Over quota, starting a chat is refused with the reset date; the selected buddy remains chosen and existing conversations stay readable.
  - While a chat starts, its button is disabled and the form shows progress.
- **Next:**
  - `use_case_talk_idea_through`: talk an idea over.
  - `use_case_project_from_standalone_chat`: ask the buddy to make the idea a project.
  - `use_case_send_message`: keep the conversation going.
  - `use_case_rename_chat`: give the chat a name of her own.

## use_case_prepared_opening

The user starts a chat and finds the buddy already speaking, with a brief opening prepared for that buddy and activity, without waiting for Claude.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She starts a standalone chat, a chat in one of her projects, or a new project, with a built-in buddy and a built-in activity, or with copies of her own that she has customized or cloned and only renamed. Claude may be unavailable meanwhile.
  - She starts another chat in the same buddy and activity.
  - In the first chat, she sends her first message and gets the reply, and later reopens the chat.
- **Outcome:** each chat starts at once, with one message from the buddy before she writes anything: the brief opening prepared for that buddy and activity, in the buddy's voice, and never another buddy's. In the open chat it asks what she would like to work on or talk about; in brainstorming, which idea or plan to explore; in project breakdown, which goal to break down; in a new project's interview, what she wants to make or learn. Starting it asks nothing of Claude, so it starts while Claude is unavailable too. The second chat is a separate chat, with the same opening, and the first chat is unchanged. The opening stays first in the chat, once, before her message and its reply, and editing or deleting her own buddy later doesn't change it. A buddy or an activity of her own that she has edited has no prepared opening: its buddy writes the chat's opening, as in `use_case_new_chat`. Chats started before prepared openings keep their history unchanged.
- **Next:**
  - `use_case_send_message`: answer the buddy's question.
  - `use_case_new_chat`: start a chat with a buddy of her own that she has edited.

## use_case_talk_idea_through

The user talks an idea through in a standalone chat before it becomes a project, if it ever does.

- **Prerequisites:** `use_case_standalone_chat`.
- **Steps:**
  - She describes an idea, and asks a Blender question about it.
  - She sends another message after the month's quota is used up.
- **Outcome:** the replies arrive as in any chat, and an answer from the Blender manual cites its sections under it ([`use_case_ask_blender_question`](#use_case_ask_blender_question)). Talking in a standalone chat creates no project unless she asks the buddy for one, and changes no project's memory. Over quota, her message is refused with the quota message, as in any chat ([`use_case_over_quota`](accounts.md#use_case_over_quota)), and its text is back in the box.
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project): the idea becomes a project.
  - `use_case_project_from_standalone_chat`: she asks the buddy to make the idea a project.

## use_case_project_from_standalone_chat

The user asks the buddy in a chat to turn the idea they talked through into a project.

- **Prerequisites:** `use_case_standalone_chat`.
- **Steps:**
  - She asks the buddy for a new project, with a name for it. The buddy creates it, with its interview's opening: the buddy's prepared one, or, for a buddy of her own that she has edited, one it writes, which takes a few seconds.
  - Under the reply, the chat says the project was created, with its name, and links to the project's first chat.
  - She follows the link.
  - Another time, she asks for a project while Claude is unavailable, or after the month's quota is used up.
- **Outcome:** the project is first in her projects list, under the name she gave it, as with [`use_case_new_project`](projects.md#use_case_new_project). The link opens its first chat, in the project interview, with the same buddy, which already holds the buddy's first question. While Claude is unavailable, the chat says so under the reply, and no project is saved. Over quota, her message is refused with the quota message, as in any chat ([`use_case_over_quota`](accounts.md#use_case_over_quota)), and no project is saved; a reply that crosses the quota as it runs creates none either.
- **Next:**
  - [`use_case_project_interview`](projects.md#use_case_project_interview): tell the buddy what she is after.

## use_case_new_chat_without_projects

The user starts a chat before she has any projects.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), with no projects yet.
- **Steps:**
  - She chooses to start a chat.
  - The project is "No project", the only choice. She picks a buddy and starts the chat.
- **Outcome:** the chat starts as a standalone chat, with the buddy's opening, as in `use_case_standalone_chat`.
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project): create a project for later chats.
  - `use_case_project_from_standalone_chat`: ask the buddy to make the idea a project.

## use_case_list_all_chats

The user looks for a chat on the Chats page, wherever it is: in a project or in none.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). The user has chats in a project ([`use_case_new_chat`](#use_case_new_chat)) and chats in no project (`use_case_standalone_chat`).
- **Steps:**
  - The user opens Chats, from Home or from any signed-in page's header.
- **Outcome:** the list holds every chat of theirs, those in their projects and those in none together, newest first. It holds no other user's chat. Each chat links to its conversation, as on its project's page. A project's own page still lists only that project's chats.
- **Next:**
  - `use_case_filter_chats_by_project`: narrow the list to one project's chats.
  - `use_case_chat_project_badge`: tell a project's chats from the ones in no project.
  - `use_case_send_message`: carry on in the chat they found.

## use_case_filter_chats_by_project

The user narrows the Chats page's list to one of their projects.

- **Prerequisites:** `use_case_list_all_chats`.
- **Steps:**
  - Above the list, the project selector offers All and each of their projects by name. All is chosen.
  - The user chooses one of their projects. The list filters immediately in the browser, without a Show chats action, navigation or another chat-list request.
  - The user reloads the page, or opens a link to it that they saved or shared.
  - The user chooses All again.
- **Outcome:** with a project chosen, the list holds only that project's chats, and the selector shows that project. The choice is in the page's address, so the reload and the link keep it for a viewer who owns that project; sharing the address does not share access. A valid owned project with no chats stays selected and shows the usual empty-chat message. With All, the list holds every chat of theirs again, using the complete list loaded with the page and preserving its newest-first order. The selector offers no other user's project. An address that names another user's project, a project that doesn't exist, a malformed id, an empty or missing value, or repeated project parameters (whether the values are equal or different) shows All and every chat of theirs, exactly as if it named no project. A shared address selecting a foreign project shows only the receiving user's All list and project choices, without disclosing the sender's project name or chats.
- **Next:**
  - `use_case_send_message`: carry on in one of the project's chats.
  - [`use_case_open_project`](projects.md#use_case_open_project): go to the project itself.

## use_case_chat_project_badge

The user tells a project's chats from the chats in no project on the Chats page.

- **Prerequisites:** `use_case_list_all_chats`.
- **Steps:**
  - The user looks over the list.
- **Outcome:** each chat in a project carries a badge with its project's name, beside the chat's own name and buddy. A chat in no project has no badge. A long project name is cut short in its badge rather than widening the page, even on a phone, and the badge is readable in every theme.
- **Next:**
  - `use_case_filter_chats_by_project`: show only that project's chats.

## use_case_send_message

The user writes to the buddy and gets a reply.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She types a message and sends it.
  - Her message appears in the chat at once, under her name.
  - The chat shows that the buddy is thinking, then the reply appears a little at a time, under the buddy's name and in the buddy's voice.
  - She cannot send another message until the reply has finished.
  - She types her next message while the reply is finishing: her text stays in the box, and she can send it once the reply has finished.
- **Outcome:** her message and the reply are in the chat, in that order, and both are still there after she reloads the page. An empty message, or one of only spaces, cannot be sent.
- **Variations:**
  - In a standalone chat, which is in no project, the reply arrives the same way. The buddy helps her talk an idea through and decide whether it should become a project, and nothing is saved to a project's memory.
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

The user leaves the chat while the buddy is still replying.

- **Prerequisites:** `use_case_send_message`, with the reply still arriving.
- **Steps:**
  - She reloads the page, closes it or loses her connection before the reply has finished.
  - Later, she opens the chat again.
  - Her browser sends the message again after the reply was saved: the chat shows her message and its reply once, and the buddy doesn't answer or charge for it again.
  - Her browser sends the message again while the reply is still arriving: the buddy doesn't start a second reply or charge for it again, and the first reply is still saved. If the first reply failed, the message sent again is answered at once.
- **Outcome:** once the buddy has had time to finish, the reopened chat shows her message and the whole reply, as if she had stayed. The reply is not cut off where she left. A chat reopened before the reply is saved shows only her message; the reply appears when she reopens or reloads it after the reply is saved (`reload-during-reply-known-gap`).
- **Next:**
  - `use_case_continue_chat`: carry on from the reply.

## use_case_ask_blender_question

The user asks how to do something in Blender and gets an answer backed by the manual.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks how to do something, such as beveling an edge.
  - The buddy looks the topic up in the Blender Reference Manual, sometimes more than once.
  - It answers in the buddy's voice. Steps, menu paths and keyboard shortcuts are exact whichever buddy is speaking.
  - Each fact taken from the manual comes with a link to the manual section it came from, shown apart from the buddy's words.
  - The answer arrives once, in the same reply, even when the buddy's last step after its searches held no words for her. She never has to ask again.
- **Outcome:** the reply gives steps with menu paths and keyboard shortcuts as the manual gives them. Under the buddy's words is a list of manual links, each named after a section the buddy looked up for this answer. The links are still there after she reopens the chat.
- **Next:**
  - `use_case_follow_citation`: read the manual section for more detail.
  - `use_case_send_message`: ask a follow-up.
  - `use_case_topic_not_in_manual`: ask about something the manual may not cover.
  - `use_case_ask_any_subject`: ask about something other than Blender.
  - [`use_case_buddy_updates_memory`](memory.md#use_case_buddy_updates_memory): report that she finished a milestone.

## use_case_see_working_note

The user tells the buddy's working notes apart from its answer.

- **Prerequisites:** `use_case_ask_blender_question`, with a reply in which the buddy notes what it needs before it looks something up.
- **Steps:**
  - The reply arrives. Before a search of the manual, the buddy writes a short note to itself, such as which page it needs.
  - The note shows where it was written, before the search, smaller and quieter than the answer and labelled as a working note.
  - The answer, written after the buddy's last search, reads as normal prose.
  - She reopens the chat.
- **Outcome:** the note shows as a quiet, labelled working note before the search, and the answer shows as normal prose after it. Both look the same after she reopens the chat. Her own messages are never shown as notes.
- **Next:**
  - `use_case_follow_citation`: read the manual section the answer came from.
  - `use_case_send_message`: ask a follow-up.

## use_case_follow_citation

The user opens the manual section the buddy cited.

- **Prerequisites:** `use_case_ask_blender_question`.
- **Steps:**
  - She opens one of the links under the answer.
  - The official Blender manual opens at the section the buddy used, for the current Blender release.
- **Outcome:** the link leads to the official Blender Reference Manual for the current release, at the page and heading the link is named after.
- **Next:**
  - `use_case_send_message`: come back and ask about something she read.

## use_case_topic_not_in_manual

The user asks about something the Blender manual does not cover.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks about something the manual has nothing on, such as a third-party add-on.
  - The buddy looks the topic up in the manual and finds nothing about it.
  - It says plainly, in the buddy's voice, that the manual does not cover this. If it found a related section, it points her to that, with a link.
- **Outcome:** the reply says the manual does not cover the topic, and it gives no Blender steps without a manual link. Any link under the reply leads to a real manual section that the buddy looked up. When nothing related was found, no links appear.
- **Next:**
  - `use_case_follow_citation`: read the related section.
  - `use_case_ask_blender_question`: ask about something the manual does cover.

## use_case_ask_any_subject

The user asks the buddy about something that has nothing to do with Blender.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks about something else, such as a recipe.
  - The buddy answers in its voice, as it answers anything else, without looking anything up in the Blender manual.
- **Outcome:** the reply answers her in full, without steering her back to Blender or her project, and shows no manual links. Her next Blender question is answered as usual, with its manual links.
- **Next:**
  - `use_case_ask_blender_question`: ask about Blender.

## use_case_reopen_chat

The user returns to an earlier chat.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project), in a project with at least one chat.
- **Steps:**
  - She picks a chat.
  - The site shows the whole conversation so far, with the same buddy.
- **Outcome:** the chat shows its name (or "New chat" before it has one) and the same buddy's name, then every message, hers and the buddy's, in the order they were sent, under the buddy's name. Replies keep their formatting and their manual links. She can send a new message.
- **Next:**
  - `use_case_continue_chat`: pick up the conversation.
  - `use_case_buddy_voice_consistent`: check the buddy still sounds like itself.
  - `use_case_rename_chat`: the chat's name no longer fits.

## use_case_continue_chat

The user carries on an earlier conversation, and the buddy remembers it.

- **Prerequisites:** `use_case_reopen_chat`.
- **Steps:**
  - She sends a message that refers to something said earlier, such as "repeat that shortcut".
  - The buddy answers with the earlier conversation in mind.
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
  - Every reply comes from the same buddy, in its own manner of speech, such as Hippy's calm talk of a chat as a journey.
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

The buddy names the chat from the conversation, so she can find it again in the project's list.

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
  - On the chat, she selects the pencil beside the title, named "Rename chat". An inline name field opens with Save name and Cancel actions. She types a name of up to 60 characters and saves it.
  - Another time, she edits the name and chooses Cancel. The existing name stays unchanged and the draft is discarded.
  - She can reach and operate the pencil, field and actions with the keyboard, including on a narrow phone screen.
  - The chat's heading shows her name at once.
  - She keeps chatting.
- **Outcome:** the chat's heading, Chats list and project's list of chats show her name, after a reload too. The site never renames the chat again, whatever she sends. An empty name, or one of only spaces, is refused with a message asking for a name; her text stays in the field and the chat keeps its old name.
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
- **Outcome:** wherever she has scrolled, the link back to the project, the chat's name and the box she writes in stay on screen, and nothing covers them. On a phone, in every theme, the pinned header is at most 112 CSS pixels tall while retaining 44-pixel navigation and rename targets, and the composer stays above the on-screen keyboard. Long project, chat and buddy names fit at 320 CSS pixels without horizontal page overflow. Standalone chats keep the link back to Chats. Jumping to a message shows it below the header, not under it.
- **Next:**
  - [`use_case_open_project`](projects.md#use_case_open_project): back on the project.

## use_case_follow_latest_messages

The user follows the latest messages without repeatedly scrolling down.

- **Prerequisites:** `use_case_reopen_chat` or `use_case_send_message`.
- **Steps:**
  - The user opens an existing chat. It opens at the latest message.
  - The user sends a message. The latest message comes into view.
  - While at the bottom, the user follows new messages and streamed reply content automatically.
  - The user scrolls up to read earlier messages. Incoming content preserves their reading position.
  - The user returns to the bottom or sends another message. Automatic scrolling resumes.
- **Outcome:** the chat follows the latest content only while the user wants to follow it. On phones, the composer stays above the keyboard and following adapts to the available space. Scroll movements are instant, including when reduced motion is requested.
