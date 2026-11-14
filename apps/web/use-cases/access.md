# Access

The conventions for these cases are in [the index](README.md#conventions). Anyone can create an account after verifying their email; signing in is by an emailed link ([Accounts](accounts.md)).

## use_case_visit_signed_out

The user opens any page of the site without being signed in.

- **Prerequisites:** none.
- **Steps:**
  - The user opens a page, either from a bookmark or by typing the address. The address can be any address on the site, including one that does not exist.
  - The site shows the sign-in page instead of the page.
- **Outcome:** the sign-in page shows only the site's name, the email field, a link to the sign-up page and the menu. The menu offers Light, Dark and System modes and a Credits link. It doesn't ask for a shared code. No one's quests, conversations or Plans appear. A request for the site's data from outside the pages, such as from a script, is refused as unauthorized and returns none of it.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): the user has an account.
  - [`use_case_sign_up`](accounts.md#use_case_sign_up): the user has no account yet.

## use_case_return_signed_in

The user comes back to the site later on the same browser.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), less than 30 days earlier, and the user has not signed out since.
- **Steps:**
  - The user opens the site at any page, such as a bookmarked conversation.
  - It goes straight to the page the user asked for, without asking them to sign in.
- **Outcome:** the page the user opened shows its content, and the user did not have to sign in again.
- **Next:**
  - [`use_case_open_quest`](quests.md#use_case_open_quest): continue a quest's conversation.
  - [`use_case_view_quests`](quests.md#use_case_view_quests): look over their quests.
  - `use_case_session_expired`: the user has been away for more than a month.
  - `use_case_session_expired_in_chat`: their sign-in lapses while a conversation is open.

## use_case_session_expired

The user returns after their sign-in has lapsed.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), more than 30 days earlier.
- **Steps:**
  - The user opens the site.
  - The site shows the sign-in page.
- **Outcome:** every page shows the sign-in page until the user signs in again with a new emailed link. Once the user does, the user is signed in for another 30 days.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): sign in again.

## use_case_session_expired_in_chat

The user's sign-in lapses while a conversation is open, and the user sends a message.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), with the quest's conversation left open until their sign-in lapses.
- **Steps:**
  - The user sends a message.
  - Instead of a reply, the conversation says the user has been signed out and needs to sign in again, with a link to the sign-in page.
- **Outcome:** no reply appears, and the conversation shows the signed-out message rather than a general error. The link leads to the sign-in page. After the user signs in and reopens the conversation, the message the user sent while signed out is not in it, so the user can send it again.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): sign in again.
  - [`use_case_send_message`](chats.md#use_case_send_message): send the message again.
