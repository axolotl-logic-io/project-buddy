# Access

The conventions for these cases are in [the index](README.md#conventions). The invite code gates only signing up; signing in is by an emailed link ([Accounts](accounts.md)).

## use_case_visit_signed_out

The user opens any page of the site without being signed in.

- **Prerequisites:** none.
- **Steps:**
  - She opens a page, either from a bookmark or by typing the address. The address can be any address on the site, including one that does not exist.
  - The site shows the sign-in page instead of the page.
- **Outcome:** the sign-in page shows only the site's name, the email field, a link to the sign-up page, the manual credit and the theme picker. It doesn't ask for the invite code. No one's projects, chats or memory appear. A request for the site's data from outside the pages, such as from a script, is refused as unauthorized and returns none of it.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): she has an account.
  - [`use_case_sign_up`](accounts.md#use_case_sign_up): she has been invited and has no account yet.

## use_case_sign_up_wrong_invite_code

The user enters a wrong invite code on the sign-up page.

- **Prerequisites:** `use_case_visit_signed_out`.
- **Steps:**
  - On the sign-up page, she enters her email address and an invite code that is wrong.
  - The site says the invite code is wrong and asks again.
- **Outcome:** the sign-up page is still showing and says the invite code was wrong. No email is sent, and no account is made. Opening any other page still shows the sign-in page. The failed attempt counts toward the lockout.
- **Next:**
  - [`use_case_sign_up`](accounts.md#use_case_sign_up): try again with the right one.
  - `use_case_sign_up_locked_out`: keep getting it wrong.

## use_case_sign_up_locked_out

The user has entered too many wrong invite codes on the sign-up page in a short time.

- **Prerequisites:** `use_case_sign_up_wrong_invite_code`, again and again from the same connection in a short time.
- **Steps:**
  - She enters an invite code on the sign-up page, right or wrong.
  - The site says there have been too many failed attempts and to try again later.
- **Outcome:** while the lockout lasts, even the right invite code is refused: no email is sent and no account is made. Once the wait has passed since the first of those failed attempts, the right invite code works again and the site tells her to check her email.
- **Next:**
  - [`use_case_sign_up`](accounts.md#use_case_sign_up): after the wait.

## use_case_return_signed_in

The user comes back to the site later on the same browser.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), less than 30 days earlier, and she has not signed out since.
- **Steps:**
  - She opens the site at any page, such as a bookmarked chat.
  - It goes straight to the page she asked for, without asking her to sign in.
- **Outcome:** the page she opened shows its content, and she did not have to sign in again.
- **Next:**
  - [`use_case_reopen_chat`](chats.md#use_case_reopen_chat): continue a lesson.
  - [`use_case_view_projects`](projects.md#use_case_view_projects): look over her projects.
  - `use_case_session_expired`: she has been away for more than a month.
  - `use_case_session_expired_in_chat`: her sign-in lapses while a chat is open.

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

The user's sign-in lapses while a chat is open, and she sends a message.

- **Prerequisites:** [`use_case_reopen_chat`](chats.md#use_case_reopen_chat), with the chat left open until her sign-in lapses.
- **Steps:**
  - She sends a message.
  - Instead of a reply, the chat says she has been signed out and needs to sign in again, with a link to the sign-in page.
- **Outcome:** no reply appears, and the chat shows the signed-out message rather than a general error. The link leads to the sign-in page. After she signs in and reopens the chat, the message she sent while signed out is not in it, so she can send it again.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): sign in again.
  - [`use_case_send_message`](chats.md#use_case_send_message): send the message again.
