# Adventures

The conventions for these cases are in [the index](README.md#conventions).

## use_case_standalone_chat

The user talks with a construct in Chat, her one private conversation for talking without a goal.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). She needs no quest.
- **Steps:**
  - She opens Chat from any signed-in page's header.
  - She sends a message, leaves, and later opens Chat again.
- **Outcome:** Chat opens straight on its conversation and composer, with no list, chooser, name or New adventure button. Each visit opens the same conversation, with its messages in order. Opening Chat creates the conversation the first time without a model call, so it spends no batteries; the construct speaks first only after she does. Chat uses the default construct and the Chat activity. It is hers alone: no other user, and no member of any of her quests, can open it. It writes no quest's Journal, Plan or milestones.
- **Variations:**
  - An old adventure address of hers that has no quest opens Chat; one of a quest she can open opens that quest; any other, including another user's, a removed one or a malformed one, shows the not-found page ([`use_case_open_missing_page`](#use_case_open_missing_page)).
  - The old new-adventure address opens Chat and makes nothing.
- **Next:**
  - `use_case_talk_idea_through`: talk an idea over.
  - `use_case_project_from_standalone_chat`: make the idea a quest.
  - `use_case_send_message`: keep the conversation going.

## use_case_prepared_opening

The user starts an adventure and finds the construct already speaking, with a brief opening prepared for that construct and activity, without waiting for Claude.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She starts a standalone adventure, an adventure in one of her quests, or a new quest, with a built-in construct and a built-in activity, or with copies of her own that she has customized or cloned and only renamed. Claude may be unavailable meanwhile.
  - She starts another adventure in the same construct and activity.
  - In the first adventure, she sends her first message and gets the reply, and later reopens the adventure.
- **Outcome:** each adventure starts at once, with one message from the construct before she writes anything: the brief opening prepared for that construct and activity, in the construct's voice, and never another construct's. In Chat it asks what she would like to work on or talk about; in brainstorming, which idea or plan to explore; in Break Down a Project, which goal to break down. Starting it asks nothing of Claude, so it starts while Claude is unavailable too. The second adventure is a separate adventure, with the same opening, and the first adventure is unchanged. The opening stays first in the adventure, once, before her message and its reply, and editing or deleting her own construct later doesn't change it. A construct or an activity of her own that she has edited has no prepared opening: its construct writes the opening. Adventures started before prepared openings keep their history unchanged.
- **Next:**
  - `use_case_send_message`: answer the construct's question.

## use_case_talk_idea_through

The user talks an idea through in Chat before it becomes a quest, if it ever does.

- **Prerequisites:** `use_case_standalone_chat`.
- **Steps:**
  - She describes an idea, and asks a Blender question about it.
  - She sends another message once she is out of batteries.
