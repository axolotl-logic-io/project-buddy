# Access

The conventions for these cases are in [the index](README.md#conventions). Only admin invitations can create new accounts; signing in is by an emailed link ([Accounts](accounts.md)).

## use_case_visit_signed_out

The user opens any page of the site without being signed in.

- **Prerequisites:** none.
- **Steps:**
  - She opens a page, either from a bookmark or by typing the address. The address can be any address on the site, including one that does not exist.
  - The site shows the sign-in page instead of the page.
- **Outcome:** the sign-in page shows only the site's name, the email field, a link to the sign-up page, the manual credit and the theme picker. It doesn't ask for a shared code. No one's projects, chats or memory appear. A request for the site's data from outside the pages, such as from a script, is refused as unauthorized and returns none of it.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): she has an account.
  - [`use_case_sign_up`](accounts.md#use_case_sign_up): she has been invited and has no account yet.

## use_case_sign_up_requires_invitation

A visitor without an invitation tries to make an account.

- **Prerequisites:** `use_case_visit_signed_out`.
- **Steps:** The visitor opens the former sign-up page or directly submits its former shared code and an email address.
- **Outcome:** The page explains that an admin must invite their email address. No shared-code form is offered; even a direct submission with the old code creates no account and sends no email. Normal sign-in for an unknown address still gives the non-disclosing response without creating an account.

## use_case_invitation_unusable

A visitor opens or submits an invalid, expired, replaced, or already-used invitation.

- **Prerequisites:** none.
- **Steps:** They open or confirm a setup link whose token is missing, malformed, unknown, altered, at least 30 minutes old, replaced by another invitation, or already accepted.
- **Outcome:** The site explains that the invitation cannot be used and offers normal sign-in for an existing account. No account or session is granted by that link. An expired link requires a new invitation from an admin. Two concurrent confirmations of one valid invitation grant exactly one account and one session; the loser is refused as already used.

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
