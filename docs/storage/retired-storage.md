# Retired storage cleanup

Issue #927 prepares physical storage cleanup after the simplification release.
Keep its pull request in draft until the release coordinator confirms #926 is
live. Do not merge physical deletion into the same release as its replacement.

## Migration sequence

The legacy conversation deletion in #898 owns migration 0052. Generate cleanup
metadata after that migration, coordinated with the release coordinator. Do not
include #898 in release #926.

## Retained compatibility

Keep accounts, batteries and their ledger, purchases, private prompt copies,
continuing conversations, quest Journal, Plan, Progress and status approvals.
Keep artwork bytes owned by private definitions or continuing conversations.

Audit generated inserts, returning clauses and select-all queries before removing
columns. In particular, `users.hidden_extras`, `buddies.bought_from` and
`chats.name` / `chats.renamed_by_hand` need compatibility evidence before removal.
A rollback restores code only; the oldest supported build must already tolerate
the removed schema.
