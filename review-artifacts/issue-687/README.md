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
