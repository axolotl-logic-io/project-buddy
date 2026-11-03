# Project invitations

A project's owner invites someone to work on the project with them. The invitee joins or declines. Joining makes them a member of the project, who shares its chats, memory, notes and progress timeline. Members and what they can do are described in [Team projects](team-projects.md).

## Who can be invited

Only someone who already has a Project Buddy account can be invited. An address with no account is refused with "ADDRESS has no Project Buddy account. Ask an admin to invite them first." The site then saves nothing, sends no email and makes no account. Sign-up stays with the admins' [invitations](../GLOSSARY.md#invitation-setup-link).

The owner's own address, and the address of someone who is already a member, are refused too.

## Invite someone

The project's page shows the owner an Invite someone section, with an email field and the pending invitations. Members don't see it. Each pending invitation has Revoke, which takes it back.

Inviting the same person again replaces the pending invitation. Its earlier email link then opens a page that isn't found.

## Send limits

Each owner can send 20 project invitations an hour, and each address gets at most one a minute, from anyone. Every attempt to an address counts, including one refused because the address has no account, so nobody can check many addresses quickly. These limits count apart from the admins' invitation limits and from sign-in requests. A send that fails frees its place, so the owner can try again at once.

## Join or decline

The invitation email names the inviter and the project. Their users wrote both, and the site sends the email under its own name, so the email shows each one quoted, on one line and cut to 60 characters with an ellipsis. Anything that looks like a web address in them is written with its dots and `://` in brackets, such as `evil[.]example`, so mail programs don't make it a link. Its link is a normal [sign-in link](../GLOSSARY.md#sign-in-link) that, once the invitee continues, opens the invitation's page at `/projects/invitations/TOKEN`, where `TOKEN` is the invitation's own token. The page asks "Join PROJECT?" with Join and Decline. Opening it answers nothing, so a mail program that checks the link changes nothing.

The sign-in link works for 30 minutes. The invitation itself doesn't expire: it waits on the invitee's Projects page, under Project invitations, until they answer it or the owner revokes it.

Only the invitee can see or answer an invitation. For anyone else, including the project's owner, its page and its Join and Decline are not found, the same as for an invitation that doesn't exist.

## Storage

The `project_invitations` table holds one row per invitation: the project, the invitee, the inviter, the SHA-256 of the email link's token, when it was sent, and its state: `pending`, `accepted`, `declined` or `revoked`. A project has at most one pending invitation per invitee. Rows stay once answered, and go with their project or either user. Its migration only adds the table.

The access rules are the `projectInvitationOwnedBy` and `projectInvitationTo` predicates in `src/accounts/owner-scope.ts`.
