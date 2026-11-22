# When things go wrong

The conventions for these cases are in [the index](README.md#conventions).

## use_case_reply_fails

The rite's reply to a conjuration doesn't arrive.

- **Prerequisites:** [`use_case_send_message`](performances.md#use_case_send_message).
- **Steps:**
  - The user makes a conjuration.
  - Instead of a reply, the performance shows a short, plain message that says what kind of problem it is. Storage and unexpected failures have fixed messages:
    - the site cannot reach its storage;
    - the site's storage refused a request;
    - something unexpected went wrong.
- **Outcome:** the performance shows the fixed message for that kind of problem and no reply, with Retry reply when retry can help. A conjuration too long to read asks them to shorten it, and a missing performance offers no reply retry. A saved conjuration is still in the performance after the user reloads the page or reopens it, and the performance then says the rite didn't reply to it, with Retry reply, which asks for the reply to that same conjuration without adding its murmling again. Either Retry reply leaves the keyboard's focus in the composer, so the user can carry on writing. While a reply to the last conjuration is still being made, such as from another tab, the performance offers no retry. The site's log records the problem, and the performance shows none of those details.
- **Next:**
  - [`use_case_send_message`](performances.md#use_case_send_message): try again once the problem is fixed.

## use_case_storage_unavailable

The site cannot load or save the user's quests, spaces and performances.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - The user opens their quests, a space or a performance, or tries to save something.
  - The site shows a short, plain message saying it cannot reach its storage right now.
- **Outcome:** the page shows that message in place of its content. Anything the user tried to save is not there once the storage is back, not even in part. The site's log records the problem.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): try again later.

## use_case_send_while_construct_replies

The user makes another conjuration while the reply to their last one is still coming.

- **Prerequisites:** [`use_case_send_message`](performances.md#use_case_send_message), with the reply still arriving.
- **Steps:**
  - While the reply is still coming, another tab that has not yet learned of it makes a new conjuration in the same performance.
  - The rite replies to the new conjuration.
  - Later, the first reply finishes.
- **Outcome:** once the user reloads the performance, each reply comes right after the conjuration it answers: their first conjuration, its reply, their second conjuration, then its reply. The space holds one murmling for each conjuration. No reply is lost or shown twice.
- **Next:**
  - [`use_case_continue_performance`](performances.md#use_case_continue_performance): carry on from the latest reply.
