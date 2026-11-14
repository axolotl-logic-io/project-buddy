# Conversations

The conventions for these cases are in [the index](README.md#conventions).

## use_case_send_message

The user writes to the construct and gets a reply.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - The user types a message and sends it.
  - Their message appears in the conversation at once, under their name.
  - The conversation shows that the construct is thinking, then the local reply appears under the construct's name.
  - The user cannot send another message until the reply has finished.
  - The user types their next message while the reply is finishing: their text stays in the box, and the user can send it once the reply has finished.
- **Outcome:** their message and the reply are in the conversation, in that order, and both are still there after the user reloads the page. An empty message, or one of only spaces, cannot be sent.
- **Next:**
  - `use_case_send_message`: keep the conversation going.
  - `use_case_read_formatted_reply`: the reply has steps, shortcuts or a script.
  - `use_case_leave_during_reply`: the user has to go before the reply finishes.
  - [`use_case_reply_fails`](when-things-go-wrong.md#use_case_reply_fails): the reply does not arrive.

## use_case_read_formatted_reply

The user reads a reply laid out with headings, lists and code, the way a written guide would be.

- **Prerequisites:** `use_case_send_message`, using `help`.
- **Steps:**
  - The user opens the saved reply.
  - The command list and inline command names appear formatted.
- **Outcome:** once the reply has finished, it shows no raw formatting marks, such as `**`, a leading `#` or backticks, and it looks the same after the user reopens the conversation. Their own messages appear exactly as the user typed them, marks included.
- **Next:**
  - `use_case_send_message`: ask about one of the steps.

- **Drafts:** unsent message text stays in this browser per viewer and conversation across visits until sent or cleared; unsent image attachments do not survive leaving.

## use_case_leave_during_reply

The user leaves the conversation while the construct is still replying.

- **Prerequisites:** `use_case_send_message`, with the reply still arriving.
- **Steps:**
  - The user reloads the page, closes it or loses their connection before the reply has finished.
  - Later, the user opens the conversation again.
  - Their browser sends the message again after the reply was saved: the conversation shows them message and its reply once, and the construct does not answer again.
  - Their browser sends the message again while the reply is still arriving: the construct doesn't start a second reply again, and the first reply is still saved. If the first reply failed, the message sent again is answered at once.
- **Outcome:** once the construct has had time to finish, the reopened conversation shows them message and the whole reply, as if the user had stayed. The reply is not cut off where the user left. A conversation reopened while the reply is claimed shows that the construct is still replying and refreshes until the saved reply appears or Retry reply becomes available. A saved reply arriving in a waiting viewer’s conversation preserves their unsent draft and composer focus.
- **Next:**
  - `use_case_continue_chat`: carry on from the reply.

## use_case_ask_any_subject

- **Goal:** Save a message about any subject in the quest conversation.
- **Prerequisites:** an open quest conversation.
- **Steps:** The user sends an ordinary message without a spell active.
- **Outcome:** The message is saved and the construct explains the supported local commands. It makes no external lookup or model request.

## use_case_continue_chat

The user continues an earlier conversation.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), with saved messages.
- **Steps:** reopen the quest and send `help`, `look` or another supported command.
- **Outcome:** earlier messages remain visible and the local engine handles the command. Ordinary prose is saved and receives command guidance; the engine does not recall facts or infer intent from earlier messages. The saved construct and active spell persist across visits.
- **Next:** `use_case_send_message`.

## use_case_construct_voice_consistent

The conversation keeps its chosen construct across visits.

- **Prerequisites:** `use_case_send_message`.
- **Steps:** leave, reopen the quest and send `help`.
- **Outcome:** the heading and replies retain the saved construct's name and artwork. Replies use shared local command guidance, rather than interpreting the construct's prose instructions or adopting a different voice. Editing the source construct does not replace the conversation's snapshot.
- **Next:** `use_case_same_facts_any_construct`.

## use_case_same_facts_any_construct

- **Goal:** Receive consistent command guidance with every construct.
- **Steps:** The user types help with different constructs.
- **Outcome:** Each construct lists the same supported commands.

## use_case_open_missing_page

The user follows a link to a quest or conversation that does not exist.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - The user opens an old, mistyped or garbled link to a quest or conversation, or an address the site does not have.
  - The site says the quest or conversation cannot be found, or, for any other address, that the page cannot be found.
- **Outcome:** the page says it cannot be found, rather than showing an error, and links back to their quests. A missing quest or conversation is named as a quest or conversation; any other page that isn't found, such as an unknown address, is named only as a page. Their quests and conversations are unchanged.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): find what the user was looking for.

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
  - The user opens an existing conversation. It opens at the latest message.
  - The user sends a message. The latest message comes into view.
  - While at the bottom, the user follows new messages and streamed reply content automatically. Content shrinking (such as a shorter draft or a dismissed error) keeps following enabled when the browser clamps the position to the new bottom.
  - The user scrolls up with wheel, touch or document navigation keys to read earlier messages. Following pauses as the input begins, even when content or viewport updates arrive before its scroll event. Streamed text, tool results and reply completion preserve the reading position.
  - The user returns to the bottom or sends another message. Automatic scrolling resumes. Focusing the composer or opening, closing or resizing the phone keyboard preserves the earlier reading position and does not resume it.
- **Outcome:** the conversation follows the latest content only while the user wants to follow it. On phones, the composer stays above the keyboard and following adapts to the available space. Scroll movements are instant, including when reduced motion is requested.

## use_case_construct_presence

The user recognizes the conversation's construct while reading and waiting for replies.

- **Prerequisites:** a conversation with a saved construct snapshot.
- **Steps:**
  - The user opens the conversation and reads its opening and later replies.
  - They send a message, then finish, stop or encounter an error during the reply.
  - They revisit the conversation on a narrow phone or with reduced motion enabled.
- **Outcome:** each construct message has a circular portrait beside its visible name; user messages have none. The first saved message has a larger opening illustration only if it is a construct message. Later turns and refreshes add no illustrations or generation calls. Artwork comes from the saved snapshot, never a name or id guess; missing artwork shows initials. Lumen gently glows and Vellum has a subtle working motion only during thinking or writing. Finished, stopped and failed replies settle. Reduced motion keeps artwork static, with readable thinking/writing text and busy state. The conversation fits at 320px without indenting reply text for portraits.

## use_case_stop_reply

The user stops a reply that is still running.

- **Prerequisites:** signed in, with current access to the conversation.
- **Steps:** while the reply runs, Stop reply takes Send's place beside the message box, so it stays in view while the user follows the reply. They choose Stop reply and wait for the server to confirm it.
- **Outcome:** what came of Stop shows above the message box. When the reply ends, Send comes back, and focus that was on Stop moves to the message box. The server requests cancellation and prevents further reply and tool steps. It saves available partial text and completed tool results, releases the reply claim, and records the cancellation for reload. Effects of tools already started may remain or finish. Local replies have no battery charge.
- **Variations:** only the conversation's owner can stop its reply; other users cannot. Repeating Stop does not repeat effects. A reply that completed first stays completed. A failed or blocked request says cancellation could not be confirmed. Closing the tab or losing its connection alone leaves background completion running.

## use_case_reset_chat

- **Goal:** Start Dailies again with an empty conversation.
- **Prerequisites:** The user owns an active Dailies quest.
- **Steps:** Choose Reset Day above the workspace tabs, optionally select removal of Steps or Ideas, and confirm.
- **Outcome:** The conversation and active spell are cleared. By default Steps are kept and unchecked and Ideas stay. Selected lists are removed. Progress and the construct stay.
