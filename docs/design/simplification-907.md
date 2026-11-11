# Personal quests only (#907)

This page records what issue #907 removes: team quests, quest members and quest invitations. Every quest belongs to its owner alone. It builds on the quest workspace (#893, PR #896).

## What the user gets

- A quest is open only to its owner. Its conversation, Journal, Plan, Progress and Quick Notes read and write only for the user who made it.
- A historical `project_members` row or an old quest invitation address grants nothing: another user reads the quest as not found.
- Account invitations from an admin, account setup, sign-in and sign-out are unchanged.

## Removed

- Quest invitations: the Invite someone form, pending invitations and Revoke on the quest page, the Quest invitations list, the `/projects/invitations/[token]` page, Join and Decline, the invitation email and its send limits for quest invitations.
- Members: the Members section, Remove and Leave quest, and the "Shared" and "Shared with you" marks on quest lists.
- Team access branches: `projectOpenTo` and the other "open to" predicates in `owner-scope.ts` no longer read `project_members`; every quest predicate is an "owned by" predicate. The member-only predicates (`membershipOf`, `projectJoinableBy`, `projectMember*`, `projectInvitation*`) go.
- Stores and tests for members and invitations: `projects/members-store.ts`, `projects/project-invitations.ts`, their actions, components, copy, use cases and tests.

## Kept

- Access checks. Each store still builds its `where` from `owner-scope.ts`; real-database tests now show that a former member, or the holder of an old invitation, reads not found.
- Per-message authorship and saved Journal authors, so historical messages still name who wrote them.

## Retained compatibility

The `project_members` and `project_invitations` tables and their columns stay, unread and unwritten, because the build that is live when this ships still reads them. Dropping them is a separate, held cleanup that follows once this build is live, coordinated with the other schema cleanups.
