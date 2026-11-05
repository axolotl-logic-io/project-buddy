# Quest invitations

A quest's owner invites someone to work on the quest with them. The invitee joins or declines. Joining makes them a member of the quest, who shares its adventures, Journal, Quick Notes and progress timeline. Members and what they can do are described in [Team quests](team-projects.md).

## Who can be invited

The owner invites an email address. A quest invitation never makes an account; sign-up stays with the admins' [invitations](../GLOSSARY.md#invitation-setup-link).

- **An address with an account:** the site saves the invitation for that account and emails it.
- **An address with no account:** the site saves the invitation by the normalized address alone, with no account, and sends no email. No one can see or answer it while no account has that address. If an admin's invitation later makes an account with that address, through `/setup`, the invitation shows on that user's Quests page, where they can join or decline it.

The site never shows the owner which addresses have accounts, since anyone can make a quest and so use the form. Like sign-in, the form gives every valid address the same answer: "If ADDRESS has a Project Buddy account, we've sent them a quest invitation." Both kinds of address count the same against the [send limits](#send-limits), and inviting either again within the minute is refused the same way. The invitation is saved before the response for either kind of address. Email delivery runs after the response. The pending invitations then list both kinds the same way, by address, and both are revoked the same way.

The owner's own address, and the address of someone who is already a member, are refused with a message saying so. The owner can already see both on the quest's page, so the refusal reveals nothing new.

## Invite someone

The quest's page shows the owner an Invite someone section, with an email field and the pending invitations. Members don't see it. Each pending invitation has Revoke, which takes it back.

Inviting the same address again replaces the pending invitation, whether it was saved for an account or by address. Its earlier email link then opens a page that isn't found.

## Send limits

Each owner can send 20 quest invitations an hour, and each address gets at most one a minute, from anyone. Every attempt to an address counts the same, whether or not it has an account. These limits count apart from the admins' invitation limits and from sign-in requests. The invitation is saved before its email is sent. An email that fails to send is logged and frees its place, so the owner can try again at once; the invitation stays pending and waits on the invitee's Quests page, as one to an address with no account does. The form can't say that it failed, because it has already answered.

## Join or decline

The invitation email names the inviter and the quest. Their users wrote both, and the site sends the email under its own name, so the email shows each one quoted, on one line and cut to 60 characters with an ellipsis. A new quest's name has at most 80 characters, but quests named before that limit can have longer names, so the email still cuts them. Anything that looks like a web address in them is written with its dots and `://` in brackets, such as `evil[.]example`, so mail programs don't make it a link. Its link is a normal [sign-in link](../GLOSSARY.md#sign-in-link) that, once the invitee continues, opens the invitation's page at `/projects/invitations/TOKEN`, where `TOKEN` is the invitation's own token. The page asks "Join PROJECT?" with Join and Decline. Opening it answers nothing, so a mail program that checks the link changes nothing.

The sign-in link works for 30 minutes. The invitation itself doesn't expire: it waits on the invitee's Quests page, under Quest invitations, until they answer it or the owner revokes it.

Only the invitee can see or answer an invitation. For an invitation saved for an account, that is the account. For one saved by address, it is whichever account has that normalized address when the invitation is read or answered, so no one can claim it by its id. For anyone else, including the quest's owner, its page and its Join and Decline are not found, the same as for an invitation that doesn't exist. An invitation saved by address has no email link, so it opens only from the Quests page.

## Storage

The `project_invitations` table holds one row per invitation: the quest, the invitee, the inviter, the SHA-256 of the email link's token, when it was sent, and its state: `pending`, `accepted`, `declined` or `revoked`. A row names its invitee in exactly one of two columns: `invitee_id` for an address with an account, or `invitee_email`, the normalized address, for one with none. A quest has at most one pending invitation per invitee and per address. Rows stay once answered, and go with their quest, the inviter or the invitee's account.

Migration 0027 only adds the table. Migration 0029 only relaxes and adds: it makes `invitee_id` nullable, and adds the nullable `invitee_email` column, its indexes, and a check that each row names exactly one invitee. The previous build keeps working on it: it writes only `invitee_id`, which the check allows, and doesn't list invitations saved by address while it is still live.

The access rules are the `projectInvitationOwnedBy` and `projectInvitationTo` predicates in `src/accounts/owner-scope.ts`.
