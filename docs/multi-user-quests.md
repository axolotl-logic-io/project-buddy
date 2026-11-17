# Multi-user quests

Multi-user quests let people work in one quest together. Its owner, or anyone already in it, invites people by email. Everyone who accepts shares the quest's one conversation, Tasks, Ideas, Progress and Quick Notes, with one construct. Each user message keeps its author.

The [glossary](../GLOSSARY.md#multi-user-quests) defines the terms this page uses.

## Quest membership

The user who creates a quest is its **owner**. A user who accepts an invitation to it becomes a **member**. The quest is open to its owner and its members, and to no one else.

A **quest invitation** belongs to one user and one quest. It stays pending until its invitee accepts or declines it, or someone in the quest withdraws it. Accepting one invitation never accepts another.

```text
            invite by email                accept (link or Pending)
 someone ───────────────────► pending ────────────────────────────► member
 in the quest                 invitation                              │
                                 │  decline / withdraw                │ remove / leave
                                 ▼                                    ▼
                               gone                          no access; their
                                                             messages stay
```

## Permissions

Members have every power the owner has, except removing the owner and, once the site has it, deleting the quest:

| Action | Owner | Member | Pending invitee |
| --- | --- | --- | --- |
| Read and contribute to the conversation | Yes | Yes | No |
| Change Tasks, Ideas, Progress and Quick Notes | Yes | Yes | No |
| Cast and stop spells, stop a reply | Yes | Yes | No |
| Rename the quest | Yes | Yes | No |
| Mark it Completed, Abandoned or Active, or answer a status card | Yes | Yes | No |
| Invite people, withdraw an invitation | Yes | Yes | No |
| Remove another member | Yes | Yes | No |
| Leave the quest | — | Yes | — |
| Remove the owner | No | No | No |
| Delete the quest (not in the site yet) | Owner only, once it exists | No | No |
| See the quest's name and inviter in Pending | — | — | Yes |

The same rules hold for commands such as `/complete`, direct controls, construct tools and saved images. The site enforces them on the server, in one access policy (`apps/web/src/accounts/owner-scope.ts`). A quest that is not open to the acting user reads as not found, exactly as an unknown quest does.

The site has no quest deletion today. When it gains one, deletion must use the owner-only predicate `questOwnedBy`, never `questOpenTo`.

Membership opens only that quest. It gives no access to another member's own spells, historical construct records or other quests. A conversation keeps the construct snapshot saved when it started, and an active spell keeps its cast snapshot, so members see those snapshots and never the private definitions.

## Accounts created by invitations

Inviting an address that has no account creates its account at once, before anyone opens the email. The account is **invited** until its user completes sign-up. Every other account is **signed up**. The `users.account_state` column records this.

Inviting an address that already has an account uses that account and changes nothing about it. A second invitation to the same address, to another quest, uses the same account.

Account state is separate from each quest invitation. An invited account can have pending invitations to several quests, and so can a signed-up user.

## Sign-up completion

An invited account completes sign-up the first time its user continues from any emailed link and gives a name. The link can be a quest invitation's acceptance link or an ordinary sign-in link. The name follows the same rules as sign-up: required, trimmed, one line, at most 60 characters and no braces.

This choice keeps one rule for every new account: an emailed link proves the address, and the name finishes the account. An invited account therefore never has a session without a name.

For example, Morgan invites `sam@example.com`, who has no account. The site creates Sam's invited account. Sam later asks for a sign-in link on Log in instead of opening the invitation. The link page asks Sam for a name; continuing completes sign-up and opens Quests, where the invitation waits in Pending.

## Pending tab

The Quests page lists pending invitations in a **Pending** tab after Active, Completed and Abandoned. Each row shows the quest's name, who invited the user and when. Nothing else of the quest is visible before acceptance.

Each row offers **Accept** and **Decline**. On a phone they sit on their own line beneath the quest's name, so the name keeps its width. Accepting joins only that quest; the status line names the tab it now appears in, such as Active, and links to it. Declining deletes the invitation without opening the quest. Other invitations stay in Pending either way.

An invitation withdrawn, or answered in another tab, meanwhile fails with a short alert. Its row leaves the list, and the tab's count drops, without a reload. The Pending tab's accessible name includes the count, such as "Pending, 2 invitations". The tab list is named "Quests", since Pending is not a status.

Pending belongs to the invitee. It is not a quest status, so it changes nothing for the owner or members. A user with no quests and at least one invitation sees Pending first.

## Invitation links

Each invitation email holds an **acceptance link**. Opening it shows the quest's name and who invited the user, and changes nothing, so a mail scanner that opens it accepts nothing. Choosing Continue does three things at once:

1. It signs the browser in as the invited account.
2. It completes sign-up for an invited account, with the name the user gives.
3. It accepts that one quest invitation and opens the quest.

The link works for an invited account and for an existing user alike. It never accepts the user's other invitations.

For example, Morgan invites Sam to quest A, and Rae invites Sam to quest B. The first invitation creates Sam's account; the second uses it. Sam follows quest A's link, gives a name and lands in quest A. Quest B stays in Sam's Pending tab until Sam accepts it there or follows its own link.

### Link identity and lifetime

The emailed token proves control of the invited address, in the same way a sign-in link does. These rules apply:

- **Lifetime:** a link works for 7 days after it was sent, and only once. Accepting deletes the invitation, so its token stops working.
- **Sending again:** inviting a pending invitee again sends a fresh link and replaces the old one.
- **Withdrawal:** withdrawing or declining an invitation stops its link.
- **Sign out everywhere:** the user's pending invitation links stop working, but the invitations stay in Pending.
- **Another account in the browser:** the page says which address the invitation is for, and continuing signs the browser in as that account instead.
- **Expired or used links:** the page says the link no longer works, on one line, and on the next says that a still-pending invitation is under Pending in Quests. It can't tell which kind of link it was, so it names no quest and no account. A signed-out browser gets **Log in**; a signed-in one gets **Open Quests**. Log in never sends a new invitation.

## Members

A quest's sidebar has a **Members** disclosure. It lists the owner, members and pending invitations, then an **Invite by email** form. The disclosure works the same for the owner and for members.

A pending invitation is listed by the address it was sent to, never by the account's name, so inviting reveals nothing of an existing account. A member's name shows once they accept.

- **Remove** asks for confirmation, then ends that member's access.
- **Leave quest** asks for confirmation, then removes the acting member and opens Quests, whose status line names the quest they left and takes focus.
- **Withdraw** deletes a pending invitation at once.
- The owner has no Remove control, and the server refuses a request to remove them.
- In the sidebar's drawer, below 1024 px, the Remove and Leave questions open above the drawer and hold focus until answered.

Invitations are limited to 20 per inviter per hour, because each one emails an address the inviter chose. Only invitations that go out count: a request for a quest that isn't open to the inviter, or for someone already in the quest, doesn't. When no invitation goes out, the form keeps the address, and focus returns to it after every answer. If an email fails, the invitation stays pending and the form says to invite again to resend it.

The invitation email says "the quest", and names its owner when someone else invites. It lists what members share: the conversation, Tasks, Ideas, Progress and Quick Notes. When the invitation created the address's account, it says an account was set aside and stays unused unless they join.

## Earlier contents and authors

Accepting opens the whole quest as it is: the full conversation, saved images, Tasks with its history, Ideas, Progress and Quick Notes. Earlier messages keep their authors. The conversation shows "You" on the viewer's own messages and the author's name, or email without a name, on everyone else's.

## Removal and departure

Removing a member, or a member leaving, deletes only their membership. Their messages, Tasks changes, milestones and other contributions stay, with them as the author. A removed member sees the quest as not found, and anyone in the quest can invite them again.

If a reply to the removed member's message is still running, removal stops it and releases its claim. The message stays, and anyone left in the quest can ask for its reply again at once. Invitations the removed member sent stay pending, because they belong to the quest.

## Concurrent work

Members use the mechanisms that already keep one user's tabs consistent:

- **Messages and replies:** the conversation takes one reply at a time. While a reply runs, other members see that the construct is replying and can Stop it.
- **Tasks:** every change saves a numbered version, so two changes made at once are both kept, one after the other. Undo undoes a specific tasks change, whoever made it.
- **Status:** status changes check the revision shown on screen, so a stale control or card fails instead of overwriting a newer change.
- **Spells:** the active spell is the conversation's, so a member's cast or Stop applies to everyone.

## Personal features

- **Dailies:** Dailies stays its owner's alone and can't have members. Its Members disclosure says only that.
- **Shared marker:** wherever quests are listed or chosen, a multi-user quest carries a marker: **Shared** on the user's own quest with members, and **Shared by** its owner's name on a quest they joined. Active, Completed and Abandoned rows and the Continue card show it as a small tag; the Quick Note choice adds it in brackets. Personal quests carry none.
- **Current quest:** Quests offers the most recently active Active quest open to the user, whether they own it or are a member.
- **Quick Notes:** the Quick Note dialog offers every Active quest open to the user.
- **Status approval cards:** a card saves who asked for it, and anyone in the quest can confirm or decline it.

## Storage and compatibility

Migration `0067_multi_user_quests.sql` is additive:

- `users.account_state`, defaulting to `signed_up`, with a check that allows `invited` and `signed_up`.
- `quest_members`, one row per accepted member and quest.
- `quest_invitations`, one row per pending invitee and quest, with the acceptance link's token hash and expiry.

The previous build neither reads nor writes these, and every account it creates is signed up by default. If production rolls back to it, members temporarily lose access until the new build is live again; no data is lost.

## Tests

Real-database server tests cover owner, member, pending invitee, removed member and unrelated user access through every quest store. They also cover invitations, how pending invitees are shown, the invitation limit, the email's text, both acceptance paths, a reopened link, member powers, removal, the shared marker's data and the migration. Browser tests cover the Members disclosure and Pending, including keyboard use, the Remove and Leave questions inside the sidebar's drawer at 320 to 768 px, and phone widths of 320 and 390 px in both appearance modes.
