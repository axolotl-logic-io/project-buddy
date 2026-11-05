# Chats

The conventions for these cases are in [the index](README.md#conventions).

## use_case_new_chat

The user starts a chat in a quest with the construct she wants.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). At least one quest exists ([`use_case_new_project`](projects.md#use_case_new_project)).
- **Steps:**
  - She opens the new chat page or the Chats page's "New chat" dialog, which show the same form, or the "New chat" dialog on a quest's page.
  - She picks the quest, an activity, and a construct: Vellum, Lumen or one of her own. The open chat and Vellum are already chosen unless she picks others. A quest's page shows its New chat button with the form closed, even after a reload. Its dialog, named "New chat", has no quest field: it offers only the activity and the construct, and starts the chat in that quest, in whichever activity she chooses, the quest interview included. The dialog takes the keyboard's focus and keeps it; Escape, or its close button, closes it without starting a chat and puts focus back on the button.
  - The site starts the chat and opens it. With a built-in construct and activity it starts at once, with the construct's prepared opening (`use_case_prepared_opening`). With a construct or activity of her own that she has edited, it takes a few seconds while the construct writes its opening, and shows that it is working meanwhile.
- **Outcome:** the chat shows the quest's name and the construct's name. Before she writes anything, it holds one message from the construct, in the construct's voice: its prepared opening, which in the open chat asks what she would like to work on. An opening the construct writes follows the activity's opening request: in the open chat, a brief synopsis of what the quest's memory holds, if it holds anything, then one question: what to work on, such as the next milestone. The chat doesn't interview her: only a chat in the quest interview does ([`use_case_project_interview`](projects.md#use_case_project_interview)), such as the chat the quest was created with. Active quest and standalone chats show no Activity dropdown or its label, progress or errors. Its heading reads "New chat" until it has a name. It is first in the quest's list of chats, with that construct. It keeps that construct for its whole life. The construct already knows the quest's memory (see [`use_case_ask_whats_next`](memory.md#use_case_ask_whats_next)).
- **Variations:**
  - On the main start form or the quest page’s start dialog, she chooses Quest interview in an existing quest. If its memory is empty, the construct asks about her goal; otherwise it revisits what is there and asks what is missing or should change. Starting this chat does not replace the memory.
- **Next:**
  - `use_case_send_message`: say hello or ask something.
  - `use_case_ask_blender_question`: get straight to a Blender question.
  - `use_case_chat_named_automatically`: see the chat get a name from her first message.
  - `use_case_rename_chat`: give the chat a name of her own.
  - [`use_case_resume_interview`](projects.md#use_case_resume_interview): the quest's interview was left unfinished; she goes back to its chat.
  - [`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude): Claude is unavailable.
  - `use_case_standalone_chat`: chat without choosing a quest, in a standalone chat.
  - [`use_case_start_chat_in_activity`](activities.md#use_case_start_chat_in_activity): start a chat in another activity.
  - `use_case_talk_idea_through`: talk over an idea before it is a quest.

## use_case_standalone_chat

The user starts or reopens a standalone chat, without choosing a quest.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). She needs no quest.
- **Steps:**
  - She signs in and lands on Home as always, not in a chat.
  - She opens Chats from Home, beside Quests, or from any signed-in page's header.
  - The Chats page leads with her previous chats, standalone and quest chats together, newest first, and their quest filter (`use_case_list_all_chats`). The new-chat form isn't on the page itself: a "New chat" button opens it in a dialog named "New chat". The dialog takes the keyboard's focus and keeps it; Escape, or its close button, closes it and puts focus back on the button. Merely opening the page, or opening and closing the dialog, creates nothing.
  - In the dialog, she leaves the quest at "No quest", and chooses an activity and a construct, built in or one of her own, and starts a chat. The open chat and Vellum are chosen initially.
  - The picker shows one construct at a time: its name, its place in the order, such as "1 of 7", and a short description. Bars on either side step to the previous and next construct, through the built-in constructs and then her own, and wrap round at either end. The keyboard alone can use both bars.
  - The site starts the chat, at once with a built-in construct and activity (`use_case_prepared_opening`). The conversation opens at its own `/chats/[chatId]` URL, with the construct's opening, which asks what she would like to work on or talk about. Starting it makes no quest.
  - She sends a message, follows the Chats link above the conversation to return to the list, and later reopens the conversation.
- **Outcome:** each chat keeps its original construct and messages across visits. The page shows its name, or "New chat" until it has one, and its construct's name, with a link back to Chats rather than to a quest. Starting another chat never replaces an earlier one. A standalone chat started before it got an opening keeps its history and construct unchanged. Standalone chats are private and appear in no quest's list.
- **Variations:**
  - Editing or deleting an owned construct later does not change a chat's saved name or voice.
  - An invalid construct or another user's construct is refused, saving no chat.
  - While Claude is unavailable, a chat with a prepared opening still starts; one whose construct has to write its opening is not saved ([`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude)).
  - Out of gold, starting a chat is refused with the out-of-gold message; the selected construct remains chosen and existing conversations stay readable.
  - While a chat starts, its button is disabled and the form shows progress.
- **Next:**
  - `use_case_talk_idea_through`: talk an idea over.
  - `use_case_project_from_standalone_chat`: ask the construct to make the idea a quest.
  - `use_case_send_message`: keep the conversation going.
  - `use_case_rename_chat`: give the chat a name of her own.

## use_case_prepared_opening

The user starts a chat and finds the construct already speaking, with a brief opening prepared for that construct and activity, without waiting for Claude.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She starts a standalone chat, a chat in one of her quests, or a new quest, with a built-in construct and a built-in activity, or with copies of her own that she has customized or cloned and only renamed. Claude may be unavailable meanwhile.
  - She starts another chat in the same construct and activity.
  - In the first chat, she sends her first message and gets the reply, and later reopens the chat.
- **Outcome:** each chat starts at once, with one message from the construct before she writes anything: the brief opening prepared for that construct and activity, in the construct's voice, and never another construct's. In the open chat it asks what she would like to work on or talk about; in brainstorming, which idea or plan to explore; in quest breakdown, which goal to break down; in a new quest's interview, what she wants to make or learn. Starting it asks nothing of Claude, so it starts while Claude is unavailable too. The second chat is a separate chat, with the same opening, and the first chat is unchanged. The opening stays first in the chat, once, before her message and its reply, and editing or deleting her own construct later doesn't change it. A construct or an activity of her own that she has edited has no prepared opening: its construct writes the chat's opening, as in `use_case_new_chat`. Chats started before prepared openings keep their history unchanged.
- **Next:**
  - `use_case_send_message`: answer the construct's question.
  - `use_case_new_chat`: start a chat with a construct of her own that she has edited.

## use_case_talk_idea_through

The user talks an idea through in a standalone chat before it becomes a quest, if it ever does.

- **Prerequisites:** `use_case_standalone_chat`.
- **Steps:**
  - She describes an idea, and asks a Blender question about it.
  - She sends another message once she is out of gold.
- **Outcome:** the replies arrive as in any chat, and an answer from the Blender manual cites its sections under it ([`use_case_ask_blender_question`](#use_case_ask_blender_question)). Talking in a standalone chat creates no quest unless she asks the construct for one, and changes no quest's memory. Out of gold, her message is refused with the out-of-gold message, as in any chat ([`use_case_out_of_gold`](accounts.md#use_case_out_of_gold)), and its text is back in the box.
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project): the idea becomes a quest.
  - `use_case_project_from_standalone_chat`: she asks the construct to make the idea a quest.

## use_case_project_from_standalone_chat

The user asks the construct in a chat to turn the idea they talked through into a quest.

- **Prerequisites:** `use_case_standalone_chat`.
- **Steps:**
  - She asks the construct for a new quest, with a name for it. The construct creates it, with its interview's opening: the construct's prepared one, or, for a construct of her own that she has edited, one it writes, which takes a few seconds.
  - Under the reply, the chat says the quest was created, with its name, and links to the quest's first chat.
  - She follows the link.
  - Another time, she asks for a quest while Claude is unavailable, or once she is out of gold.
- **Outcome:** the quest is first in her quests list, under the name she gave it, as with [`use_case_new_project`](projects.md#use_case_new_project). The link opens its first chat, in the quest interview, with the same construct, which already holds the construct's first question. A name longer than 80 characters fails the construct's call, which tells the construct the limit so it can suggest a shorter name, and no quest is saved. While Claude is unavailable, the chat says so under the reply, and no quest is saved. Out of gold, her message is refused with the out-of-gold message, as in any chat ([`use_case_out_of_gold`](accounts.md#use_case_out_of_gold)), and no quest is saved; a reply that spends the last of her gold as it runs creates none either.
- **Next:**
  - [`use_case_project_interview`](projects.md#use_case_project_interview): tell the construct what she is after.

## use_case_new_chat_without_projects

The user starts a chat before she has any quests.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), with no quests yet.
- **Steps:**
  - She chooses to start a chat.
  - The quest is "No quest", the only choice. She picks a construct and starts the chat.
- **Outcome:** the chat starts as a standalone chat, with the construct's opening, as in `use_case_standalone_chat`. Afterwards, the new chat page shows the chat under "Today" (`use_case_today_on_landing`).
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project): create a quest for later chats.
  - `use_case_project_from_standalone_chat`: ask the construct to make the idea a quest.

## use_case_home_atlas

The user finds the site's places on an illustrated parchment atlas.

- **Prerequisites:** a signed-in account.
- **Steps:**
  - The user opens Home or follows the site's name after signing in.
  - They follow a labeled destination, or switch between Map and List.
- **Outcome:** the heading is "Your projects await". "Don't know where to start? Try an Activity" links to Activities. Quests, Chats, Guild, Activities, Spellbook, Workshop, Image gallery, Marketplace and Settings are ordinary links to their existing pages. Map and List show the same destinations in the same keyboard order. Home has no header bar: its Quick Note link and menu button stay, over the map's corner, while the site's name and the Quests and Chats shortcuts, which lead only to the map's own places, are left out. Every other page's header is a HUD in the atlas's ink and gold, whose site's name leads back to the map and which names the map's place the page belongs to where there is room. On a phone, the map becomes an overview above large destination rows. Viewing the page creates nothing and makes no model call.
- **Variations:**
  - Following a link away from Home restores the destination's header and content column without a refresh. Returning to Home restores the map layout, including with browser back and forward.
  - Before the first quest, Start a quest opens the interview start page.
  - The map's artwork is decorative; navigation works without the image, dragging, hovering or animation.
  - A signed-out visitor is sent to sign in before any recent work is read.

## use_case_today_on_landing

The user returns to the quest they were most recently working on.

- **Prerequisites:** a signed-in account with a quest chat.
- **Steps:**
  - The user opens Home and follows Continue beside their most recent quest.
- **Outcome:** the atlas shows that quest's name and its next step from memory, if one is recorded. The name opens the quest; Continue opens its most recently active chat. Its accessible name includes the quest's name. No sample quest or invented next step is shown. Existing access rules include team quests and exclude other users' private work.
- **Variations:**
  - Before the first quest, the atlas offers Start a quest instead of an empty Continue card.
  - The new chat page at `/chats/new` retains Today above its form: up to three recent quests with their next steps and Continue links, plus up to three other recent chats. With no recent work, it shows the form alone.
- **Next:**
  - `use_case_continue_chat`: carry on in the quest's latest chat.
  - [`use_case_ask_whats_next`](memory.md#use_case_ask_whats_next): ask the construct for a next step.


## use_case_list_all_chats

The user looks for a chat on the Chats page, wherever it is: in a quest or in none.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). The user has chats in a quest ([`use_case_new_chat`](#use_case_new_chat)) and chats in no quest (`use_case_standalone_chat`).
- **Steps:**
  - The user opens Chats, from Home or from any signed-in page's header.
- **Outcome:** each chat with a saved activity session shows its current activity by name. The list holds every chat of theirs, those in their quests and those in none together, newest first. It holds no other user's chat. Each chat links to its conversation, as on its quest's page. A quest's own page still lists only that quest's chats.
- **Next:**
  - `use_case_filter_chats_by_project`: narrow the list to one quest's chats.
  - `use_case_chat_project_badge`: tell a quest's chats from the ones in no quest.
  - `use_case_send_message`: carry on in the chat they found.
  - `use_case_open_unread_check_in`: a check-in waits in the list.

## use_case_filter_chats_by_project

The user narrows the Chats page's list to one of their quests.

- **Prerequisites:** `use_case_list_all_chats`.
- **Steps:**
  - Above the list, the quest selector offers All and each of their quests by name. All is chosen.
  - The user chooses one of their quests. The list filters immediately in the browser, without a Show chats action, navigation or another chat-list request.
  - The user reloads the page, or opens a link to it that they saved or shared.
  - The user chooses All again.
- **Outcome:** with a quest chosen, the list holds only that quest's chats, and the selector shows that quest. The choice is in the page's address, so the reload and the link keep it for a viewer who owns that quest; sharing the address does not share access. A valid owned quest with no chats stays selected and shows the usual empty-chat message. With All, the list holds every chat of theirs again, using the complete list loaded with the page and preserving its newest-first order. The selector offers no other user's quest. An address that names another user's quest, a quest that doesn't exist, a malformed id, an empty or missing value, or repeated quest parameters (whether the values are equal or different) shows All and every chat of theirs, exactly as if it named no quest. A shared address selecting a foreign quest shows only the receiving user's All list and quest choices, without disclosing the sender's quest name or chats.
- **Next:**
  - `use_case_send_message`: carry on in one of the quest's chats.
  - [`use_case_open_project`](projects.md#use_case_open_project): go to the quest itself.

## use_case_chat_project_badge

The user tells a quest's chats from the chats in no quest on the Chats page.

- **Prerequisites:** `use_case_list_all_chats`.
- **Steps:**
  - The user looks over the list.
- **Outcome:** each chat in a quest carries a badge with its quest's name, beside the chat's own name and construct. A chat in no quest has no badge. A long quest name is cut short in its badge rather than widening the page, even on a phone, and the badge is readable in every theme.
- **Next:**
  - `use_case_filter_chats_by_project`: show only that quest's chats.

## use_case_send_message

The user writes to the construct and gets a reply.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She types a message and sends it.
  - Her message appears in the chat at once, under her name.
  - The chat shows that the construct is thinking, then the reply appears a little at a time, under the construct's name and in the construct's voice.
  - She cannot send another message until the reply has finished.
  - She types her next message while the reply is finishing: her text stays in the box, and she can send it once the reply has finished.
- **Outcome:** her message and the reply are in the chat, in that order, and both are still there after she reloads the page. An empty message, or one of only spaces, cannot be sent.
- **Variations:**
  - In a standalone chat, which is in no quest, the reply arrives the same way. The construct helps her talk an idea through and decide whether it should become a quest, and nothing is saved to a quest's memory.
- **Next:**
  - `use_case_send_message`: keep the conversation going.
  - `use_case_chat_named_automatically`: her first message gives the chat a name.
  - `use_case_ask_blender_question`: ask how to do something.
  - `use_case_read_formatted_reply`: the reply has steps, shortcuts or a script.
  - `use_case_leave_during_reply`: she has to go before the reply finishes.
  - `use_case_chat_with_several_people`: other people write in the chat too.
  - [`use_case_reply_fails`](when-things-go-wrong.md#use_case_reply_fails): the reply does not arrive.

## use_case_chat_with_several_people

The user reads a chat that other people write in too, and sees who wrote each message; the construct knows who is speaking.

- **Prerequisites:** `use_case_send_message`. Someone else has written in the chat too, such as another member of a team quest.
- **Steps:**
  - She opens the chat.
  - She sends a message, and the construct replies.
- **Outcome:** each message someone else wrote shows that person's name above it, where her own messages show "You": the name they asked the construct to call them ([`use_case_set_name`](accounts.md#use_case_set_name)), or their email address if they have given none. A screen reader reads the name before the message. Her own messages look as they always have, and a chat only she has written in looks exactly as it did before. A long name wraps rather than widening the page on a phone. The UI may show the email fallback to authorized viewers. The model receives author names or a neutral unnamed-author label, never email addresses, so it can distinguish who wrote each message; in a chat only she has written in, it is sent exactly what it was before. Messages written before authors were recorded count as the chat owner's.
- **Next:**
  - `use_case_send_message`: keep the conversation going.

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

- **Drafts:** unsent message text stays in this browser per viewer and chat across visits until sent or cleared; unsent image attachments do not survive leaving.

## use_case_leave_during_reply

The user leaves the chat while the construct is still replying.

- **Prerequisites:** `use_case_send_message`, with the reply still arriving.
- **Steps:**
  - She reloads the page, closes it or loses her connection before the reply has finished.
  - Later, she opens the chat again.
  - Her browser sends the message again after the reply was saved: the chat shows her message and its reply once, and the construct doesn't answer or charge for it again.
  - Her browser sends the message again while the reply is still arriving: the construct doesn't start a second reply or charge for it again, and the first reply is still saved. If the first reply failed, the message sent again is answered at once.
- **Outcome:** once the construct has had time to finish, the reopened chat shows her message and the whole reply, as if she had stayed. The reply is not cut off where she left. A chat reopened while the reply is claimed shows that the construct is still replying and refreshes until the saved reply appears or Retry reply becomes available. A saved reply arriving in a waiting viewer’s chat preserves their unsent draft and composer focus.
- **Next:**
  - `use_case_continue_chat`: carry on from the reply.

## use_case_ask_blender_question

The user asks how to do something in Blender and gets an answer backed by the manual.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks how to do something, such as beveling an edge.
  - The construct casts Blender manual lookup, unless it has cast it in this chat already. The chat shows "Cast Blender manual lookup" where the cast happened.
  - The construct looks the topic up in the Blender Reference Manual, sometimes more than once.
  - It answers in the construct's voice. Steps, menu paths and keyboard shortcuts are exact whichever construct is speaking.
  - Each fact taken from the manual comes with a link to the manual section it came from, shown apart from the construct's words.
  - The answer arrives once, in the same reply, even when the construct's last step after its searches held no words for her. She never has to ask again.
- **Outcome:** the construct casts Blender manual lookup before its first search in the chat, and the chat shows "Cast Blender manual lookup" inline, before the searches *(checked by the real-Claude smoke test)*. It gives no Blender steps without a search *(checked by the real-Claude smoke test)*. The reply gives steps with menu paths and keyboard shortcuts as the manual gives them. Under the construct's words is a list of manual links, each named after a section the construct looked up for this answer. The links are still there after she reopens the chat.
- **Next:**
  - `use_case_follow_citation`: read the manual section for more detail.
  - `use_case_send_message`: ask a follow-up.
  - `use_case_topic_not_in_manual`: ask about something the manual may not cover.
  - `use_case_ask_any_subject`: ask about something other than Blender.
  - [`use_case_construct_updates_memory`](memory.md#use_case_construct_updates_memory): report that she finished a milestone.

## use_case_see_working_note

The user tells the construct's working notes apart from its answer.

- **Prerequisites:** `use_case_ask_blender_question`, with a reply in which the construct notes what it needs before it looks something up.
- **Steps:**
  - The reply arrives. Before a search of the manual, the construct writes a short note to itself, such as which page it needs.
  - The note shows where it was written, before the search, smaller and quieter than the answer and labelled as a working note.
  - The answer, written after the construct's last search, reads as normal prose.
  - She reopens the chat.
- **Outcome:** the note shows as a quiet, labelled working note before the search, and the answer shows as normal prose after it. Both look the same after she reopens the chat. A note the construct writes before it casts a spell ([`use_case_construct_casts_spell`](spellbook.md#use_case_construct_casts_spell)) shows the same way. Her own messages are never shown as notes.
- **Next:**
  - `use_case_follow_citation`: read the manual section the answer came from.
  - `use_case_send_message`: ask a follow-up.

## use_case_follow_citation

The user opens the manual section the construct cited.

- **Prerequisites:** `use_case_ask_blender_question`.
- **Steps:**
  - She opens one of the links under the answer.
  - The official Blender manual opens at the section the construct used, for the current Blender release.
- **Outcome:** the link leads to the official Blender Reference Manual for the current release, at the page and heading the link is named after.
- **Next:**
  - `use_case_send_message`: come back and ask about something she read.

## use_case_topic_not_in_manual

The user asks about something the Blender manual does not cover.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks about something the manual has nothing on, such as a third-party add-on.
  - The construct looks the topic up in the manual and finds nothing about it.
  - It says plainly, in the construct's voice, that the manual does not cover this. If it found a related section, it points her to that, with a link.
- **Outcome:** the reply says the manual does not cover the topic, and it gives no Blender steps without a manual link. Any link under the reply leads to a real manual section that the construct looked up. When nothing related was found, no links appear.
- **Next:**
  - `use_case_follow_citation`: read the related section.
  - `use_case_ask_blender_question`: ask about something the manual does cover.

## use_case_ask_any_subject

The user asks the construct about something that has nothing to do with Blender.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks about something else, such as a recipe.
  - The construct answers in its voice, as it answers anything else, without looking anything up in the Blender manual.
- **Outcome:** the reply answers her in full, without steering her back to Blender or her quest, and shows no manual links. Her next Blender question is answered as usual, with its manual links.
- **Next:**
  - `use_case_ask_blender_question`: ask about Blender.

## use_case_reopen_chat

The user returns to an earlier chat.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project), in a quest with at least one chat.
- **Steps:**
  - She picks a chat.
  - The site shows the whole conversation so far, with the same construct.
- **Outcome:** the chat shows its name (or "New chat" before it has one) and the same construct's name, then every message, hers and the construct's, in the order they were sent, under the construct's name. Replies keep their formatting and their manual links. She can send a new message.
- **Next:**
  - `use_case_continue_chat`: pick up the conversation.
  - `use_case_construct_voice_consistent`: check the construct still sounds like itself.
  - `use_case_rename_chat`: the chat's name no longer fits.

## use_case_check_in

The quest's construct checks in on her, on the schedule she chose.

- **Prerequisites:** [`use_case_set_check_ins`](projects.md#use_case_set_check_ins), for a quest whose memory holds where she is ([`use_case_project_interview`](projects.md#use_case_project_interview)).
- **Steps:**
  - She doesn't work on the quest for as long as her schedule says: a day, a couple of days or a week.
  - The site's scheduler runs.
- **Outcome:** the quest has a new chat, with the construct of its newest chat. The chat already holds the construct's short message, in its voice: where she left off, from the quest's memory, and one small next step. The chat is unread. She gets an email from the construct with the same message, a link to the chat and a link to turn the quest's check-ins off. However often the scheduler runs within the interval, even twice at once, she gets one check-in. There is no check-in while check-ins are Off, while she has worked in the quest within the interval, or while the last check-in is still unread. Once she is out of gold, the check-in is skipped and nothing is saved or sent.
- **Next:**
  - `use_case_open_unread_check_in`: read it.
  - `use_case_turn_off_check_ins_from_email`: she doesn't want them.

## use_case_open_unread_check_in

The user opens a check-in she hasn't read.

- **Prerequisites:** `use_case_check_in`.
- **Steps:**
  - She opens Chats, or the quest's page, and finds the check-in, marked Unread.
  - She opens it, from the list or from the email's link.
- **Outcome:** the chat shows the construct's check-in message, and she can answer it as in any chat. Back on the Chats page, the chat is no longer marked Unread. Chats she started herself are never marked. The mark is hers alone: anyone else's mark on the chat doesn't show to her, and her opening the chat clears only her own mark. In a team quest, a check-in is unread for the owner and every member, so each finds it marked until they open it.
- **Next:**
  - `use_case_continue_chat`: take the small next step with the construct.

## use_case_turn_off_check_ins_from_email

The user turns off a quest's check-ins from a check-in email.

- **Prerequisites:** `use_case_check_in`.
- **Steps:**
  - She follows the email's link to turn check-ins off. She needn't be signed in.
  - The page names the quest and asks her to confirm, and she does.
- **Outcome:** the page says the quest's check-ins are off, and the quest's page shows Off. Opening the link alone changes nothing, so a mail program that opens links leaves check-ins on. A link that has been tampered with changes nothing and says it doesn't work.
- **Next:**
  - [`use_case_set_check_ins`](projects.md#use_case_set_check_ins): turn them on again later.

## use_case_continue_chat

The user carries on an earlier conversation, and the construct remembers it.

- **Prerequisites:** `use_case_reopen_chat`.
- **Steps:**
  - She sends a message that refers to something said earlier, such as "repeat that shortcut".
  - The construct answers with the earlier conversation in mind.
- **Outcome:** the reply uses what was said earlier in the chat. Asked to repeat a shortcut, it gives the same shortcut as before.
- **Next:**
  - `use_case_send_message`: keep going.

## use_case_switch_construct

The user wants a different voice for the same quest.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She starts a new chat in the same quest and picks a different construct.
  - The new construct already knows the quest's goals and progress from its memory: the chat opens with its synopsis of them.
- **Outcome:** the quest lists the new chat with the new construct, and the earlier chats with their own constructs. Each earlier chat still shows its original construct when opened. Asked what comes next, the new construct names the same milestone that the quest's memory gives.
- **Next:**
  - `use_case_ask_blender_question`: hear the new construct explain something.
  - `use_case_same_facts_any_construct`: check that the new voice teaches the same steps.

## use_case_construct_voice_consistent

The construct keeps its voice for the whole chat, across visits.

- **Prerequisites:** `use_case_send_message`, several times in one chat.
- **Steps:**
  - She chats for a while, leaves, and later reopens the chat and carries on.
  - Every reply comes from the same construct, in its own manner of speech, such as Vellum's calm talk of a quest as a map being drawn.
- **Outcome:** the chat's heading and every reply show the same construct's name, before and after she reopens it. Every reply speaks in that construct's manner, from the first to the last, and none speaks as another construct or in a plain assistant voice.
- **Next:**
  - `use_case_switch_construct`: try a different voice in a new chat.

## use_case_same_facts_any_construct

The user asks two constructs the same question and gets the same facts in different voices.

- **Prerequisites:** `use_case_switch_construct`, so the quest has chats with two different constructs.
- **Steps:**
  - She asks the same Blender question in both chats, such as how to bevel an edge.
  - Each construct answers in its own voice.
- **Outcome:** the two replies are worded differently, but they give the same steps, menu paths and keyboard shortcuts. The manual links under both replies lead to the same sections.
- **Next:**
  - `use_case_follow_citation`: check the steps in the manual.

## use_case_chat_named_automatically

The construct names the chat from the conversation, so she can find it again in the quest's list.

- **Prerequisites:** `use_case_new_chat`.
- **Steps:**
  - She sends her first message and the reply arrives (`use_case_send_message`).
  - The site names the chat from the conversation so far, in a few words.
  - She keeps chatting. The site names the chat again after her 3rd, 5th, 7th and 14th messages, as the conversation finds its topic, and at no other time.
- **Outcome:** after she reloads the chat, or opens it from the quest, its heading shows the name instead of "New chat", above the construct's name. The quest's list of chats links to the chat by that name, followed by its construct's name. After her 2nd message the name stays as it was; after her 3rd it can change. If naming fails, the chat keeps its old name (or "New chat"), and neither the reply nor the chat shows an error. A chat she has renamed by hand (`use_case_rename_chat`) is never renamed by the site.
- **Next:**
  - `use_case_rename_chat`: she prefers a name of her own.
  - `use_case_reopen_chat`: find the chat again by its name.

## use_case_rename_chat

The user gives a chat a name of her own.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - On the chat, she selects the pencil beside the title, named "Rename chat". The title is replaced by a focused inline name field, with Save name and Cancel icon buttons on the same row. The construct stays visible below, and the editor fits on a narrow phone without adding a form beneath the title. She types a name of up to 60 characters and saves it.
  - Another time, she edits the name and chooses Cancel. The existing name stays unchanged and the draft is discarded.
  - She can reach and operate the pencil, field and actions with the keyboard, including on a narrow phone screen.
  - The chat's heading shows her name at once.
  - She keeps chatting.
- **Outcome:** the chat's heading, Chats list and quest's list of chats show her name, after a reload too. The site never renames the chat again, whatever she sends. An empty name, or one of only spaces, is refused with a message asking for a name; her text stays in the field and the chat keeps its old name.
- **Next:**
  - `use_case_send_message`: carry on under the new name.
  - [`use_case_open_project`](projects.md#use_case_open_project): see the chat listed under her name.

## use_case_open_missing_page

The user follows a link to a quest or chat that does not exist.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens an old, mistyped or garbled link to a quest or chat, or an address the site does not have.
  - The site says the quest or chat cannot be found.
- **Outcome:** the page says it cannot be found, rather than showing an error, and links back to her quests. Her quests and chats are unchanged.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): find what she was looking for.

## use_case_breadcrumbs_in_long_chat

The user is deep in a long chat and wants to go back to the quest, without scrolling up.

- **Prerequisites:** `use_case_reopen_chat`, in a chat longer than the screen.
- **Steps:**
  - She scrolls down to the newest message, on a laptop or a phone.
  - She follows the link back to the quest, above the chat's name.
- **Outcome:** wherever she has scrolled, the link back to the quest, the chat's name and the box she writes in stay on screen, and nothing covers them. On a phone, in every theme, the pinned header is at most 112 CSS pixels tall while retaining 44-pixel navigation and rename targets, and the composer stays above the on-screen keyboard. Long quest, chat and construct names fit at 320 CSS pixels without horizontal page overflow. Standalone chats keep the link back to Chats. Jumping to a message shows it below the header, not under it.
- **Next:**
  - [`use_case_open_project`](projects.md#use_case_open_project): back on the quest.

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

For image requests, see [`use_case_generate_image`](images.md#use_case_generate_image) and [`use_case_image_gallery`](images.md#use_case_image_gallery).

## use_case_chat_images

The user asks their construct about images in a quest or standalone chat.

- **Prerequisites:** `use_case_send_message`.
- **Steps:**
  - The user selects images with Attach images, including the phone's image picker, or pastes images into the message box.
  - They preview the attachments and remove any they do not want to send.
  - They send up to four JPEG, PNG, GIF or WebP images, each at most 2 MiB, with an optional text prompt.
  - They reopen the chat and ask a follow-up question about an earlier image.
- **Outcome:** the images remain visible after reload. The construct receives their content on the first reply and follow-ups. Delivery and model references require access to the chat, including current team members. Replies and generated images charge the acting user, including a replying member; generated openings charge the starter and check-ins charge the quest owner. Deleting the chat, its quest or its account deletes its images.
- **Variations:** unsupported or oversized files show a removable validation error. Failed uploads preserve the text draft. Model failures leave the sent message visible with Retry reply. An out-of-gold refusal returns text and attachments to the composer. No paid model runs during tests.
