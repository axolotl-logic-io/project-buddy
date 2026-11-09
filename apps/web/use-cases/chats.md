# Adventures

The conventions for these cases are in [the index](README.md#conventions).

## use_case_new_chat

The user starts an adventure in a quest with the construct she wants.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). At least one quest exists ([`use_case_new_project`](projects.md#use_case_new_project)).
- **Steps:**
  - She opens the new adventure page or the Adventures page's "New adventure" dialog, which show the same form, or the "New adventure" dialog on a quest's page.
  - She picks the quest, an activity, and a construct: Vellum, Lumen or one of her own. The open adventure and Vellum are already chosen unless she picks others. A quest's page shows its New adventure button with the form closed, even after a reload. Its dialog, named "New adventure", has no quest field: it offers only the activity and the construct, and starts the adventure in that quest, in whichever activity she chooses, Project Breakdown included. The dialog takes the keyboard's focus and keeps focused controls visible when its content scrolls, including forward and backward focus wrapping; Escape, or its close button, closes it without starting an adventure and puts focus back on the button.
  - The site starts the adventure and opens it. With a built-in construct and activity it starts at once, with the construct's prepared opening (`use_case_prepared_opening`). With a construct or activity of her own that she has edited, it takes a few seconds while the construct writes its opening, and shows that it is working meanwhile.
- **Outcome:** the adventure shows the quest's name and the construct's name. Before she writes anything, it holds one message from the construct, in the construct's voice: its prepared opening, which in the open adventure asks what she would like to work on. An opening the construct writes follows the activity's opening request: in the open adventure, a brief synopsis of what the quest's Journal holds, if it holds anything, then one question: what to work on, such as the next milestone. The adventure follows its chosen activity and saves useful information in the Journal, even when it is empty. Active quest and standalone adventures show no Activity dropdown or its label, progress or errors. Its heading reads "New adventure" until it has a name. It is first in the quest's list of adventures, with that construct. It keeps that construct for its whole life. The construct already knows the quest's Journal (see [`use_case_ask_whats_next`](memory.md#use_case_ask_whats_next)).
- **Variations:**
  - The Quest picker labels each existing quest Active, Completed or Abandoned. Finished quests remain available for new adventures.
  - On the main start form or the quest page’s start dialog, she chooses Project Breakdown in an existing quest. The construct helps plan from the Journal and saves useful information even when the Journal starts empty.
- **Next:**
  - `use_case_send_message`: say hello or ask something.
  - `use_case_ask_blender_question`: get straight to a Blender question.
  - `use_case_chat_named_automatically`: see the adventure get a name from her first message.
  - `use_case_rename_chat`: give the adventure a name of her own.
  - [`use_case_resume_interview`](projects.md#use_case_resume_interview): the quest's interview was left unfinished; she goes back to its adventure.
  - [`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude): Claude is unavailable.
  - `use_case_standalone_chat`: adventure without choosing a quest, in a standalone adventure.
  - [`use_case_start_chat_in_activity`](activities.md#use_case_start_chat_in_activity): start an adventure in another activity.
  - `use_case_talk_idea_through`: talk over an idea before it is a quest.

## use_case_standalone_chat

The user starts or reopens a standalone adventure, without choosing a quest.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). She needs no quest.
- **Steps:**
  - She signs in and lands on Home as always, not in an adventure.
  - She opens Adventures from Home, beside Quests, or from any signed-in page's header.
  - The Adventures page leads with her previous adventures, standalone and quest adventures together, newest first, and their quest filter (`use_case_list_all_chats`). The new-adventure form isn't on the page itself: a "New adventure" button opens it in a dialog named "New adventure". The dialog takes the keyboard's focus and keeps it; Escape, or its close button, closes it and puts focus back on the button. Merely opening the page, or opening and closing the dialog, creates nothing.
  - In the dialog, she leaves the quest at "No quest", and chooses an activity and a construct, built in or one of her own, and starts an adventure. The open adventure and Vellum are chosen initially.
  - The picker shows one construct at a time: its name, its place in the order, such as "1 of 7", and a short description. Bars on either side step to the previous and next construct, through the built-in constructs and then her own, and wrap round at either end. The keyboard alone can use both bars.
  - The site starts the adventure, at once with a built-in construct and activity (`use_case_prepared_opening`). The conversation opens at its own `/chats/[chatId]` URL, with the construct's opening, which asks what she would like to work on or talk about. Starting it makes no quest.
  - She sends a message, follows the Adventures link above the conversation to return to the list, and later reopens the conversation.
- **Outcome:** each adventure keeps its original construct and messages across visits. The page shows its name, or "New adventure" until it has one, and its construct's name, with a link back to Adventures rather than to a quest. Starting another adventure never replaces an earlier one. A standalone adventure started before it got an opening keeps its history and construct unchanged. Standalone adventures are private and appear in no quest's list.
- **Variations:**
  - Editing or deleting an owned construct later does not change an adventure's saved name or voice.
  - An invalid construct or another user's construct is refused, saving no adventure.
  - While Claude is unavailable, an adventure with a prepared opening still starts; one whose construct has to write its opening is not saved ([`use_case_start_without_claude`](when-things-go-wrong.md#use_case_start_without_claude)).
  - Out of gold, starting an adventure is refused with the out-of-gold message; the selected construct remains chosen and existing conversations stay readable.
  - While an adventure starts, its button is disabled and the form shows progress.
- **Next:**
  - `use_case_talk_idea_through`: talk an idea over.
  - `use_case_project_from_standalone_chat`: ask the construct to make the idea a quest.
  - `use_case_send_message`: keep the conversation going.
  - `use_case_rename_chat`: give the adventure a name of her own.

## use_case_prepared_opening

The user starts an adventure and finds the construct already speaking, with a brief opening prepared for that construct and activity, without waiting for Claude.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She starts a standalone adventure, an adventure in one of her quests, or a new quest, with a built-in construct and a built-in activity, or with copies of her own that she has customized or cloned and only renamed. Claude may be unavailable meanwhile.
  - She starts another adventure in the same construct and activity.
  - In the first adventure, she sends her first message and gets the reply, and later reopens the adventure.
- **Outcome:** each adventure starts at once, with one message from the construct before she writes anything: the brief opening prepared for that construct and activity, in the construct's voice, and never another construct's. In the open adventure it asks what she would like to work on or talk about; in brainstorming, which idea or plan to explore; in Project Breakdown, which goal to break down. Starting it asks nothing of Claude, so it starts while Claude is unavailable too. The second adventure is a separate adventure, with the same opening, and the first adventure is unchanged. The opening stays first in the adventure, once, before her message and its reply, and editing or deleting her own construct later doesn't change it. A construct or an activity of her own that she has edited has no prepared opening: its construct writes the adventure's opening, as in `use_case_new_chat`. Adventures started before prepared openings keep their history unchanged.
- **Next:**
  - `use_case_send_message`: answer the construct's question.
  - `use_case_new_chat`: start an adventure with a construct of her own that she has edited.

## use_case_talk_idea_through

The user talks an idea through in a standalone adventure before it becomes a quest, if it ever does.

- **Prerequisites:** `use_case_standalone_chat`.
- **Steps:**
  - She describes an idea, and asks a Blender question about it.
  - She sends another message once she is out of gold.
- **Outcome:** the replies arrive as in any adventure, and an answer from the Blender manual cites its sections under it ([`use_case_ask_blender_question`](#use_case_ask_blender_question)). Talking in a standalone adventure creates no quest unless she asks the construct for one, and changes no quest's Journal. Out of gold, her message is refused with the out-of-gold message, as in any adventure ([`use_case_out_of_gold`](accounts.md#use_case_out_of_gold)), and its text is back in the box.
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project): the idea becomes a quest.
  - `use_case_project_from_standalone_chat`: she asks the construct to make the idea a quest.

## use_case_project_from_standalone_chat

The user asks the construct in an adventure to turn the idea they talked through into a quest.

- **Prerequisites:** `use_case_standalone_chat`.
- **Steps:**
  - Ask the construct to turn the idea into a named quest.
  - Review and edit the proposed summary and optional motivation, then confirm creation.
  - Follow the link to its first adventure in Project Breakdown.
- **Outcome:** the confirmed summary and motivation become the first Journal version and inform the opening, using the source adventure's selected construct. The standalone source stays intact. Full transcripts are not copied and planned steps do not become completed milestones. The quest, opening, Journal and confirmation result save together. Repeating confirmation returns the same quest; concurrent confirmations create only one.
- **Variations:** invalid names fail before creation. An unavailable opening, insufficient gold or storage failure saves no quest, preserves the summary draft and allows an explicit retry. The construct's proposal alone creates nothing and spends no opening gold. A user who removes everything from the summary and motivation starts with an empty Journal and the ordinary opening.
- **Next:**
  - [`use_case_construct_updates_memory`](memory.md#use_case_construct_updates_memory): save goals and plans.

## use_case_new_chat_without_projects

The user starts an adventure before she has any quests.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), with no quests yet.
- **Steps:**
  - She chooses to start an adventure.
  - The quest is "No quest", the only choice. She picks a construct and starts the adventure.
- **Outcome:** the adventure starts as a standalone adventure, with the construct's opening, as in `use_case_standalone_chat`. Afterwards, the new adventure page shows the adventure under "Today" (`use_case_today_on_landing`).
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project): create a quest for later adventures.
  - `use_case_project_from_standalone_chat`: ask the construct to make the idea a quest.

## use_case_home_atlas

The user finds the site's places on an illustrated parchment atlas.

- **Prerequisites:** a signed-in account.
- **Steps:**
  - The user opens Home or follows the site's name after signing in.
  - They follow a labeled destination in the responsive control panel.
- **Outcome:** the heading is "Your projects await". "Don't know where to start? Try an Activity" links to Activities. Quests, Adventures, Constructs, Activities, Workshop and Marketplace are ordinary links to their existing pages, in that reading and keyboard order. They form a two-column grid on phones and a three-column grid on wide screens, with no Map/List switch or separate map overview. The original parchment artwork is a decorative background behind the heading and controls. Strongly tinted parchment panels blur the terrain behind the text, with readable surfaces when blur is unavailable. Descriptions are visible on wider screens and remain accessible on phones. The current quest or Start a quest follows all six places. Spellbook is reached through the menu or Workshop. Image gallery is reached through the menu. Settings sits beside Account below the quest. Home uses the same shared header as the other pages, above its content in the normal layout. The site's name links to Home; Quick Note and the menu remain available at every width. Quests and Adventures have no shortcuts beside Quick Note on any page; both remain available in the menu and Home's destinations. The header names the place the page belongs to where there is room. Viewing the page creates nothing and makes no model call.
- **Variations:**
  - Following a link away from Home restores the destination's header and content column without a refresh. Returning to Home restores the map layout, including with browser back and forward.
  - Before the first quest, Start a quest opens Project Breakdown with a new quest selected.
  - With no adventures or Active quests, Home briefly explains Project Buddy and the first action. Returning users keep Continue and Today unobscured.
  - The map's artwork is decorative; navigation works without the image, dragging, hovering or animation.
  - A signed-out visitor is sent to sign in before any recent work is read.

## use_case_today_on_landing

The user returns to the quest they were most recently working on.

- **Prerequisites:** a signed-in account with a quest adventure.
- **Steps:**
  - The user opens Home and follows Continue beside their most recent quest.
- **Outcome:** below the destinations, the atlas shows that quest's name and its next step from the Journal, if one is recorded. The name opens the quest; Continue opens its most recently active adventure. Its accessible name includes the quest's name. No sample quest or invented next step is shown. Existing access rules include team quests and exclude other users' private work.
- **Variations:**
  - Before the first quest, the atlas offers Start a quest instead of an empty Continue card.
  - The new adventure page at `/chats/new` retains Today above its form: up to three recent Active quests with their next steps and Continue links, plus up to three other recent adventures. With no recent work, it shows the form alone.
- **Next:**
  - `use_case_continue_chat`: carry on in the quest's latest adventure.
  - [`use_case_ask_whats_next`](memory.md#use_case_ask_whats_next): ask the construct for a next step.


## use_case_list_all_chats

The user looks for an adventure on the Adventures page, wherever it is: in a quest or in none.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). The user has adventures in a quest ([`use_case_new_chat`](#use_case_new_chat)) and adventures in no quest (`use_case_standalone_chat`).
- **Steps:**
  - The user opens Adventures, from Home or from any signed-in page's header.
- **Outcome:** each adventure with a saved activity session shows its current activity by name. The list holds every adventure of theirs, those in their quests and those in none together, newest first. It holds no other user's adventure. Each adventure links to its conversation, as on its quest's page. A quest's own page still lists only that quest's adventures.
- **Next:**
  - `use_case_filter_chats_by_project`: narrow the list to one quest's adventures.
  - `use_case_chat_project_badge`: tell a quest's adventures from the ones in no quest.
  - `use_case_send_message`: carry on in the adventure they found.
  - `use_case_open_unread_check_in`: a check-in waits in the list.

## use_case_filter_chats_by_project

The user narrows the Adventures page's list to one of their quests.

- **Prerequisites:** `use_case_list_all_chats`.
- **Steps:**
  - Above the list, the quest selector offers All and each of their quests by name. All is chosen.
  - The user chooses one of their quests. The list filters immediately in the browser, without a Show adventures action, navigation or another adventure-list request.
  - The user reloads the page, or opens a link to it that they saved or shared.
  - The user chooses All again.
- **Outcome:** with a quest chosen, the list holds only that quest's adventures, and the selector shows that quest. The choice is in the page's address, so the reload and the link keep it for a viewer who owns that quest; sharing the address does not share access. A valid owned quest with no adventures stays selected and shows the usual empty-adventure message. With All, the list holds every adventure of theirs again, using the complete list loaded with the page and preserving its newest-first order. The selector offers no other user's quest. An address that names another user's quest, a quest that doesn't exist, a malformed id, an empty or missing value, or repeated quest parameters (whether the values are equal or different) shows All and every adventure of theirs, exactly as if it named no quest. A shared address selecting a foreign quest shows only the receiving user's All list and quest choices, without disclosing the sender's quest name or adventures.
- **Next:**
  - `use_case_send_message`: carry on in one of the quest's adventures.
  - [`use_case_open_project`](projects.md#use_case_open_project): go to the quest itself.

## use_case_chat_project_badge

The user tells a quest's adventures from the adventures in no quest on the Adventures page.

- **Prerequisites:** `use_case_list_all_chats`.
- **Steps:**
  - The user looks over the list.
- **Outcome:** each adventure in a quest carries a badge with its quest's name, beside the adventure's own name and construct. An adventure in no quest has no badge. A long quest name is cut short in its badge rather than widening the page, even on a phone, and the badge is readable in every theme.
- **Next:**
  - `use_case_filter_chats_by_project`: show only that quest's adventures.

## use_case_send_message

The user writes to the construct and gets a reply.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She types a message and sends it.
  - Her message appears in the adventure at once, under her name.
  - The adventure shows that the construct is thinking, then the reply appears a little at a time, under the construct's name and in the construct's voice.
  - She cannot send another message until the reply has finished.
  - She types her next message while the reply is finishing: her text stays in the box, and she can send it once the reply has finished.
- **Outcome:** her message and the reply are in the adventure, in that order, and both are still there after she reloads the page. An empty message, or one of only spaces, cannot be sent.
- **Variations:**
  - In a standalone adventure, which is in no quest, the reply arrives the same way. The construct helps her talk an idea through and decide whether it should become a quest, and nothing is saved to a quest's Journal.
- **Next:**
  - `use_case_send_message`: keep the conversation going.
  - `use_case_chat_named_automatically`: her first message gives the adventure a name.
  - `use_case_ask_blender_question`: ask how to do something.
  - `use_case_read_formatted_reply`: the reply has steps, shortcuts or a script.
  - `use_case_leave_during_reply`: she has to go before the reply finishes.
  - `use_case_chat_with_several_people`: other people write in the adventure too.
  - [`use_case_reply_fails`](when-things-go-wrong.md#use_case_reply_fails): the reply does not arrive.

## use_case_chat_with_several_people

The user reads an adventure that other people write in too, and sees who wrote each message; the construct knows who is speaking.

- **Prerequisites:** `use_case_send_message`. Someone else has written in the adventure too, such as another member of a team quest.
- **Steps:**
  - She opens the adventure.
  - She sends a message, and the construct replies.
- **Outcome:** each message someone else wrote shows that person's name above it, where her own messages show "You": the name they asked the construct to call them ([`use_case_set_name`](accounts.md#use_case_set_name)), or their email address if they have given none. A screen reader reads the name before the message. Her own messages look as they always have, and an adventure only she has written in looks exactly as it did before. A long name wraps rather than widening the page on a phone. The UI may show the email fallback to authorized viewers. The model receives author names or a neutral unnamed-author label, never email addresses, so it can distinguish who wrote each message; in an adventure only she has written in, it is sent exactly what it was before. Messages written before authors were recorded count as the adventure owner's.
- **Next:**
  - `use_case_send_message`: keep the conversation going.

## use_case_read_formatted_reply

The user reads a reply laid out with headings, lists and code, the way a written guide would be.

- **Prerequisites:** `use_case_send_message`, asking for something whose answer has steps, shortcuts or a Python script.
- **Steps:**
  - The reply arrives.
  - Headings, bold and italic words, numbered and bulleted lists, tables and links appear formatted. Code is set apart in a fixed-width font, with Python colored by its syntax.
- **Outcome:** once the reply has finished, it shows no raw formatting marks, such as `**`, a leading `#` or backticks, and it looks the same after she reopens the adventure. Her own messages appear exactly as she typed them, marks included.
- **Next:**
  - `use_case_send_message`: ask about one of the steps.
  - `use_case_ask_blender_question`: ask for something she can follow step by step.

- **Drafts:** unsent message text stays in this browser per viewer and adventure across visits until sent or cleared; unsent image attachments do not survive leaving.

## use_case_leave_during_reply

The user leaves the adventure while the construct is still replying.

- **Prerequisites:** `use_case_send_message`, with the reply still arriving.
- **Steps:**
  - She reloads the page, closes it or loses her connection before the reply has finished.
  - Later, she opens the adventure again.
  - Her browser sends the message again after the reply was saved: the adventure shows her message and its reply once, and the construct doesn't answer or charge for it again.
  - Her browser sends the message again while the reply is still arriving: the construct doesn't start a second reply or charge for it again, and the first reply is still saved. If the first reply failed, the message sent again is answered at once.
- **Outcome:** once the construct has had time to finish, the reopened adventure shows her message and the whole reply, as if she had stayed. The reply is not cut off where she left. An adventure reopened while the reply is claimed shows that the construct is still replying and refreshes until the saved reply appears or Retry reply becomes available. A saved reply arriving in a waiting viewer’s adventure preserves their unsent draft and composer focus.
- **Next:**
  - `use_case_continue_chat`: carry on from the reply.

## use_case_ask_blender_question

The user asks how to do something in Blender and gets an answer backed by the manual.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - She asks how to do something, such as beveling an edge.
  - The construct casts Blender manual lookup, unless it has cast it in this adventure already. The adventure shows "Cast Blender manual lookup" where the cast happened.
  - The construct looks the topic up in the Blender Reference Manual, sometimes more than once.
  - It answers in the construct's voice. Steps, menu paths and keyboard shortcuts are exact whichever construct is speaking.
  - Each fact taken from the manual comes with a link to the manual section it came from, shown apart from the construct's words.
  - The answer arrives once, in the same reply, even when the construct's last step after its searches held no words for her. She never has to ask again.
- **Outcome:** the construct casts Blender manual lookup before its first search in the adventure, and the adventure shows "Cast Blender manual lookup" inline, before the searches *(checked by the real-Claude smoke test)*. It gives no Blender steps without a search *(checked by the real-Claude smoke test)*. The reply gives steps with menu paths and keyboard shortcuts as the manual gives them. Under the construct's words is a list of manual links, each named after a section the construct looked up for this answer. The links are still there after she reopens the adventure.
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
  - She reopens the adventure.
- **Outcome:** the note shows as a quiet, labelled working note before the search, and the answer shows as normal prose after it. Both look the same after she reopens the adventure. A note the construct writes before it casts a spell ([`use_case_construct_casts_spell`](spellbook.md#use_case_construct_casts_spell)) shows the same way. Her own messages are never shown as notes.
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
- **Outcome:** the reply answers her in full, without steering her back to Blender or her quest, and shows no manual links. Activity instructions to consult the Journal or advance a plan do not override an unrelated request: no irrelevant quest reminder, next step or return question is appended. Relevant quest information still follows the Journal rules. Her next Blender question is answered as usual, with its manual links.
- **Next:**
  - `use_case_ask_blender_question`: ask about Blender.

## use_case_reopen_chat

The user returns to an earlier adventure.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project), in a quest with at least one adventure.
- **Steps:**
  - She picks an adventure.
  - The site shows the whole conversation so far, with the same construct.
- **Outcome:** the adventure shows its name (or "New adventure" before it has one) and the same construct's name, then every message, hers and the construct's, in the order they were sent, under the construct's name. Replies keep their formatting and their manual links. She can send a new message.
- **Next:**
  - `use_case_continue_chat`: pick up the conversation.
  - `use_case_construct_voice_consistent`: check the construct still sounds like itself.
  - `use_case_rename_chat`: the adventure's name no longer fits.

## use_case_check_in

The quest's construct checks in on her, on the schedule she chose.

- **Prerequisites:** [`use_case_set_check_ins`](projects.md#use_case_set_check_ins), for a quest whose Journal holds where she is ([`use_case_construct_updates_memory`](memory.md#use_case_construct_updates_memory)).
- **Steps:**
  - She doesn't work on the quest for as long as her schedule says: a day, a couple of days or a week.
  - The site's scheduler runs.
- **Outcome:** the quest has a new adventure, with the construct of its newest adventure. The adventure already holds the construct's short message, in its voice: where she left off, from the quest's Journal, and one small next step at the task level. A check-in opening has no lookup tools and gives no unverified Blender commands, settings, shortcuts or technical steps; technical guidance belongs in a reply where the manual can be searched. The adventure is unread. She gets an email from the construct with the same message, a link to the adventure and a link to turn the quest's check-ins off. However often the scheduler runs within the interval, even twice at once, she gets one check-in. There is no check-in while check-ins are Off, while she has worked in the quest within the interval, or while the last check-in is still unread. Once she is out of gold, the check-in is skipped and nothing is saved or sent.
- **Next:**
  - `use_case_open_unread_check_in`: read it.
  - `use_case_turn_off_check_ins_from_email`: she doesn't want them.

## use_case_open_unread_check_in

The user opens a check-in she hasn't read.

- **Prerequisites:** `use_case_check_in`.
- **Steps:**
  - She opens Adventures, or the quest's page, and finds the check-in, marked Unread.
  - She opens it, from the list or from the email's link.
- **Outcome:** the adventure shows the construct's check-in message, and she can answer it as in any adventure. Back on the Adventures page, the adventure is no longer marked Unread. Adventures she started herself are never marked. The mark is hers alone: anyone else's mark on the adventure doesn't show to her, and her opening the adventure clears only her own mark. In a team quest, a check-in is unread for the owner and every member, so each finds it marked until they open it.
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
- **Outcome:** the reply uses what was said earlier in the adventure. Asked to repeat a shortcut, it gives the same shortcut as before.
- **Next:**
  - `use_case_send_message`: keep going.

## use_case_switch_construct

The user wants a different voice for the same quest.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She starts a new adventure in the same quest and picks a different construct.
  - The new construct already knows the quest's goals and progress from its Journal: the adventure uses its prepared opening when the construct and activity have one; otherwise the generated opening gives a synopsis of the Journal.
- **Outcome:** the quest lists the new adventure with the new construct, and the earlier adventures with their own constructs. Each earlier adventure still shows its original construct when opened. Asked what comes next, the new construct names the same milestone that the quest's Journal gives.
- **Next:**
  - `use_case_ask_blender_question`: hear the new construct explain something.
  - `use_case_same_facts_any_construct`: check that the new voice teaches the same steps.

## use_case_construct_voice_consistent

The construct keeps its voice for the whole adventure, across visits.

- **Prerequisites:** `use_case_send_message`, several times in one adventure.
- **Steps:**
  - She adventures for a while, leaves, and later reopens the adventure and carries on.
  - Every reply comes from the same construct, in its own manner of speech, such as Vellum's calm talk of a quest as a map being drawn.
- **Outcome:** the adventure's heading and every reply show the same construct's name, before and after she reopens it. Every reply speaks in that construct's manner, from the first to the last, and none speaks as another construct or in a plain assistant voice.
- **Next:**
  - `use_case_switch_construct`: try a different voice in a new adventure.

## use_case_same_facts_any_construct

The user asks two constructs the same question and gets the same facts in different voices.

- **Prerequisites:** `use_case_switch_construct`, so the quest has adventures with two different constructs.
- **Steps:**
  - She asks the same Blender question in both adventures, such as how to bevel an edge.
  - Each construct answers in its own voice.
- **Outcome:** the two replies are worded differently, but they give the same steps, menu paths and keyboard shortcuts. The manual links under both replies lead to the same sections.
- **Next:**
  - `use_case_follow_citation`: check the steps in the manual.

## use_case_chat_named_automatically

The construct names the adventure from the conversation, so she can find it again in the quest's list.

- **Prerequisites:** `use_case_new_chat`.
- **Steps:**
  - She sends her first message and the reply arrives (`use_case_send_message`).
  - The site names the adventure from the conversation so far, in a few words.
  - She keeps chatting. The site names the adventure again after her 3rd, 5th, 7th and 14th messages, as the conversation finds its topic, and at no other time.
- **Outcome:** after she reloads the adventure, or opens it from the quest, its heading shows the name instead of "New adventure", above the construct's name. The quest's list of adventures links to the adventure by that name, followed by its construct's name. After her 2nd message the name stays as it was; after her 3rd it can change. If naming fails, the adventure keeps its old name (or "New adventure"), and neither the reply nor the adventure shows an error. An adventure she has renamed by hand (`use_case_rename_chat`) is never renamed by the site.
- **Next:**
  - `use_case_rename_chat`: she prefers a name of her own.
  - `use_case_reopen_chat`: find the adventure again by its name.

## use_case_rename_chat

The user gives an adventure a name of her own.

- **Prerequisites:** `use_case_new_chat` or `use_case_reopen_chat`.
- **Steps:**
  - On the adventure, she selects the pencil beside the title, named "Rename adventure". The title is replaced by a focused inline name field, with Save name and Cancel icon buttons on the same row. The construct stays visible below, and the editor fits on a narrow phone without adding a form beneath the title. She types a name of up to 60 characters and saves it.
  - Another time, she edits the name and chooses Cancel. The existing name stays unchanged and the draft is discarded.
  - She can reach and operate the pencil, field and actions with the keyboard, including on a narrow phone screen.
  - The adventure's heading shows her name at once.
  - She keeps chatting.
- **Outcome:** the adventure's heading, Adventures list and quest's list of adventures show her name, after a reload too. The site never renames the adventure again, whatever she sends. An empty name, or one of only spaces, is refused with a message asking for a name; her text stays in the field and the adventure keeps its old name.
- **Next:**
  - `use_case_send_message`: carry on under the new name.
  - [`use_case_open_project`](projects.md#use_case_open_project): see the adventure listed under her name.

## use_case_open_missing_page

The user follows a link to a quest or adventure that does not exist.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens an old, mistyped or garbled link to a quest or adventure, or an address the site does not have.
  - The site says the quest or adventure cannot be found.
- **Outcome:** the page says it cannot be found, rather than showing an error, and links back to her quests. Her quests and adventures are unchanged.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): find what she was looking for.

## use_case_breadcrumbs_in_long_chat

The user is deep in a long adventure and wants to go back to the quest, without scrolling up.

- **Prerequisites:** `use_case_reopen_chat`, in an adventure longer than the screen.
- **Steps:**
  - She scrolls down to the newest message, on a laptop or a phone.
  - She follows the link back to the quest, above the adventure's name.
- **Outcome:** wherever she has scrolled, the link back to the quest, the adventure's name and the box she writes in stay on screen, and nothing covers them. On a phone, in every theme, the pinned header is at most 112 CSS pixels tall while retaining 44-pixel navigation and rename targets, and the composer stays above the on-screen keyboard. Long quest, adventure and construct names fit at 320 CSS pixels without horizontal page overflow. Standalone adventures keep the link back to Adventures. Jumping to a message shows it below the header, not under it.
- **Next:**
  - [`use_case_open_project`](projects.md#use_case_open_project): back on the quest.

## use_case_follow_latest_messages

The user follows the latest messages without repeatedly scrolling down.

- **Prerequisites:** `use_case_reopen_chat` or `use_case_send_message`.
- **Steps:**
  - The user opens an existing adventure. It opens at the latest message.
  - The user sends a message. The latest message comes into view.
  - While at the bottom, the user follows new messages and streamed reply content automatically.
  - The user scrolls up to read earlier messages. Incoming content preserves their reading position.
  - The user returns to the bottom or sends another message. Automatic scrolling resumes.
- **Outcome:** the adventure follows the latest content only while the user wants to follow it. On phones, the composer stays above the keyboard and following adapts to the available space. Scroll movements are instant, including when reduced motion is requested.

For image requests, see [`use_case_generate_image`](images.md#use_case_generate_image) and [`use_case_image_gallery`](images.md#use_case_image_gallery).

## use_case_chat_images

The user asks their construct about images in a quest or standalone adventure.

- **Prerequisites:** `use_case_send_message`.
- **Steps:**
  - The user selects images with Attach images, including the phone's image picker, or pastes images into the message box.
  - They preview the attachments and remove any they do not want to send.
  - They send up to four JPEG, PNG, GIF or WebP images, each at most 2 MiB, with an optional text prompt.
  - They reopen the adventure and ask a follow-up question about an earlier image.
- **Outcome:** the images remain visible after reload. The construct receives their content on the first reply and follow-ups. Delivery and model references require access to the adventure, including current team members. Replies and generated images charge the acting user, including a replying member; generated openings charge the starter and check-ins charge the quest owner. Deleting the adventure, its quest or its account deletes its images.
- **Variations:** unsupported or oversized files show a removable validation error. Failed uploads preserve the text draft. Model failures leave the sent message visible with Retry reply. An out-of-gold refusal returns text and attachments to the composer. No paid model runs during tests.

## use_case_construct_presence

The user recognizes the adventure's construct while reading and waiting for replies.

- **Prerequisites:** an adventure with a saved construct snapshot.
- **Steps:**
  - The user opens the adventure and reads its opening and later replies.
  - They send a message, then finish, stop or encounter an error during the reply.
  - They revisit the adventure on a narrow phone or with reduced motion enabled.
- **Outcome:** each construct message has a circular portrait beside its visible name; user messages have none. The first saved message has a larger opening illustration only if it is a construct message. Later turns and refreshes add no illustrations or generation calls. Artwork comes from the saved snapshot, never a name or id guess; missing artwork shows initials. Lumen gently glows and Vellum has a subtle working motion only during thinking or writing. Finished, stopped and failed replies settle. Reduced motion keeps artwork static, with readable thinking/writing text and busy state. The conversation fits at 320px without indenting reply text for portraits.

## use_case_stop_reply

The user stops a reply that is still running.

- **Prerequisites:** signed in, with current access to the adventure.
- **Steps:** choose Stop reply and wait for the server to confirm it.
- **Outcome:** the server requests provider cancellation and prevents further model and tool steps. It saves available partial text and completed tool results, releases the reply claim, and records the cancellation for reload. Effects of tools already started may remain or finish. Gold charged for use is not refunded.
- **Variations:** owners and current members can stop a shared reply; outsiders cannot. Repeating Stop does not repeat effects or charges. A reply that completed first stays completed. A failed or blocked request says cancellation could not be confirmed. Closing the tab or losing its connection alone leaves background completion running.
