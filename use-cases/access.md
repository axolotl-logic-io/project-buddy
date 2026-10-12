# Access

The conventions for these cases are in [the index](README.md#conventions).

## use_case_visit_signed_out

The user opens any page of the site without being signed in.

- **Prerequisites:** none.
- **Steps:**
  - She opens a page, either from a bookmark or by typing the address. The address can be any address on the site, including one that does not exist.
  - The site asks for the passphrase instead of showing the page.
- **Outcome:** the passphrase page shows only the site's name, the passphrase field, the manual credit and the theme picker. None of her projects, chats or memory appear. A request for the site's data from outside the pages, such as from a script, is refused as unauthorized and returns none of it.
- **Next:**
  - `use_case_login_success`: she knows the passphrase.
  - `use_case_login_wrong_passphrase`: she mistypes it.

## use_case_login_success

The user signs in with the correct passphrase.

- **Prerequisites:** `use_case_visit_signed_out`.
- **Steps:**
  - She enters the passphrase.
  - The site lets her in and shows the home page.
- **Outcome:** she is on the home page, which links to her projects. Every page now opens in this browser without the passphrase, and the sign-in lasts 30 days. Wrong passphrases entered before this no longer count toward the lockout.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): see what she has been working on.
  - [`use_case_new_project`](projects.md#use_case_new_project): start learning something new.
  - `use_case_return_signed_in`: come back another day without signing in again.

## use_case_login_wrong_passphrase

The user enters a wrong passphrase.

- **Prerequisites:** `use_case_visit_signed_out`.
- **Steps:**
  - She enters a passphrase that is wrong.
  - The site says the passphrase is wrong and asks again.
- **Outcome:** the passphrase page is still showing and says the passphrase was wrong. Opening any other page still shows the passphrase page. The failed attempt counts toward the lockout.
- **Next:**
  - `use_case_login_success`: try again with the right one.
  - `use_case_login_locked_out`: keep getting it wrong.

## use_case_login_locked_out

The user has entered too many wrong passphrases in a short time.

- **Prerequisites:** `use_case_login_wrong_passphrase`, five times from the same connection within 15 minutes.
- **Steps:**
  - She enters a passphrase, right or wrong.
  - The site says there have been too many failed attempts and to try again later.
- **Outcome:** she is still signed out, even if she entered the right passphrase. Once 15 minutes have passed since the first of those failed attempts, the right passphrase signs her in again.
- **Next:**
  - `use_case_login_success`: after the wait.

## use_case_return_signed_in

The user comes back to the site later on the same browser.

- **Prerequisites:** `use_case_login_success`, less than 30 days earlier.
- **Steps:**
  - She opens the site at any page, such as a bookmarked chat.
  - It goes straight to the page she asked for, without asking for the passphrase.
- **Outcome:** the page she opened shows its content, and she did not have to enter the passphrase.
- **Next:**
  - [`use_case_reopen_chat`](chats.md#use_case_reopen_chat): continue a lesson.
  - [`use_case_view_projects`](projects.md#use_case_view_projects): look over her projects.
  - `use_case_session_expired`: she has been away for more than a month.
  - `use_case_session_expired_in_chat`: her sign-in lapses while a chat is open.

## use_case_session_expired

The user returns after her sign-in has lapsed.

- **Prerequisites:** `use_case_login_success`, more than 30 days earlier.
- **Steps:**
  - She opens the site.
  - The site asks for the passphrase again.
- **Outcome:** every page shows the passphrase page until she enters the passphrase. Once she does, she is signed in for another 30 days.
- **Next:**
  - `use_case_login_success`: sign in again.

## use_case_session_expired_in_chat

The user's sign-in lapses while a chat is open, and she sends a message.

- **Prerequisites:** [`use_case_reopen_chat`](chats.md#use_case_reopen_chat), with the chat left open until her sign-in lapses.
- **Steps:**
  - She sends a message.
  - Instead of a reply, the chat says she has been signed out and needs to sign in again, with a link to the passphrase page.
- **Outcome:** no reply appears, and the chat shows the signed-out message rather than a general error. The link leads to the passphrase page. After she signs in and reopens the chat, the message she sent while signed out is not in it, so she can send it again.
- **Next:**
  - `use_case_login_success`: sign in again.
  - [`use_case_send_message`](chats.md#use_case_send_message): send the message again.
