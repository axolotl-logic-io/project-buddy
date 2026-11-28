# Access

The conventions for these cases are in [the index](README.md#conventions). Anyone can create an account after verifying their email; signing in is by an emailed link ([Accounts](accounts.md)).

## use_case_visit_signed_out

The user opens a page that requires sign-in without being signed in.

- **Prerequisites:** none.
- **Steps:**
  - The user opens a page, either from a bookmark or by typing the address. The address requires sign-in, such as Quests or a quest, or does not exist.
  - The site shows the sign-in page instead of the page.
- **Outcome:** the sign-in page shows the site's name, the email field, a link to the sign-up page and the site panel's button. The site panel offers Ivory Vellum, Soot & Brass and Espresso Leather appearances and a Credits link. Timer, Credits, sign-up and emailed sign-in pages remain public. It doesn't ask for a shared code. No one's quests, lists or performances appear. A request for the site's data from outside the pages, such as from a script, is refused as unauthorized and returns none of it.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): the user has an account.
  - [`use_case_sign_up`](accounts.md#use_case_sign_up): the user has no account yet.

## use_case_return_signed_in

The user comes back to the site later on the same browser.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), less than 30 days earlier, and the user has not signed out since.
- **Steps:**
  - The user opens the site at any page, such as a bookmarked quest.
  - It goes straight to the page the user asked for, without asking them to sign in.
- **Outcome:** the page header can appear while the page loads. The trail band shows “Loading page…” and the main area stays empty until the page content arrives. The user does not have to sign in again.
- **Next:**
  - [`use_case_open_quest`](quests.md#use_case_open_quest): continue a quest's performance.
  - [`use_case_view_quests`](quests.md#use_case_view_quests): look over their quests.
  - `use_case_session_expired`: the user has been away for more than a month.
  - `use_case_session_expired_in_performance`: their sign-in lapses while a performance is open.

## use_case_session_expired

The user returns after their sign-in has lapsed.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link), more than 30 days earlier.
- **Steps:**
  - The user opens a page from a link on a page they left open, or enters its address.
  - The site shows the sign-in page.
- **Outcome:** every page that requires sign-in shows the sign-in page until the user signs in again with a new emailed link. Once the user does, the user is signed in for another 30 days.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): sign in again.

## use_case_session_expired_in_performance

The user's sign-in lapses while a performance is open, and the user sends a message.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), with the quest's active performance left open until their sign-in lapses.
- **Steps:**
  - The user sends a message.
  - Instead of a reply, the performance says the user has been signed out and needs to sign in again, with a link to the sign-in page.
- **Outcome:** no reply appears, and the performance shows the signed-out message rather than a general error. The link leads to the sign-in page. After the user signs in and reopens the quest, the message made while signed out is not in the performance or the list, so the user can make it again.
- **Next:**
  - [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link): sign in again.
  - [`use_case_send_message`](performances.md#use_case_send_message): send the message again.

## use_case_change_auth_page

The user follows a link between the sign-in and sign-up pages.

- **Prerequisites:** none.
- **Steps:**
  - The user follows the link to sign up.
  - The user goes Back, then Forward.
- **Outcome:** during a page change, the current page stays visible. The trail band shows an indicator and announces “Loading page…” until the new page or its error is ready. Then the new content replaces the old content in one step. Back and Forward behave the same way. The indicator stays still when the user prefers reduced motion.
- **Next:**
  - [`use_case_sign_up`](accounts.md#use_case_sign_up): verify the user's email and create an account.

## use_case_content_stays_still

The user acts on a signed-in page, or follows a link to another, while reading it on a phone or a wide screen.

- **Prerequisites:** the user is signed in.
- **Steps:**
  - The user checks off a task on Home, undoes it, adds to a tally or adds a task with Quick Add.
  - On a quest's Overview, the user starts a performance and sends a message.
  - The user starts the Timer, or starts a new quest.
  - The user follows a link to each signed-in page.
- **Outcome:** nothing on the page moves that the user didn't change, while the action saves and once the server replies. A notice takes the place of what it replaces, such as the amount field that saving a tally closes, and its room stays when it goes, so what follows it stays put. Content the user didn't change moves only when a list item they added pushes what follows it in its own list, such as the tasks under one that Quick Add puts at the top. A performance starts after the list sections, so they stay put, and the page scrolls to its composer.
- **Next:**
  - [`use_case_perform_rite`](performances.md#use_case_perform_rite): perform a rite on a list.
