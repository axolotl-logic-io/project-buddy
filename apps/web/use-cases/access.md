# Access

The conventions for these cases are in [the index](README.md#conventions). Anyone can create an account after verifying their email; signing in is by an emailed link ([Accounts](accounts.md)).

## use_case_visit_signed_out

The user opens any page of the site without being signed in.

- **Prerequisites:** none.
- **Steps:**
  - She opens a page, either from a bookmark or by typing the address. The address can be any address on the site, including one that does not exist.
  - The site shows the sign-in page instead of the page.
- **Outcome:** the sign-in page shows only the site's name, the email field, a link to the sign-up page and the menu. The menu offers Light, Dark and System modes and a Credits link. It doesn't ask for a shared code. No one's quests, adventures or Plans appear. A request for the site's data from outside the pages, such as from a script, is refused as unauthorized and returns none of it.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): she has an account.
  - [`use_case_sign_up`](accounts.md#use_case_sign_up): she has no account yet.

## use_case_return_signed_in

The user comes back to the site later on the same browser.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), less than 30 days earlier, and she has not signed out since.
- **Steps:**
  - She opens the site at any page, such as a bookmarked adventure.
  - It goes straight to the page she asked for, without asking her to sign in.
- **Outcome:** the page she opened shows its content, and she did not have to sign in again.
- **Next:**
  - [`use_case_open_quest`](quests.md#use_case_open_quest): continue a quest's conversation.
  - [`use_case_view_quests`](quests.md#use_case_view_quests): look over her quests.
  - `use_case_session_expired`: she has been away for more than a month.
  - `use_case_session_expired_in_chat`: her sign-in lapses while an adventure is open.

## use_case_session_expired

The user returns after her sign-in has lapsed.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), more than 30 days earlier.
- **Steps:**
  - She opens the site.
  - The site shows the sign-in page.
- **Outcome:** every page shows the sign-in page until she signs in again with a new emailed link. Once she does, she is signed in for another 30 days.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): sign in again.

## use_case_session_expired_in_chat

The user's sign-in lapses while an adventure is open, and she sends a message.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), with the quest's conversation left open until her sign-in lapses.
- **Steps:**
  - She sends a message.
  - Instead of a reply, the adventure says she has been signed out and needs to sign in again, with a link to the sign-in page.
- **Outcome:** no reply appears, and the adventure shows the signed-out message rather than a general error. The link leads to the sign-in page. After she signs in and reopens the adventure, the message she sent while signed out is not in it, so she can send it again.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): sign in again.
  - [`use_case_send_message`](chats.md#use_case_send_message): send the message again.
