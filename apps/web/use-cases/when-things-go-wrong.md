# When things go wrong

The conventions for these cases are in [the index](README.md#conventions).

## use_case_reply_fails

The construct cannot reply to a message.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message).
- **Steps:**
  - She sends a message.
  - Instead of a reply, the adventure shows a short, plain message that says what kind of problem it is. Each kind has its own fixed message:
    - the construct's account has run out of credit;
    - the construct's account key is not accepted;
    - the construct is getting too many requests;
    - the construct is overloaded right now;
    - the conversation has grown too long;
    - the construct's service refused the request;
    - the construct's service is having trouble;
    - the construct cannot be reached;
    - the site cannot reach its storage;
    - the site's storage refused a request;
    - something unexpected went wrong.
- **Outcome:** the adventure shows the fixed message for that kind of problem and no reply, with Retry reply. Her message is still in the adventure after she reloads the page or reopens the adventure, and the adventure then says the construct didn't reply to it, with Retry reply, which asks for the reply to that same message without sending it again. Either Retry reply leaves the keyboard's focus in the message box, so she can carry on writing. While a reply to the last message is still being made, such as from another tab, the adventure offers no retry. The site's log records the problem, and the adventure shows none of those details.
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): try again once the problem is fixed.
  - [`use_case_new_chat`](chats.md#use_case_new_chat): start fresh if the conversation has grown too long.

## use_case_storage_unavailable

The site cannot load or save the user's quests and adventures.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens her quests, an adventure or the Journal, or tries to save something.
  - The site shows a short, plain message saying it cannot reach its storage right now.
- **Outcome:** the page shows that message in place of its content. Anything she tried to save is not there once the storage is back, not even in part. The site's log records the problem.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): try again later.

## use_case_start_without_claude

The user starts a quest or an adventure, with a construct or an activity of her own that she has edited, while Claude is unavailable, so the construct can't write the adventure's opening. An adventure with a prepared opening starts as usual ([`use_case_prepared_opening`](chats.md#use_case_prepared_opening)).

- **Prerequisites:** [`use_case_new_project`](projects.md#use_case_new_project) or [`use_case_new_chat`](chats.md#use_case_new_chat).
- **Steps:**
  - She names a new quest with motivation or an edited Interview guildmate saved in Settings; or she picks a quest and an edited construct for a new adventure. She starts it.
  - The site shows that it is working while it asks the construct for the adventure's opening, which fails or takes longer than 30 seconds.
- **Outcome:** the form stays on screen with what she entered: the quest's name and motivation, or the chosen quest and construct. It shows one fixed message: Claude is unavailable right now, so adventures are turned off, and to try again later. Nothing is saved: no new quest and no new adventure appear in her lists. The site's log records the problem once. Replies inside an adventure that already exists fail as `use_case_reply_fails` says.
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project) or [`use_case_new_chat`](chats.md#use_case_new_chat): try again later.

## use_case_send_while_construct_replies

The user sends another message while the construct is still replying to her last one.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), with the reply still arriving.
- **Steps:**
  - While the construct is still replying, she opens the same adventure in another tab and sends a new message there.
  - The construct answers the new message.
  - Later, the first reply finishes.
- **Outcome:** once she reloads the adventure, each reply comes right after the message it answers: her first message, its reply, her second message, then its reply. No reply is lost or shown twice.
- **Next:**
  - [`use_case_continue_chat`](chats.md#use_case_continue_chat): carry on from the latest reply.