- **Outcome:** the replies arrive as in a quest, and an answer from the Blender manual cites its sections under it ([`use_case_ask_blender_question`](#use_case_ask_blender_question)). The construct has no Journal, Plan or milestone tools in Chat, so talking there changes no quest. Out of batteries, her message is refused with the out-of-batteries message ([`use_case_out_of_gold`](accounts.md#use_case_out_of_gold)), and its text is back in the box.
- **Next:**
  - `use_case_project_from_standalone_chat`: the idea becomes a quest.

## use_case_project_from_standalone_chat

The user turns what she talked through in Chat into a quest.

- **Prerequisites:** `use_case_standalone_chat`.
- **Steps:**
  - In Chat, she chooses Turn Chat into a quest.
  - A dialog opens the quest start on Do a thing, with a summary of her recent Chat messages as the new quest's Journal. She edits the name and Journal.
  - She closes the dialog without starting. Another time, she starts the quest.
  - Instead of the button, she can ask the construct to make the idea a quest; it offers a name and summary, and its offer's Turn Chat into a quest opens the same dialog with them filled in, to edit and confirm.
- **Outcome:** closing the dialog creates nothing and spends nothing. Starting creates one quest whose Journal is exactly what she confirmed, and opens the quest's conversation. Chat keeps all its messages and stays private: none are copied into the quest, so people she later invites to the quest see only the confirmed Journal. A construct's offer alone creates nothing and spends nothing. In a quest's conversation the construct can't offer another quest. Planned steps never become completed milestones.
- **Variations:** an invalid name fails before anything is created. An unavailable opening, insufficient batteries or a storage failure saves no quest and keeps her edits for a retry.
- **Next:**
  - [`use_case_construct_updates_memory`](memory.md#use_case_construct_updates_memory): save goals and plans.

## use_case_send_message

The user writes to the construct and gets a reply.

- **Prerequisites:** `use_case_standalone_chat` or [`use_case_open_project`](projects.md#use_case_open_project).
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

- **Prerequisites:** `use_case_standalone_chat` or [`use_case_open_project`](projects.md#use_case_open_project).
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

- **Prerequisites:** `use_case_standalone_chat` or [`use_case_open_project`](projects.md#use_case_open_project).
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

- **Prerequisites:** `use_case_standalone_chat` or [`use_case_open_project`](projects.md#use_case_open_project).
- **Steps:**
  - She asks about something else, such as a recipe.
  - The construct answers in its voice, as it answers anything else, without looking anything up in the Blender manual.
- **Outcome:** the reply answers her in full, without steering her back to Blender or her quest, and shows no manual links. Activity instructions to consult the Journal or advance a plan do not override an unrelated request: no irrelevant quest reminder, next step or return question is appended. Relevant quest information still follows the Journal rules. Her next Blender question is answered as usual, with its manual links.
- **Next:**
  - `use_case_ask_blender_question`: ask about Blender.

## use_case_continue_chat

The user carries on an earlier conversation, and the construct remembers it.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project), for a quest whose conversation has earlier messages.
- **Steps:**
  - She sends a message that refers to something said earlier, such as "repeat that shortcut".
  - The construct answers with the earlier conversation in mind.
- **Outcome:** the reply uses what was said earlier in the conversation. Asked to repeat a shortcut, it gives the same shortcut as before. A long conversation's reply reads its newest messages, and the quest's Journal, Plan and Progress, which carry what matters from earlier.
- **Next:**
  - `use_case_send_message`: keep going.

## use_case_construct_voice_consistent

The construct keeps its voice for the whole adventure, across visits.

- **Prerequisites:** `use_case_send_message`, several times in one adventure.
- **Steps:**
  - She adventures for a while, leaves, and later reopens the adventure and carries on.
  - Every reply comes from the same construct, in its own manner of speech, such as Vellum's calm talk of a quest as a map being drawn.
- **Outcome:** the adventure's heading and every reply show the same construct's name, before and after she reopens it. Every reply speaks in that construct's manner, from the first to the last, and none speaks as another construct or in a plain assistant voice.
- **Next:**
  - `use_case_same_facts_any_construct`: hear another construct teach the same steps.

## use_case_same_facts_any_construct

The user asks two constructs the same question and gets the same facts in different voices.

- **Prerequisites:** [`use_case_new_project_with_construct`](projects.md#use_case_new_project_with_construct), twice, so two quests have different constructs.
- **Steps:**
  - She asks the same Blender question in both quests, such as how to bevel an edge.
  - Each construct answers in its own voice.
- **Outcome:** the two replies are worded differently, but they give the same steps, menu paths and keyboard shortcuts. The manual links under both replies lead to the same sections.
- **Next:**
  - `use_case_follow_citation`: check the steps in the manual.

## use_case_open_missing_page

The user follows a link to a quest or adventure that does not exist.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens an old, mistyped or garbled link to a quest or adventure, or an address the site does not have.
  - The site says the quest or adventure cannot be found, or, for any other address, that the page cannot be found.
- **Outcome:** the page says it cannot be found, rather than showing an error, and links back to her quests. A missing quest, Journal or adventure is named as a quest or adventure; any other page that isn't found, such as an unknown address or Invitations for an ordinary user, is named only as a page. Her quests and adventures are unchanged.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): find what she was looking for.

## use_case_breadcrumbs_in_long_chat

The user is deep in a quest's long conversation and wants to go back to their quests, without scrolling up.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project), for a quest whose conversation is longer than the screen.
- **Steps:**
  - The user scrolls down to the newest message, on a laptop or a phone.
  - The user follows the Quests link in the shared site header.
- **Outcome:** wherever the user has scrolled, the link back to their quests, the conversation's pinned header with its construct, and the box they write in stay on screen, and nothing covers them. The composer stays above the on-screen keyboard, and the page has no horizontal overflow at 320 CSS pixels. The shared site header contains one accessible breadcrumb trail, ending in the quest. The trail stays on screen even when the pinned conversation header extra is off. Client navigation and browser back/forward replace the trail with the destination's trail. Jumping to a message shows it below both headers.
- **Next:**
  - [`use_case_open_project`](projects.md#use_case_open_project): back on the quest.

## use_case_follow_latest_messages

The user follows the latest messages without repeatedly scrolling down.

- **Prerequisites:** [`use_case_open_project`](projects.md#use_case_open_project) or `use_case_send_message`.
- **Steps:**
  - The user opens an existing adventure. It opens at the latest message.
  - The user sends a message. The latest message comes into view.
  - While at the bottom, the user follows new messages and streamed reply content automatically. Content shrinking (such as a shorter draft or a dismissed error) keeps following enabled when the browser clamps the position to the new bottom.
  - The user scrolls up with wheel, touch or document navigation keys to read earlier messages. Following pauses as the input begins, even when content or viewport updates arrive before its scroll event. Streamed text, delayed images and tool results, and reply completion preserve the reading position.
  - The user returns to the bottom or sends another message. Automatic scrolling resumes. Focusing the composer or opening, closing or resizing the phone keyboard preserves the earlier reading position and does not resume it.
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
- **Outcome:** the images remain visible after reload. The construct receives their content on the first reply and follow-ups. Delivery and model references require access to the adventure, including current team members. Replies and generated images charge the acting user, including a replying member and generated openings charge the starter. Deleting the adventure, its quest or its account deletes its images.
- **Variations:** unsupported or oversized files show a removable validation error. Failed uploads preserve the text draft. Model failures leave the sent message visible with Retry reply. An out-of-batteries refusal returns text and attachments to the composer. No paid model runs during tests.

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
- **Steps:** while the reply runs, Stop reply takes Send's place beside the message box, so it stays in view while the user follows the reply. They choose Stop reply and wait for the server to confirm it.
- **Outcome:** what came of Stop shows above the message box. When the reply ends, Send comes back, and focus that was on Stop moves to the message box. The server requests provider cancellation and prevents further model and tool steps. It saves available partial text and completed tool results, releases the reply claim, and records the cancellation for reload. Effects of tools already started may remain or finish. Batteries charged for use are not refunded.
- **Variations:** owners and current members can stop a shared reply; outsiders cannot. Repeating Stop does not repeat effects or charges. A reply that completed first stays completed. A failed or blocked request says cancellation could not be confirmed. Closing the tab or losing its connection alone leaves background completion running.
