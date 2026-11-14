# Adventures

The conventions for these cases are in [the index](README.md#conventions).

## use_case_send_message

The user writes to the construct and gets a reply.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - She types a message and sends it.
  - Her message appears in the adventure at once, under her name.
  - The adventure shows that the construct is thinking, then the reply appears a little at a time, under the construct's name and in the construct's voice.
  - She cannot send another message until the reply has finished.
  - She types her next message while the reply is finishing: her text stays in the box, and she can send it once the reply has finished.
- **Outcome:** her message and the reply are in the adventure, in that order, and both are still there after she reloads the page. An empty message, or one of only spaces, cannot be sent.
- **Variations:**
- **Next:**
  - `use_case_send_message`: keep the conversation going.
  - `use_case_read_formatted_reply`: the reply has steps, shortcuts or a script.
  - `use_case_leave_during_reply`: she has to go before the reply finishes.
  - `use_case_chat_with_several_people`: other people write in the adventure too.
  - [`use_case_reply_fails`](when-things-go-wrong.md#use_case_reply_fails): the reply does not arrive.

## use_case_chat_with_several_people

The user reads an adventure that someone else also wrote in, while quests could be shared, and sees who wrote each message; the construct knows who is speaking.

- **Prerequisites:** `use_case_send_message`. Someone else wrote in the adventure too, as a member did while quests could be shared.
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


## use_case_see_working_note

The user sees a labelled working note before a spell cast and the answer after it.

- **Prerequisites:** an open quest conversation.
- **Steps:** The construct writes a note, casts a spell, then writes an answer.
- **Outcome:** The note is visually quieter than the answer and remains before the cast, both while streaming and when reopened.

## use_case_ask_any_subject

- **Goal:** Save a message about any subject in the quest conversation.
- **Prerequisites:** an open quest conversation.
- **Steps:** The user sends an ordinary message without a spell active.
- **Outcome:** The message is saved and the construct explains the supported local commands. It makes no external lookup or model request.

## use_case_continue_chat

The user carries on an earlier conversation, and the construct remembers it.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), for a quest whose conversation has earlier messages.
- **Steps:**
  - She sends a message that refers to something said earlier, such as "repeat that shortcut".
  - The construct answers with the earlier conversation in mind.
- **Outcome:** the reply uses what was said earlier in the conversation. Asked to repeat a shortcut, it gives the same shortcut as before. A long conversation's reply reads its newest messages, and the quest's Plan and Progress, which carry what matters from earlier.
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

- **Goal:** Receive consistent command guidance with every construct.
- **Steps:** The user types help with different constructs.
- **Outcome:** Each construct lists the same supported commands.

## use_case_open_missing_page

The user follows a link to a quest or adventure that does not exist.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens an old, mistyped or garbled link to a quest or adventure, or an address the site does not have.
  - The site says the quest or adventure cannot be found, or, for any other address, that the page cannot be found.
- **Outcome:** the page says it cannot be found, rather than showing an error, and links back to her quests. A missing quest or adventure is named as a quest or adventure; any other page that isn't found, such as an unknown address or Invitations for an ordinary user, is named only as a page. Her quests and adventures are unchanged.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): find what she was looking for.

## use_case_breadcrumbs_in_long_chat

The user is deep in a quest's long conversation and wants to go back to their quests, without scrolling up.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), for a quest whose conversation is longer than the screen.
- **Steps:**
  - The user scrolls down to the newest message, on a laptop or a phone.
  - The user follows the Quests link in the site header's trail band.
- **Outcome:** wherever the user has scrolled, the trail band, with the link back to their quests and the quest's name as the page's heading, and the box they write in stay on screen, and nothing covers them. The trail band stays within 112 CSS pixels on a phone and 140 on a wide screen, even when the quest's name takes two lines. The composer stays above the on-screen keyboard, and the page has no horizontal overflow at 320 CSS pixels. The site header contains one accessible breadcrumb trail, leading into the quest's name, the page's one heading. Client navigation and browser back/forward replace the trail with the destination's trail. Jumping to a message shows it below the trail band.
- **Next:**
  - [`use_case_open_quest`](quests.md#use_case_open_quest): back on the quest.

## use_case_follow_latest_messages

The user follows the latest messages without repeatedly scrolling down.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest) or `use_case_send_message`.
- **Steps:**
  - The user opens an existing adventure. It opens at the latest message.
  - The user sends a message. The latest message comes into view.
  - While at the bottom, the user follows new messages and streamed reply content automatically. Content shrinking (such as a shorter draft or a dismissed error) keeps following enabled when the browser clamps the position to the new bottom.
  - The user scrolls up with wheel, touch or document navigation keys to read earlier messages. Following pauses as the input begins, even when content or viewport updates arrive before its scroll event. Streamed text, delayed images and tool results, and reply completion preserve the reading position.
  - The user returns to the bottom or sends another message. Automatic scrolling resumes. Focusing the composer or opening, closing or resizing the phone keyboard preserves the earlier reading position and does not resume it.
- **Outcome:** the adventure follows the latest content only while the user wants to follow it. On phones, the composer stays above the keyboard and following adapts to the available space. Scroll movements are instant, including when reduced motion is requested.


## use_case_chat_images

The user views images already saved in a conversation.

- **Prerequisites:** `use_case_send_message` and a conversation with saved images.
- **Steps:**
  - The user opens the conversation and views an earlier image.
  - They write a text message in the composer.
- **Outcome:** saved images remain visible after reload. The composer accepts text only: it has no image picker, upload button or image-limit hint, and pasting or dropping images does not upload them. Delivery of saved images still requires access to the conversation. Deleting the conversation, its quest or its account deletes its images.


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
- **Variations:** only the adventure's owner can stop its reply; other users cannot. Repeating Stop does not repeat effects or charges. A reply that completed first stays completed. A failed or blocked request says cancellation could not be confirmed. Closing the tab or losing its connection alone leaves background completion running.

## use_case_reset_chat

- **Goal:** Start Dailies again with an empty conversation.
- **Prerequisites:** The user owns an active Dailies quest.
- **Steps:** Choose Reset Day above the workspace tabs, optionally select removal of Steps or Ideas, and confirm.
- **Outcome:** The conversation and active spell are cleared. By default Steps are kept and unchecked and Ideas stay. Selected lists are removed. Progress and the construct stay.
