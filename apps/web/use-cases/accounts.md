# Accounts

The conventions for these cases are in [the index](README.md#conventions).

## use_case_sign_up

Anyone can create an account by verifying their email address.

- **Prerequisites:** The address has no account.
- **Steps:** Open Log in or sign up, or Sign up, enter an email address and request a link. Open the emailed link and choose Continue.
- **Outcome:** Requesting a link and opening it create no account or session. Confirmation creates one ordinary account for the verified, normalized address, grants its starting batteries and signs the browser in for 30 days, reaching Quests. No invitation, code or password is required. Verification links expire after 30 minutes, are replaced by a fresh request, and can be confirmed once. Invalid, expired, replaced and used links create no account or session. Concurrent confirmations create at most one account; a failed account insert preserves the link for retry. Public sign-up shares sign-in request limits.

## use_case_sign_up_existing_email

An existing user enters their address on Sign up.

- **Prerequisites:** `use_case_sign_up`.
- **Steps:** Enter the same email, optionally with different casing or surrounding whitespace, and request a link. Open it and continue.
- **Outcome:** The address receives a normal reusable login link. The user reaches the same account with its role and data unchanged. No duplicate account or additional starting balance is created. The form gives the same confirmation as for a new address.

## use_case_sign_in_by_link

The user signs in with a link the site emails her, on this device or another.

- **Prerequisites:** `use_case_sign_up`.
- **Steps:**
  - On the page labeled "Log in or sign up", she enters her email address. The page asks only for that and offers a Sign up link for new users.
  - The site tells her to check her email, and an email arrives holding a sign-in link.
  - She opens the link, in this browser or on another device, such as her phone.
  - The page the link opens asks her to continue. She continues.
  - The site signs her in and shows Quests.
- **Outcome:** she is on Quests, where she can continue a quest or choose one of the four premade starting points, in the browser where she continued. Every page now opens there without signing in again, and the sign-in lasts 30 days. Opening the link alone does not sign anyone in; only continuing does, so a mail program that opens the link to check it gets nothing. An address with no account gets the same answer and a verification link to create an account.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): see what she has been working on.
  - [`use_case_new_quest`](quests.md#use_case_new_quest): start learning something new.
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

The user, or someone else, asks for many sign-in emails in a short time.

- **Prerequisites:** [`use_case_visit_signed_out`](access.md#use_case_visit_signed_out).
- **Steps:**
  - She asks for sign-in links for the same address again and again, on the sign-in page; or someone on another connection asks for links to her address; or many addresses are asked for from the same connection.
  - Each time, the site tells her to check her email.
- **Outcome:** the answer on the page never changes, so it reveals neither the limits nor whether an account exists. Past a limit, no email is sent until that limit's wait has passed:
  - From one connection, at most 3 emails to one address in 15 minutes. Someone else asking for her address uses up only their own connection's emails, so hers still arrive.
  - To one address, at most 10 emails in 15 minutes from every connection together, counting only requests within the other two limits. Many connections together can still fill this limit, and then no email reaches her address until the wait has passed.
  - From one connection, at most 20 requests in an hour, for any addresses.

  After the wait, asking again sends an email as usual, and the links sent before the limit still work for their 30 minutes.
- **Next:**
  - `use_case_sign_in_by_link`: ask again after the wait.

## use_case_private_data

Two users each see only their own quests, adventures, Plans, constructs and batteries.

- **Prerequisites:** `use_case_sign_in_by_link`, for two different accounts, each with a quest that has an adventure ([`use_case_new_quest`](quests.md#use_case_new_quest)).
- **Steps:**
  - The second user opens the addresses of the first user's quest, Plan and adventure.
  - She tries to send a message in that adventure, change that Plan and rename that adventure, using its address.
  - She looks over her own quests, and starts a new adventure.
  - She tries to restore an earlier version of the first user's Journal, and to read, clone, edit and delete the first user's construct.
  - Both users spend batteries.
- **Outcome:** each of the first user's pages, for the second user, says it cannot be found, exactly as an address that never existed does ([`use_case_open_missing_page`](chats.md#use_case_open_missing_page)). Her message, Journal save and rename are refused as not found, and the first user's adventure and adventure name are unchanged. Her quests list, and the quests she can pick for a new adventure, show only her own quests. The first user's construct is not found to her, as an unknown construct is, and stays as it was; her Constructs lists only her own constructs, and theirs only theirs.
- **Variations:**
  - Each user can have many standalone adventures, in no quest: each one she starts, however many at once, is a new adventure of her own. The first user's standalone adventure, and its messages, are not found to her, exactly as an unknown adventure is, and take none of her writes: its address says it cannot be found, and a message sent to it through the adventure API is refused as not found. A standalone adventure is never among a quest's adventures, and goes when its account is deleted.
  - A quest of the first user's that she was once a member of, from when quests could be shared, looks to her exactly like the first user's other quests do: her old membership or quest invitation grants nothing.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): carry on with her own work.


## use_case_set_name

The user tells the construct what to call her, so a construct that says `{{name}}` uses her name.

- **Prerequisites:** `use_case_sign_in_by_link`.
- **Steps:**
  - On Settings, under Profile, under "Your name", she types her name, such as "Mabel", and saves.
  - The page says it is saved, and the field shows her name, also after a reload.
  - She adventures in a construct of her own whose voice says `Hi {{name}}` ([`use_case_edit_construct`](constructs.md#use_case_edit_construct)).
- **Outcome:** her name is saved trimmed, and the construct's system prompt says "Hi Mabel" wherever the construct's prompt says `{{name}}`: in the parts the system prompt reads, for replies and for a new adventure's opening. The construct itself still says `{{name}}`. Another user's prompt never holds her name: one with no name of their own gets "the user" in its place. The field's hint says what `{{name}}` does.
- **Variations:**
  - She empties the field and saves: her name is cleared, and her next prompt says "the user" in its place.
  - A name with a line break, over 60 characters, or with `{` or `}` is refused: the field says why, keeps what she typed, and nothing is saved.
  - Signed out, the page shows the sign-in page and nothing is saved.
- **Next:**
  - [`use_case_edit_construct`](constructs.md#use_case_edit_construct): put `{{name}}` in a construct of hers.


## use_case_sign_out

The user signs out of the browser she is using.

- **Prerequisites:** `use_case_sign_in_by_link`.
- **Steps:**
  - On Settings, she chooses Sign out.
  - The site shows the sign-in page.
- **Outcome:** every page in this browser shows the sign-in page until she signs in again. Her other browsers and devices stay signed in. A sign-in link from the last 30 minutes still signs her in.
- **Next:**
  - `use_case_sign_in_by_link`: sign in again.
  - `use_case_sign_out_everywhere`: she wants every device signed out.

## use_case_sign_out_everywhere

The user signs out of every browser and device at once, for example after signing in on a shared computer.

- **Prerequisites:** `use_case_sign_in_by_link`, in two browsers.
- **Steps:**
  - On Settings in one browser, she chooses Sign out everywhere.
  - The site asks her to confirm. She confirms.
  - The site shows the sign-in page.
  - In the other browser, she opens a page.
- **Outcome:** this browser and every other one are signed out: the other browser shows the sign-in page at its next page, and an adventure left open there says she has been signed out when she next sends a message ([`use_case_session_expired_in_chat`](access.md#use_case_session_expired_in_chat)). Every sign-in link sent before no longer signs her in, even within its 30 minutes. If she cancels instead of confirming, nothing changes and she stays signed in everywhere. A new link signs her in as usual.
- **Next:**
  - `use_case_sign_in_by_link`: sign in again where she wants to be.

