# Multi-user quests

Draft specification. Multi-user quests let people work in the same quest conversation and Plan. One owner invites people, and accepted members have the owner's powers except deleting the quest and removing the owner.

The [planned glossary terms](../GLOSSARY.md#multi-user-quests-planned) define the language below. The current product remains owner-only; this specification describes its proposed replacement.

## Quest membership

The user who creates a quest is its owner. The quest has one continuing conversation, one construct and a shared Plan. Each user message keeps its author, regardless of who reads or continues the conversation.

An invitation belongs to one user and one quest. The invited user becomes a member when they accept that invitation. Accepting one quest never accepts their other quest invitations.

## Permissions

Members have all the owner's quest powers with two exceptions:

| Action | Owner | Member |
| --- | --- | --- |
| Read and contribute to the conversation | Yes | Yes |
| Change Plan, Ideas, progress and Quick Notes | Yes | Yes |
| Cast and stop spells | Yes | Yes |
| Rename the quest | Yes | Yes |
| Mark the quest Completed, Abandoned or Active | Yes | Yes |
| Invite people | Yes | Yes |
| Remove another member | Yes | Yes |
| Remove the owner | No | No |
| Delete the quest | Yes | No |

The same permissions apply through commands, direct controls and construct tools. Current owner-only status approval rules must be adapted so members can also change quest status.

Quest membership does not grant access to another user's private constructs, spells or other quests. A conversation continues to use its saved construct snapshot.

## Accounts created by invitations

Inviting a person who has no account creates their account immediately, using the invited email address. The site must distinguish an invited account from an account whose user has completed sign-up.

An invitation to an existing account uses that account. Inviting the same person to another quest does not create another account. Completing sign-up preserves the invited account and its invitations.

Account state and quest invitation acceptance are separate. An invited account can have invitations to several quests. An existing signed-up user can also have pending quest invitations.

## Pending tab

The Quests page gains a **Pending** tab alongside Active, Completed and Abandoned. It lists quests the acting user has been invited to but has not accepted.

Pending is specific to the invited user. It does not change the quest's status for its owner or accepted members. Accepting the invitation removes the quest from that user's Pending tab and makes it available under its quest status.

The Pending tab must provide a way to accept an invitation without finding its original invitation link. Accepting there affects only the selected quest.

## Invitation links

Following an invitation's acceptance link accepts that quest invitation. This behavior applies whether the account was created by this invitation or already existed. The link does not accept other pending quest invitations.

For example, Morgan is invited to quest A and quest B. The first invitation creates Morgan's account; the second uses the same account. Following quest A's acceptance link accepts quest A. Quest B remains in Pending until Morgan accepts it separately.

## Acceptance criteria

- Inviting a new email address creates an account before the recipient follows the invitation link.
- The site can distinguish an invited account from one whose user has completed sign-up.
- Inviting an existing user preserves their account and completed sign-up state.
- Invitations to multiple quests use the same account.
- Each unaccepted quest appears in the invited user's Pending tab.
- Following one invitation's acceptance link accepts only its quest.
- Accepting one quest from Pending leaves other invitations pending.
- An accepted member can invite people, remove another member, rename the quest and change its status.
- A member cannot remove the owner or delete the quest, including through a direct request.
- Contributions to the shared conversation retain their individual authors.

## Open decisions

- **Sign-up completion:** which action changes an invited account to a signed-up account, and how invitation acceptance interacts with sign-in.
- **Invitation identity:** how links verify the invited user, behave in a browser signed in as someone else, expire and respond to reuse or revocation.
- **Pending controls:** what information Pending shows before acceptance, and whether it offers decline as well as acceptance.
- **Earlier contents:** whether acceptance opens the full existing conversation, saved images and other quest contents.
- **Removal and departure:** how members leave, what happens to pending invitations on removal, and how prior contributions and active replies are preserved.
- **Concurrent work:** how simultaneous messages, spell changes, Plan edits, replies and Undo interact across members.
- **Personal features:** whether Dailies can have members and how shared quests affect Current quest and Quick Note choices.
- **Quest deletion:** confirmation, effects on members and pending invitations, and the relationship to owner account deletion.

## Implementation boundaries

Quest access currently comes from the predicates in `apps/web/src/accounts/owner-scope.ts`. Implementation must distinguish ownership, accepted membership and pending invitations in this central access policy. Pending invitations must not accidentally grant the full powers of accepted membership.

Account state and invitation acceptance need separate persisted representations. Existing accounts and quests retain their current behavior until explicitly invited or shared. Schema changes must follow the compatible migration rules in [Project practices](project-practices.md#site-data).

Implementation must update the current glossary definitions and affected product docs together. Real-database tests must cover owner, member, pending invitee, removed member and unrelated user access. Browser tests must cover Pending and acceptance feedback, including phone and keyboard use. These cases belong in the existing [test levels](project-practices.md#tests); this draft does not add implemented use cases.
