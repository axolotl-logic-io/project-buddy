# Accounts

The conventions for these cases are in [the index](README.md#conventions).

## use_case_sign_up

Anyone can create an account by verifying their email address.

- **Prerequisites:** The address has no account.
- **Steps:** Open Log in or sign up, or Sign up, enter an email address and request a link. Open the emailed link, enter a required Name, and choose Continue.
- **Outcome:** Requesting a link and opening it create no account or session. Confirmation validates and saves the name and creates one ordinary account for the verified, normalized address, signs the browser in for 30 days, reaching Quests. No invitation, code or password is required. Verification links expire after 30 minutes, are replaced by a fresh request, and can be confirmed once. Invalid, expired, replaced and used links create no account or session. Concurrent confirmations create at most one account; a failed account insert preserves the link for retry. Public sign-up shares sign-in request limits.

## use_case_sign_up_existing_email

An existing user enters their address on Sign up.

- **Prerequisites:** `use_case_sign_up`.
- **Steps:** Enter the same email, optionally with different casing or surrounding whitespace, and request a link. Open it and continue.
- **Outcome:** The address receives a normal reusable sign-in link. The user reaches the same account with its role and data unchanged. No duplicate account is created. The form gives the same confirmation as for a new address.

## use_case_sign_in_by_link

The user signs in with a link the site emails them, on this device or another.

- **Prerequisites:** `use_case_sign_up`.
- **Steps:**
  - On the page labeled "Log in or sign up", the user enters their email address. The page asks only for that and offers a Sign up link for new users.
  - The site tells them to check their email, and an email arrives holding a sign-in link.
  - The user opens the link, in this browser or on another device, such as their phone.
  - The page the link opens asks them to continue. The user continues.
  - The site signs them in and shows Quests.
- **Outcome:** the user is on Quests, where the user can continue a quest or choose one of the four premade starting points, in the browser where the user continued. Every page now opens there without signing in again, and the sign-in lasts 30 days. Opening the link alone does not sign anyone in; only continuing does, so a mail program that opens the link to check it gets nothing. An address with no account gets the same answer and a verification link to create an account.
- **Next:**
  - [`use_case_view_quests`](quests.md#use_case_view_quests): see what the user has been working on.
  - [`use_case_new_quest`](quests.md#use_case_new_quest): start learning something new.
  - [`use_case_return_signed_in`](access.md#use_case_return_signed_in): come back another day without signing in again.
  - `use_case_sign_in_link_reused`: sign in on another device with the same link.
  - `use_case_sign_in_link_expired`: the user opens the link too late.

## use_case_sign_in_link_expired

The user opens a sign-in link more than 30 minutes after the site sent it.

- **Prerequisites:** `use_case_sign_in_by_link`, with the email's link opened more than 30 minutes after it was sent.
- **Steps:**
  - The user opens the link from the email.
  - The page says the link has expired, with a link to the sign-in page to ask for a new one.
- **Outcome:** the user is still signed out in that browser: every other page shows the sign-in page. Asking for a new link on the sign-in page sends a fresh one that signs them in.
- **Next:**
  - `use_case_sign_in_by_link`: ask for a new link.

## use_case_sign_in_link_reused

The user follows the same sign-in link more than once within its 30 minutes.

- **Prerequisites:** `use_case_sign_in_by_link`, less than 30 minutes after the link was sent.
- **Steps:**
  - The user opens the same link again, in another browser or on another device, or in the same browser after signing out.
  - The user continues, as the first time.
- **Outcome:** the user is signed in there too, for 30 days, and the browser the user signed in on first stays signed in. The link keeps working for any number of sign-ins until 30 minutes after it was sent, unless the user signs out everywhere first.
- **Next:**
  - `use_case_sign_in_link_expired`: the user tries the link again after 30 minutes.
  - `use_case_sign_out_everywhere`: the user shouldn't have signed in on a shared computer.

## use_case_too_many_sign_in_requests

The user, or someone else, asks for many sign-in emails in a short time.

- **Prerequisites:** [`use_case_visit_signed_out`](access.md#use_case_visit_signed_out).
- **Steps:**
  - The user asks for sign-in links for the same address again and again, on the sign-in page; or someone on another connection asks for links to their address; or many addresses are asked for from the same connection.
  - Each time, the site tells them to check their email.
- **Outcome:** the answer on the page never changes, so it reveals neither the limits nor whether an account exists. Past a limit, no email is sent until that limit's wait has passed:
  - From one connection, at most 3 emails to one address in 15 minutes. Someone else asking for their address uses up only their own connection's emails, so theirs still arrive.
  - To one address, at most 10 emails in 15 minutes from every connection together, counting only requests within the other two limits. Many connections together can still fill this limit, and then no email reaches their address until the wait has passed.
  - From one connection, at most 20 requests in an hour, for any addresses.

  After the wait, asking again sends an email as usual, and the links sent before the limit still work for their 30 minutes.
- **Next:**
  - `use_case_sign_in_by_link`: ask again after the wait.

## use_case_private_data

Two users each see only their own quests, conversations, Plan, Ideas, Progress and private definitions.

- **Prerequisites:** two signed-in accounts, each with a quest.
- **Steps:** the second user tries to open and change the first user's quest, conversation, Plan, Ideas, milestones, construct and spell, including by using their addresses directly.
- **Outcome:** foreign data looks exactly like missing data. Reads reveal nothing and writes change nothing. Lists and choices include only accessible definitions and the user's own quests.
- **Next:** [`use_case_view_quests`](quests.md#use_case_view_quests).

## use_case_set_name

The user tells the construct what to call them, so a construct that says `{{name}}` uses their name.

- **Prerequisites:** `use_case_sign_in_by_link`.
- **Steps:**
  - On Settings, under Profile, under "Your name", the user types their name, such as "Mabel", and saves.
  - The page says it is saved, and the field shows their name, also after a reload.
  - The user starts a quest with a construct of their own whose voice says `Hi {{name}}` ([`use_case_edit_construct`](constructs.md#use_case_edit_construct)).
- **Outcome:** their name is saved trimmed. Spell reply templates replace `{{name}}` with that acting user’s name, or "the user" when unset. Another user’s saved name is never used. The field’s hint explains the placeholder.
- **Variations:**
  - The user empties the field and saves: the form requires a name and keeps the previous saved name.
  - A name with a line break, over 60 characters, or with `{` or `}` is refused: the field says why, keeps what the user typed, and nothing is saved.
  - Signed out, the page shows the sign-in page and nothing is saved.
- **Next:**
  - [`use_case_edit_construct`](constructs.md#use_case_edit_construct): put `{{name}}` in a construct of theirs.

## use_case_sign_out

The user signs out of the browser the user is using.

- **Prerequisites:** `use_case_sign_in_by_link`.
- **Steps:**
  - On Settings, the user chooses Sign out.
  - The site shows the sign-in page.
- **Outcome:** every page in this browser shows the sign-in page until the user signs in again. Their other browsers and devices stay signed in. A sign-in link from the last 30 minutes still signs them in.
- **Next:**
  - `use_case_sign_in_by_link`: sign in again.
  - `use_case_sign_out_everywhere`: the user wants every device signed out.

## use_case_sign_out_everywhere

The user signs out of every browser and device at once, for example after signing in on a shared computer.

- **Prerequisites:** `use_case_sign_in_by_link`, in two browsers.
- **Steps:**
  - On Settings in one browser, the user chooses Sign out everywhere.
  - The site asks them to confirm. The user confirms.
  - The site shows the sign-in page.
  - In the other browser, the user opens a page.
- **Outcome:** this browser and every other one are signed out: the other browser shows the sign-in page at its next page, and a conversation left open there says the user has been signed out when the user next sends a message ([`use_case_session_expired_in_chat`](access.md#use_case_session_expired_in_chat)). Every sign-in link sent before no longer signs them in, even within its 30 minutes. If the user cancels instead of confirming, nothing changes and the user stays signed in everywhere. A new link signs them in as usual.
- **Next:**
  - `use_case_sign_in_by_link`: sign in again where the user wants to be.

Signup through Login asks for Name after the emailed verification link is opened. A name is required, trimmed, at most 60 characters, one line, and contains no braces. Invalid or blank names create no account and leave verification available for correction. Existing accounts continue signing in without a name field and keep their saved name. Settings refuses to clear a saved name.
