# Review evidence for #680 / PR #683

The screenshots show the running local app, using disposable data, the mock buddy and file outbox. They contain no sign-in links or tokens. Each linked index gives captions and the exact behavior commit. The later artifact commit packages evidence without changing product behavior.

| Change | Desktop and mobile evidence |
| --- | --- |
| Memory attribution, line breaks and edit | [Original captures](423830ce/README.md#memory-desktop) |
| Restore confirmation and completed result | [Supplemental captures](19fa8293/README.md#memory-confirm-mobile) |
| Purchased reset protection and deletion warning | [Bought controls and dialogs](423830ce/README.md#bought-controls-desktop) |
| Editor scope and headings | [Activity editor](423830ce/README.md#editor-desktop), [spell editor](19fa8293/README.md#spell-desktop) |
| Interview rerun in existing project | [Interview controls](423830ce/README.md#interview-controls-desktop) |
| Chat resumption, activity labels and phone header | [Today](423830ce/README.md#today-desktop), [project](423830ce/README.md#project-desktop), [chat](423830ce/README.md#retry-mobile) |
| Invitations, retained success and revoke confirmation | [Desktop](423830ce/README.md#invite-sent-desktop), [mobile](19fa8293/README.md#invite-sent-mobile) |
| Deletion destination feedback | [Destination notice](19fa8293/README.md#deleted-mobile) |
| Account identity and gold | [Account](423830ce/README.md#account-desktop) |
| Login and not-found orientation | [Login](19fa8293/README.md#login-desktop), [not found](19fa8293/README.md#not-found-desktop) |
| Unanswered/error reply orientation and retry cost | [Retry state](423830ce/README.md#retry-desktop) |
| Prospective-buyer disclosure | [Marketplace](19fa8293/README.md#marketplace-desktop) |

The images show states, not every interaction. Actual retry with the same message ID, invitation refresh/resend/revoke/focus and memory rendering were verified in the final review/recheck and automated checks. The generic application error boundary copy is covered by checks, not a forced server-failure screenshot. Generic deletion notices can persist on reload; that minor limitation was accepted in the final domain review. No screen-reader, touch or zoom result is claimed.

Validation: fast check 26 files / 157 tests; full integration 132 files / 1353 tests; final-copy focused browser checks 4 files / 30 tests; full server 88 files / 430 tests; auth 13 / 13; auth production build and fonts passed. No broad suite was repeated for this artifact-only commit. Earlier failed attempts and their repairs remain recorded in issue #680.
