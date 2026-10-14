# When things go wrong

The conventions for these cases are in [the index](README.md#conventions).

## use_case_reply_fails

The tutor cannot reply to a message.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message).
- **Steps:**
  - She sends a message.
  - Instead of a reply, the chat shows a short, plain message that says what kind of problem it is. Each kind has its own fixed message:
    - the tutor's account has run out of credit;
    - the tutor's account key is not accepted;
    - the tutor is getting too many requests;
    - the tutor is overloaded right now;
    - the conversation has grown too long;
    - the tutor's service refused the request;
    - the tutor's service is having trouble;
    - the tutor cannot be reached;
    - the site cannot reach its storage;
    - the site's storage refused a request;
    - something unexpected went wrong.
- **Outcome:** the chat shows the fixed message for that kind of problem and no reply. Her message is still in the chat after she reloads the page. The site's log records the problem for Autumn to look into later, and the chat shows none of those details.
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): try again once the problem is fixed.
  - [`use_case_new_chat`](chats.md#use_case_new_chat): start fresh if the conversation has grown too long.

## use_case_storage_unavailable

The site cannot load or save the user's projects and chats.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens her projects, a chat or the memory, or tries to save something.
  - The site shows a short, plain message saying it cannot reach its storage right now.
- **Outcome:** the page shows that message in place of its content. Anything she tried to save is not there once the storage is back, not even in part. The site's log records the problem for Autumn to look into.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): try again later.

## use_case_start_without_claude

The user starts a project or a chat while Claude is unavailable, so the tutor can't write the chat's opening.

- **Prerequisites:** [`use_case_new_project`](projects.md#use_case_new_project) or [`use_case_new_chat`](chats.md#use_case_new_chat).
- **Steps:**
  - She names a new project, or picks a project and a buddy for a new chat, and starts it.
  - The site shows that it is working while it asks the tutor for the chat's opening, which fails or takes longer than 30 seconds.
- **Outcome:** the form stays on screen with what she entered: the project's name, or the chosen project and buddy. It shows one fixed message: Claude is unavailable right now, so chats are turned off, and to try again later. Nothing is saved: no new project and no new chat appear in her lists. The site's log records the problem once for Autumn to look into. Replies inside a chat that already exists fail as `use_case_reply_fails` says.
- **Next:**
  - [`use_case_new_project`](projects.md#use_case_new_project) or [`use_case_new_chat`](chats.md#use_case_new_chat): try again later.

## use_case_send_while_tutor_replies

The user sends another message while the tutor is still replying to her last one.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), with the reply still arriving.
- **Steps:**
  - While the tutor is still replying, she opens the same chat in another tab and sends a new message there.
  - The tutor answers the new message.
  - Later, the first reply finishes.
- **Outcome:** once she reloads the chat, each reply comes right after the message it answers: her first message, its reply, her second message, then its reply. No reply is lost or shown twice.
- **Next:**
  - [`use_case_continue_chat`](chats.md#use_case_continue_chat): carry on from the latest reply.
