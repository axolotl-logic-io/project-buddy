# When things go wrong

The conventions for these cases are in [the index](README.md#conventions).

## use_case_reply_fails

The rite's reply to a message doesn't arrive.

- **Prerequisites:** [`use_case_send_message`](performances.md#use_case_send_message).
- **Steps:**
  - The user sends a message.
  - Instead of a reply, the performance shows a short, plain message that says what kind of problem it is. Storage and unexpected failures have fixed messages:
    - the site cannot reach its storage;
    - the site's storage refused a request;
    - something unexpected went wrong.
- **Outcome:** a message and its reply are saved together or not at all, so a failed message leaves nothing in the performance or the list. The performance shows the fixed message for that kind of problem and still shows the message's text, with Retry reply, which sends the same message again: if it was saved after all, nothing is added twice. If the performance has ended, the message asks the user to start one. Retry reply leaves the keyboard's focus in the composer, so the user can carry on writing. The site's log records the problem, and the performance shows none of those details.
- **Next:**
  - [`use_case_send_message`](performances.md#use_case_send_message): try again once the problem is fixed.

## use_case_storage_unavailable

The site cannot load or save the user's quests, lists and performances.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - The user opens their quests, a list or a performance, or tries to save something.
  - The site shows a short, plain message saying it cannot reach its storage right now.
- **Outcome:** the page shows that message in place of its content. Anything the user tried to save is not there once the storage is back, not even in part. The site's log records the problem.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): try again later.

## use_case_send_while_construct_replies

The user sends another message while the reply to their last one is still coming.

- **Prerequisites:** [`use_case_send_message`](performances.md#use_case_send_message), with the reply still arriving.
- **Steps:**
  - While the reply is still coming, another tab that has not yet learned of it sends a new message in the same performance.
  - The rite replies to the new message.
  - Later, the first reply finishes.
- **Outcome:** once the user reloads the performance, each reply comes right after the message it answers: their first message, its reply, their second message, then its reply. The list holds one list item for each message. No reply is lost or shown twice.
- **Next:**
  - [`use_case_continue_performance`](performances.md#use_case_continue_performance): carry on from the latest reply.
