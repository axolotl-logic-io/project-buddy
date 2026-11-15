# Quest members

The conventions for these cases are in [the index](README.md#conventions). A quest's owner, or any member, invites people by email; everyone who accepts shares its conversation, Plan, Ideas, Progress and Quick Notes. The repository's `docs/multi-user-quests.md` describes the rules in full.

## use_case_invite_to_quest

The user invites someone to work on a quest with them.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest), as the quest's owner or a member.
- **Steps:**
  - In the quest's sidebar, the user opens Members.
  - Under Invite by email, they type an address and choose Invite.
- **Outcome:** the form says the invitation was sent, and Members lists the address as invited, not accepted yet: always the address, never an existing account's name. Focus returns to the address field. An email holding an acceptance link reaches the address. It invites them to "the quest", names the owner when a member invites, lists what everyone shares, and says when an account was set aside for the address. If the address had no account, it now has an invited account, before anyone opens the email. An address that already has an account keeps it, with its name and sign-up unchanged. Inviting the same address to another quest uses the same account. Inviting the owner or a member again changes nothing, says they are already in the quest and keeps the address in the field. Inviting a pending invitee again sends a fresh link. Pending invitees, removed members and other users can't invite anyone to the quest.
- **Variations:**
  - The address isn't one: the form says so, keeps it, and nothing is sent.
  - The user has sent 20 invitations in the last hour: the form says the limit is 20 an hour and keeps the address. Only invitations that went out count.
  - The email fails: the invitation stays pending and the form says to invite again to resend it.
  - The quest is Dailies: Members says only that Dailies is just for the user, with no list and no invitations.
- **Next:**
  - `use_case_join_quest_by_link`: the invitee follows the link.
  - `use_case_accept_pending_quest`: the invitee accepts from Quests.
  - `use_case_remove_quest_member`: the user changes their mind.

## use_case_join_quest_by_link

The invited person follows an invitation's acceptance link.

- **Prerequisites:** `use_case_invite_to_quest`, less than 7 days earlier.
- **Steps:**
  - The person opens the link from the email. The page names the quest and who invited them.
  - If their account was created by the invitation, they enter a name.
  - They choose Continue.
- **Outcome:** the browser is signed in as the invited account and the quest opens. Only that quest is accepted: any other invitation stays in Pending. An invited account has completed sign-up and keeps the name it gave; an existing user keeps theirs. Opening the link alone accepts nothing and signs no one in. The link works once: after acceptance, a fresh invitation, withdrawal or signing out everywhere, it says it no longer works, then, on its own line, that a still-pending invitation is under Pending in Quests. It names no quest. It offers Log in to a signed-out browser and Open Quests to a signed-in one.
- **Variations:**
  - The browser is signed in as someone else: the page says which address the invitation is for, and continuing signs the browser in as that account.
  - An invited account asks for an ordinary sign-in link instead: continuing from it asks for a name, completes sign-up and opens Quests, with the invitation still pending.
- **Next:**
  - [`use_case_send_message`](chats.md#use_case_send_message): join the conversation.
  - `use_case_accept_pending_quest`: accept another invitation.

## use_case_accept_pending_quest

The user accepts or declines a quest invitation from Quests.

- **Prerequisites:** `use_case_invite_to_quest`, with the user as the invitee, signed in.
- **Steps:**
  - On Quests, the user chooses the Pending tab, which lists each quest they are invited to with its name, who invited them and when.
  - They choose Accept, or Decline, on one quest.
- **Outcome:** after Accept, the status line says they joined and names the tab the quest now appears in, such as Active, with a link to open it; the quest opens with its whole conversation, Plan, Ideas, Progress and Quick Notes. After Decline, the invitation is gone and the quest stays closed to them. Either way, every other invitation stays in Pending. Before acceptance, Pending shows only the quest's name and inviter, and the quest's page can't be found. A user with no quests and an invitation sees Pending first. The Pending tab's name includes its count for screen readers, and the count drops as soon as an invitation is answered. Accept and Decline work with the keyboard and fit a 320 px phone screen, beneath the quest's name.
- **Variations:**
  - The invitation was withdrawn or answered elsewhere: the page says it is no longer available, and its row leaves Pending without a reload.
- **Next:**
  - [`use_case_open_quest`](quests.md#use_case_open_quest): work on the quest.

## use_case_quest_member_access

Everyone in a quest shares it; no one else sees it.

- **Prerequisites:** `use_case_accept_pending_quest` or `use_case_join_quest_by_link`.
- **Steps:** the owner, a member, a pending invitee, a removed member and another user each try to open the quest, read and send messages, see its images, change its Plan, Ideas, milestones and spell, and continue its conversation, including through direct addresses.
- **Outcome:** the owner and members read and change all of it, and see each user message with its author: "You" on their own messages and the author's name on everyone else's. A pending invitee, a removed member and another user see nothing, exactly as of a quest that doesn't exist, and change nothing. Membership never opens a member's own constructs, spells or other quests.
- **Next:**
  - `use_case_quest_member_powers`: manage the quest together.

## use_case_quest_member_powers

A member manages the quest as its owner does.

- **Prerequisites:** `use_case_quest_member_access`, as a member.
- **Steps:** the member renames the quest, marks it Completed, answers a status card someone else asked for, invites someone, and removes another member.
- **Outcome:** each change takes effect for everyone in the quest. No one, owner or member, can remove the owner, including by a direct request; the site has no way to delete a quest. Wherever quests are listed or chosen (Quests' tabs, Continue and the Quick Note choice), a multi-user quest is marked "Shared", or "Shared by" its owner's name for a member, so it can't be mistaken for a personal quest of the same name.
- **Next:**
  - `use_case_remove_quest_member`: someone leaves the quest.

## use_case_remove_quest_member

Someone in a quest removes a member or an invitation, or a member leaves.

- **Prerequisites:** `use_case_quest_member_access`.
- **Steps:**
  - In Members, the user chooses Remove beside a member and confirms; or Withdraw beside an invitation; or, as a member, Leave quest and confirms.
- **Outcome:** a removed member, or one who left, loses access to the quest at once; leaving opens Quests, where the status line names the quest they left and takes focus. On a phone or tablet the Remove and Leave questions open above the quest sidebar's drawer and hold focus until answered. Their messages and other contributions stay, with them as author. A reply their message was still waiting for stops, and anyone left in the quest can ask for it again at once. A withdrawn invitation disappears from the invitee's Pending, and its link stops working. Anyone in the quest can invite them again.
- **Next:**
  - `use_case_invite_to_quest`: invite them again.
