# Issue 687 review evidence

Screenshots from the local app (dev server, mock buddy, local test database, seeded `reviewer-*@example.test` accounts), taken with headless Chromium at 1280×900 (desktop) and 390×844 at 2× (mobile). Next's dev indicator is hidden in the captures. They show state after an interaction where the caption says so; no session data is included.

## D1 fixes, behavior SHA `8659ecc24ad9ed5033079a384f74604a396526df`

| File | Caption |
| --- | --- |
| `d1/d1-01-member-memory-history-desktop.png` | Member Mika's view of a team project's memory history: Version 1 "by Ola" (the owner), Version 2 "by you", Version 3 "by the buddy". |
| `d1/d1-01-owner-memory-history-mobile.png` | Owner Ola's view of the same history on a phone: Version 2 "by Mika", Version 1 "by you". |
| `d1/d1-02-listing-access-copy-desktop.png` | A listing seen by another user: bought instructions reach only what the buyer can open, including team projects they're in. |
| `d1/d1-02-listing-access-copy-mobile.png` | The same listing on a phone. |
| `d1/d1-03-buddies-delete-desktop.png` | Member's buddies: a bought buddy offers Tweak, Clone and Delete. |
| `d1/d1-03-bought-buddy-delete-dialog-desktop.png` | After choosing Delete on the bought buddy: the dialog says what deleting changes and that no gold comes back. |
| `d1/d1-03-bought-buddy-delete-dialog-mobile.png` | The same dialog on a phone. |

## D2 fixes, behavior SHA `4cca7d60131e37a155ec26ae5f0bc8e75375f2fb`

Seeded data: owner Ola lists the buddy "Garden guide" (2 gold) and the activity "Seed swap" (free); member Mika got a copy of each.

| File | Caption |
| --- | --- |
| `d2/d2-01-listed-buddy-delete-dialog-desktop.png` | After choosing Delete on Ola's listed buddy: the dialog says the listing stays up, buyers keep their copies and the listing can then only be unlisted, with a link to the listing. |
| `d2/d2-01-listed-buddy-delete-dialog-mobile.png` | The same dialog on a phone. |
| `d2/d2-01-listed-activity-delete-dialog-desktop.png` | After choosing Delete on Ola's listed free activity: the same listing note for an activity. |
| `d2/d2-02-free-copy-delete-dialog-desktop.png` | After choosing Delete on Mika's copy of the free activity: no gold comes back, and while the listing is up it can be got again at the listing's price then (no charge warning). |
| `d2/d2-02-free-copy-delete-dialog-mobile.png` | The same dialog on a phone. |
| `d2/d2-03-member-reply-error-desktop.png` | After Mika sends `/mock-error authentication_error` in a team project chat: the reply error says the buddy is unavailable until the site's owner fixes its setup, naming no setting or key. |
| `d2/d2-03-member-reply-error-mobile.png` | The same error on a phone (a second message in the same chat). |

## U1 fixes, behavior SHA `f0f1bd5e54dc0df2dde5bf4463edb2420c9de218`

Taken as Ola on the dev server. "Narrow" is 320×700 at 2×. Each caption names the interaction before the capture.

| File | Caption |
| --- | --- |
| `u1/u1-01-reset-unsaved-with-undo-desktop.png` | After choosing Reset prompt to default on Ola's buddy "Garden guide" (cloned from Mr. Tee): the editor holds Mr. Tee's prompt, nothing is saved, and the page says "Save to keep it" beside Undo reset. |
| `u1/u1-01-reset-unsaved-with-undo-mobile.png` | The same on a phone. |
| `u1/u1-02-blank-name-refused-desktop.png` | After typing a name of only spaces and choosing Save: the name field is marked invalid and says "Give the buddy a name.", with focus, and the prompt is unchanged. Nothing was sent. |
| `u1/u1-02-blank-name-refused-mobile.png` | The same on a phone. |
| `u1/u1-03-buddy-draft-restored-desktop.png` | After editing the prompt, leaving by the Buddies link and opening the buddy again: the edit is back, with "Your unsaved changes from before are back" and Discard changes. |
| `u1/u1-03-buddy-draft-restored-mobile.png` | The same on a phone. |
| `u1/u1-03-chat-draft-kept-desktop.png` | After typing a message in a chat, opening Quick Note and coming back: the unsent message is still in the box. |
| `u1/u1-03-chat-draft-kept-mobile.png` | The same on a phone. |
| `u1/u1-04-long-name-project-narrow.png` | State: a project named with one 80-character word at 320 px. The heading breaks inside the word; the page is 320 px wide (it was 1052 px in U1). |
| `u1/u1-04-long-name-project-mobile.png` | The same project at 390 px. |
| `u1/u1-04-long-name-project-desktop.png` | The same project at 1280 px. |
| `u1/u1-04-long-name-memory-narrow.png` | State: that project's memory page at 320 px. The back link breaks inside the name; the page is 320 px wide (it was 500 px in U1). |
| `u1/u1-04-long-name-memory-mobile.png` | The same memory page at 390 px. |
| `u1/u1-05-reopened-no-reply-desktop.png` | After sending `/mock-error overloaded_error`, closing the page and opening the chat again: the message is last, with "Hippy hasn't replied to the last message…" and Retry reply. |
| `u1/u1-05-reopened-no-reply-mobile.png` | The same reopened chat on a phone. |
