# Accounts

The conventions for these cases are in [the index](README.md#conventions). Who may sign up, and the quota every account has, are described [there too](README.md#who-uses-the-site).

## use_case_sign_up

The user, invited by Autumn, makes her account.

- **Prerequisites:** [`use_case_visit_signed_out`](access.md#use_case_visit_signed_out), and she knows the invite code.
- **Steps:**
  - From the sign-in page she goes to the sign-up page.
  - She enters the invite code and her email address.
  - The site tells her to check her email.
  - An email from the site arrives at that address, holding a link that signs her in.
- **Outcome:** the sign-up page says to check her email, and the email holds a sign-in link that works for 30 minutes. She is not signed in until she follows it: every other page still shows the sign-in page. The site's answer is the same whether or not the address already has an account.
- **Next:**
  - `use_case_sign_in_by_link`: follow the link in the email.
  - `use_case_sign_up_existing_email`: she signs up again, having forgotten she already did.
  - [`use_case_sign_up_wrong_invite_code`](access.md#use_case_sign_up_wrong_invite_code): she mistypes the invite code.
  - `use_case_too_many_sign_in_requests`: no email arrives after many tries.

## use_case_sign_up_existing_email

The user signs up with an address that already has an account.

- **Prerequisites:** `use_case_sign_up`, with the same address.
- **Steps:**
  - She enters the invite code and the same email address on the sign-up page.
  - The site tells her to check her email, exactly as it did the first time.
  - An email arrives holding a link that signs her in to the account she already has.
- **Outcome:** the answer on the page is the same as for a new address, so the page doesn't reveal that the account exists. Following the link signs her in to her existing account, with her projects, chats and memory as she left them. No second account is made for the address.
- **Next:**
  - `use_case_sign_in_by_link`: follow the link.

## use_case_sign_in_by_link

The user signs in with a link the site emails her, on this device or another.

- **Prerequisites:** `use_case_sign_up`.
- **Steps:**
  - On the sign-in page she enters her email address. The page asks only for that, with a link to the sign-up page.
  - The site tells her to check her email, and an email arrives holding a sign-in link.
  - She opens the link, in this browser or on another device, such as her phone.
  - The page the link opens asks her to continue. She continues.
  - The site signs her in and shows the home page.
- **Outcome:** she is on the home page, which leads to her projects, in the browser where she continued. Every page now opens there without signing in again, and the sign-in lasts 30 days. Opening the link alone does not sign anyone in; only continuing does, so a mail program that opens the link to check it gets nothing. An address with no account gets the same answer on the sign-in page, and no email.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): see what she has been working on.
  - [`use_case_new_project`](projects.md#use_case_new_project): start learning something new.
  - [`use_case_return_signed_in`](access.md#use_case_return_signed_in): come back another day without signing in again.
  - `use_case_sign_in_link_reused`: sign in on another device with the same link.
  - `use_case_sign_in_link_expired`: she opens the link too late.

## use_case_sign_in_link_expired

The user opens a sign-in link more than 30 minutes after the site sent it.

- **Prerequisites:** `use_case_sign_in_by_link`, with the email's link opened more than 30 minutes after it was sent.
- **Steps:**
  - She opens the link from the email.
  - The page says the link has expired, with a link to the sign-in page to ask for a new one.
- **Outcome:** she is still signed out in that browser: every other page shows the sign-in page. Asking for a new link on the sign-in page sends a fresh one that signs her in.
- **Next:**
  - `use_case_sign_in_by_link`: ask for a new link.

## use_case_sign_in_link_reused

The user follows the same sign-in link more than once within its 30 minutes.

- **Prerequisites:** `use_case_sign_in_by_link`, less than 30 minutes after the link was sent.
- **Steps:**
  - She opens the same link again, in another browser or on another device, or in the same browser after signing out.
  - She continues, as the first time.
- **Outcome:** she is signed in there too, for 30 days, and the browser she signed in on first stays signed in. The link keeps working for any number of sign-ins until 30 minutes after it was sent, unless she signs out everywhere first.
- **Next:**
  - `use_case_sign_in_link_expired`: she tries the link again after 30 minutes.
  - `use_case_sign_out_everywhere`: she shouldn't have signed in on a shared computer.

## use_case_too_many_sign_in_requests

The user, or someone else, asks for many sign-in or sign-up emails in a short time.

- **Prerequisites:** [`use_case_visit_signed_out`](access.md#use_case_visit_signed_out).
- **Steps:**
  - She asks for sign-in links for the same address again and again, on the sign-in or the sign-up page; or someone on another connection asks for links to her address; or many addresses are asked for from the same connection.
  - Each time, the site tells her to check her email.
- **Outcome:** the answer on the page never changes, so it reveals neither the limits nor whether an account exists. Past a limit, no email is sent until that limit's wait has passed:
  - From one connection, at most 3 emails to one address in 15 minutes. Someone else asking for her address uses up only their own connection's emails, so hers still arrive.
  - To one address, at most 10 emails in 15 minutes from every connection together, counting only requests within the other two limits. Many connections together can still fill this limit, and then no email reaches her address until the wait has passed.
  - From one connection, at most 20 requests in an hour, for any addresses.

  After the wait, asking again sends an email as usual, and the links sent before the limit still work for their 30 minutes.
- **Next:**
  - `use_case_sign_in_by_link`: ask again after the wait.

## use_case_private_data

Two users each see only their own projects, chats, memory, buddies and monthly spend.

- **Prerequisites:** `use_case_sign_in_by_link`, for two different accounts, each with a project that has a chat ([`use_case_new_project`](projects.md#use_case_new_project)).
- **Steps:**
  - The second user opens the addresses of the first user's project, its memory and its chat.
  - She tries to send a message in that chat, save that memory and rename that chat, using its address.
  - She looks over her own projects, and starts a new chat.
  - She tries to restore an earlier version of the first user's memory, and to read, clone, edit and delete the first user's buddy.
  - Both users spend in the same month.
- **Outcome:** each of the first user's pages, for the second user, says it cannot be found, exactly as an address that never existed does ([`use_case_open_missing_page`](chats.md#use_case_open_missing_page)). Her message, memory save and rename are refused as not found, and the first user's chat, memory and chat name are unchanged. Her projects list, and the projects she can pick for a new chat, show only her own projects. Restoring the first user's memory answers as for a project that never existed, shows none of its text and saves nothing. The first user's buddy is not found to her, as an unknown buddy is, and stays as it was; her buddies list shows only her own, and theirs only theirs. Each user's monthly spend counts only their own calls.
- **Next:**
  - [`use_case_view_projects`](projects.md#use_case_view_projects): carry on with her own work.

## use_case_see_monthly_usage

The user checks how much of this month's Claude quota she has used.

- **Prerequisites:** `use_case_sign_in_by_link`.
- **Steps:**
  - She opens her account page from the top of any page.
  - It shows how much she has spent this month out of $5, and when the quota resets.
  - She sends a message in a chat, then opens her account page again.
- **Outcome:** the account page shows her spend this month in dollars and cents out of $5.00, such as "$1.25 of $5.00", and the date it resets: the 1st of next month, in UTC. After her message and its reply, the spend has grown. The page also offers Sign out and Sign out everywhere. The usage meter is an extra: with it switched off in Settings ([`use_case_hide_extras`](appearance.md#use_case_hide_extras)), the account page shows no meter, and the buttons are still there.
- **Next:**
  - `use_case_over_quota`: she uses up the month's $5.
  - `use_case_sign_out`: she is done for the day.

## use_case_set_name

The user tells the tutor what to call her, so a buddy that says `{{name}}` uses her name.

- **Prerequisites:** `use_case_sign_in_by_link`.
- **Steps:**
  - On her account page, under "Your name", she types her name, such as "Mabel", and saves.
  - The page says it is saved, and the field shows her name, also after a reload.
  - She chats in a buddy of her own whose voice says `Hi {{name}}` ([`use_case_edit_buddy`](buddies.md#use_case_edit_buddy)).
- **Outcome:** her name is saved trimmed, and the tutor's system prompt says "Hi Mabel" wherever the buddy's prompt says `{{name}}`: in the parts the system prompt reads, for replies and for a new chat's opening. The buddy itself still says `{{name}}`. Another user's prompt never holds her name: one with no name of their own gets "the user" in its place. The field's hint says what `{{name}}` does.
- **Variations:**
  - She empties the field and saves: her name is cleared, and her next prompt says "the user" in its place.
  - A name with a line break, over 60 characters, or with `{` or `}` is refused: the field says why, keeps what she typed, and nothing is saved.
  - Signed out, the page shows the sign-in page and nothing is saved.
- **Next:**
  - [`use_case_edit_buddy`](buddies.md#use_case_edit_buddy): put `{{name}}` in a buddy of hers.

## use_case_over_quota

The user has spent this month's $5 of Claude.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), with her spend this month just under $5.
- **Steps:**
  - She sends a message. Its reply takes her spend past $5, and it finishes in full.
  - She sends another message.
  - Instead of a reply, the chat says she has used up this month's quota and names the day it resets.
  - She tries to start a new chat, and to start a new project.
- **Outcome:** the reply that crossed $5 is whole, and the chat may still be named from it. The next message gets no reply, and the chat shows the quota message with the reset date, the 1st of next month in UTC, rather than a general error. New chat and New project each show the same message and create nothing: no new chat or project appears in her lists. No smaller model is offered. She can still read her projects, chats and memory, edit the memory herself and rename chats. From the reset date on, she can send messages and start chats and projects again.
- **Next:**
  - `use_case_see_monthly_usage`: check when the quota resets.

## use_case_settings_follow_user

The user's choice of which extras to hide follows her to every browser she signs in to.

- **Prerequisites:** [`use_case_hide_extras`](appearance.md#use_case_hide_extras), signed in.
- **Steps:**
  - In Settings, she switches off working notes.
  - She signs in on another browser or device, and opens a chat that holds a working note.
- **Outcome:** in the other browser, working notes are off from the chat's first appearance, and Settings shows the switch off. Her choice is saved to her account, not only to the browser, and another user's Settings are unchanged by it. The theme and mode stay a choice of each browser ([`use_case_choose_theme`](appearance.md#use_case_choose_theme)).
- **Next:**
  - [`use_case_hide_extras`](appearance.md#use_case_hide_extras): switch them back on.

## use_case_sign_out

The user signs out of the browser she is using.

- **Prerequisites:** `use_case_sign_in_by_link`.
- **Steps:**
  - On her account page, she chooses Sign out.
  - The site shows the sign-in page.
- **Outcome:** every page in this browser shows the sign-in page until she signs in again. Her other browsers and devices stay signed in. A sign-in link from the last 30 minutes still signs her in.
- **Next:**
  - `use_case_sign_in_by_link`: sign in again.
  - `use_case_sign_out_everywhere`: she wants every device signed out.

## use_case_sign_out_everywhere

The user signs out of every browser and device at once, for example after signing in on a shared computer.

- **Prerequisites:** `use_case_sign_in_by_link`, in two browsers.
- **Steps:**
  - On her account page in one browser, she chooses Sign out everywhere.
  - The site asks her to confirm. She confirms.
  - The site shows the sign-in page.
  - In the other browser, she opens a page.
- **Outcome:** this browser and every other one are signed out: the other browser shows the sign-in page at its next page, and a chat left open there says she has been signed out when she next sends a message ([`use_case_session_expired_in_chat`](access.md#use_case_session_expired_in_chat)). Every sign-in link sent before no longer signs her in, even within its 30 minutes. If she cancels instead of confirming, nothing changes and she stays signed in everywhere. A new link signs her in as usual.
- **Next:**
  - `use_case_sign_in_by_link`: sign in again where she wants to be.
