# Performances

The conventions for these cases are in [the index](README.md#conventions). A performance is a rite performed on one list of a quest. Each message adds one list item to that list, and the rite replies.

## use_case_perform_rite

The user starts a performance on one of the quest's lists, then stops it.

- **Prerequisites:** a quest open to the user, as its owner or a member. A start or Stop applies to everyone in the quest.
- **Steps:**
  - On the quest's Overview, the user chooses the candle, Perform a rite, in a list's section.
  - In the dialog that opens, they choose a built-in rite or one of their own, each shown with its first message for that list, and choose Perform.
  - Later, they choose Stop beside the performance.
- **Outcome:** the dialog names the list and has the first rite chosen. Cancel, Close, Escape or a click outside closes it without performing. A refused start keeps the dialog open and says why. Once the rite is performed, the dialog closes, focus goes to the quest's name, and the performance shows on Overview above the list sections, which have no candle while it runs, with the rite's first message, such as "Let’s brainstorm for Ideas. What comes to mind first?" It stays active across visits, for everyone in the quest, until Stop ends it. Starting saves the rite's name, first message and replies as a rite snapshot, so editing or forgetting the rite leaves the performance unchanged. Starting another performance ends the active one, because a quest has at most one. Stop closes the performance and the composer with a closing message the site writes from the rite's name and the list's words, such as "Brainstorm ends. 4 ideas added." The list items it added stay in the list.
- **Next:**
  - `use_case_send_message`: send a message.
  - [`use_case_customize_rite`](grimoire.md#use_case_customize_rite): write a rite of their own.

## use_case_send_message

The user sends a message and gets the rite's reply.

- **Prerequisites:** `use_case_perform_rite`, with the performance active.
- **Steps:**
  - The user types a message and sends it.
  - Their message appears in the performance at once, under their name.
  - The rite's reply appears at once, with the construct's name and portrait, while the performance shows that the message is saving.
  - The user cannot send another message until the message is saved. Their next text stays in the box until they can send it.
- **Outcome:** the list has one new list item holding the message's text, with the list's type. The message and its reply are in the performance, in that order, and both are still there after the user reloads the page. The reply is one of the rite's replies, chosen in the rite's reply order ([`use_case_reply_order`](grimoire.md#use_case_reply_order)), and can prompt the user with a brainstorming or planning cue. If another member's message came first and changed which replies are due, the saved reply replaces the one shown. When a rite that concludes has given all its replies, the next message gets its final reply and ends the performance ([`use_case_conclude_rite`](grimoire.md#use_case_conclude_rite)). An empty message, or one of only spaces, cannot be sent.
- **Variations:**
  - A message the list can't hold, such as one over its length limit, adds nothing. Instead of a reply, the site answers with a note that names the list's items, such as "Use 1 to 200 characters for each item."
- **Next:**
  - `use_case_send_message`: keep sending messages.
  - `use_case_read_formatted_reply`: the reply has headings, lists or code.
  - `use_case_leave_during_reply`: the user loses their connection while sending.
  - [`use_case_reply_fails`](when-things-go-wrong.md#use_case_reply_fails): the reply does not arrive.

## use_case_read_formatted_reply

The user reads a reply laid out with headings, lists and code.

- **Prerequisites:** `use_case_send_message`, with a rite whose replies use formatting.
- **Steps:**
  - The user opens the saved reply.
  - At desktop and 320 px, the transcript keeps people's names before their messages, construct portraits above replies, readable prose and a composer with usable action targets.
- **Outcome:** the reply shows no raw formatting marks, such as `**`, a leading `#` or backticks, and it looks the same after the user reopens the performance. Their own messages appear exactly as the user typed them, marks included.
- **Drafts:** unsent message text stays in this browser per viewer and performance across visits until sent or cleared.

## use_case_leave_during_reply

The user loses their connection while a message is being sent.

- **Prerequisites:** `use_case_send_message`.
- **Steps:**
  - The user reloads the page, closes it or loses their connection before the reply appears.
  - Their browser sends the message again, or the user opens the performance again.
- **Outcome:** the performance shows the message and its reply once, and the list holds one list item for it. Sending the same message again adds no second list item and no second reply. A saved reply arriving in a waiting viewer's performance preserves their unsent draft and composer focus.
- **Next:**
  - `use_case_continue_performance`: carry on from the reply.

## use_case_performance_required

- **Intent:** Send messages only during an active performance.
- **Steps:** Open a quest with no active performance. Submit a message directly.
- **Outcome:** The page shows its Overview without a composer. The request is refused before anything is saved.

## use_case_continue_performance

The user returns to the active performance.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), with a performance active.
- **Steps:** reopen the quest and send another message.
- **Outcome:** the active performance keeps its transcript. The new message adds a list item to the performance's list, and the rite replies.
- **Next:** `use_case_send_message`.

## use_case_construct_voice_consistent

The performance keeps the quest's construct across visits.

- **Prerequisites:** `use_case_send_message`.
- **Steps:** leave, reopen the quest and send another message.
- **Outcome:** the heading and replies keep the quest's construct's name and artwork, the construct it started with. The reply text comes from the rite, whatever the construct.

## use_case_open_missing_page

The user follows a link to a quest that does not exist.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - The user opens an old, mistyped or garbled link to a quest, or an address the site does not have.
  - The site says the quest cannot be found, or, for any other address, that the page cannot be found.
- **Outcome:** the page says it cannot be found, rather than showing an error, and links back to their quests. A missing quest is named as a quest; any other page that isn't found, such as an unknown address, is named only as a page. Their quests are unchanged.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): find what the user was looking for.

## use_case_breadcrumbs_in_long_performance

The user is deep in a long performance and wants to go back to their quests, without scrolling up.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), for a quest whose active performance is longer than the screen.
- **Steps:**
  - The user scrolls down to the newest message, on a laptop or a phone.
  - The user follows the Quests link in the page header's trail band.
- **Outcome:** wherever the user has scrolled, the trail band, with the link back to their quests and the quest's name as the page's heading, and the box they write in stay on screen, and nothing covers them. The trail band stays within 112 CSS pixels on a phone and 140 on a wide screen, even when the quest's name takes two lines. The composer stays above the on-screen keyboard, and the page has no horizontal overflow at 320 CSS pixels. The page header contains one accessible breadcrumb trail, leading into the quest's name, the page's one heading. Client navigation and browser back/forward replace the trail with the destination's trail. Jumping to a message shows it below the trail band.
- **Next:**
  - [`use_case_open_quest`](quests.md#use_case_open_quest): back on the quest.

## use_case_follow_latest_messages

The user follows the latest messages and replies without repeatedly scrolling down.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest) or `use_case_send_message`.
- **Steps:**
  - The user opens the active performance. It opens at the latest reply.
  - The user sends a message. The latest reply comes into view.
  - The user scrolls up with wheel, touch or document navigation keys to read earlier messages. Following pauses as the input begins, even when content or viewport updates arrive before its scroll event.
  - The user returns to the bottom or sends another message. Automatic scrolling resumes. Focusing the composer or opening, closing or resizing the phone keyboard preserves the earlier reading position and does not resume it.
- **Outcome:** the performance follows the latest content only while the user wants to follow it. On phones, the composer stays above the keyboard and following adapts to the available list. Scroll movements are instant, including when reduced motion is requested.

## use_case_construct_presence

The user recognizes the quest's construct while reading replies.

- **Prerequisites:** a performance in a quest with a built-in construct.
- **Steps:**
  - The user opens the performance and reads its replies.
  - They send a message and wait for the reply, or encounter an error.
  - They revisit the performance on a narrow phone or with reduced motion enabled.
- **Outcome:** each reply has a circular portrait beside the construct's visible name; messages have none. The first message of a performance has a larger opening illustration. Later turns and refreshes add no illustrations. Artwork comes from the quest's built-in construct. Lumen gently glows and Vellum has a subtle working motion only while a reply is coming. Finished and failed replies settle. Reduced motion keeps artwork static, with readable busy text and state. The performance fits at 320px without indenting reply text for portraits.
