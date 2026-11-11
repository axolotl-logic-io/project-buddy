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

## Physical cleanup in 0053

The draft depends on #898 merging into `integration`. Migration
`0053_remove_retired_storage` drops only `chat_unreads`, `project_members`,
`project_invitations`, `push_subscriptions`, `quest_transfers`, `orb_balances`,
`orb_ledger` and `marketplace_cutover`. These tables have no remaining runtime
readers or writers after the simplification release. Account setup invitations
(`invitations` and `active_invitations`) stay.

Before the drops, the migration removes the `user_starting_orbs` trigger and
`grant_new_user_orbs` function. Account inserts then stop granting the retired
currency. Batteries still use `gold_balances` and `gold_ledger`. The purchase
guard becomes an unconditional rejection, preserving the pause on new purchases
without querying `marketplace_cutover`. Historical purchase rows remain unchanged.
The drops use PostgreSQL's default dependency restriction, so an unexpected
schema dependency fails the migration instead of being removed by cascade.

Listings and purchases stay together: `purchases.listing_id` references listings
with a delete cascade. Construct asset grants also reference listings; the same
asset can belong to a private definition and a continuing conversation. This
cleanup releases no listing grants, deletes no artwork bytes and rewrites no
private prompt or conversation snapshots. Retiring those records requires a
separate audit of purchase history and asset ownership.

The rollback floor is the simplification build released by #926, with #898's
approved legacy conversation deletion already applied. Restoring an older build
that uses sharing, notifications, transfers or orbs is unsupported. Restoring code
cannot restore deleted rows. Root confirms the live prerequisite and owns release
and merge decisions; this draft does not authorize either operation.

## Generated SQL audit

The audit used Drizzle's installed SQL generator (`drizzle.mock()` and `toSQL()`),
including omitted values, bare `returning()` and `getTableColumns`, rather than
searching only for property reads. No database connection was used for this audit.

| Retained columns | Generated references in the simplification build | Further prerequisite |
| --- | --- | --- |
| `users.hidden_extras` | Account `INSERT` names every schema column, including omitted defaults; bare account selects and `RETURNING` include it. | Release a schema mapping that omits the column before physical deletion. |
| `buddies.bought_from` | Own prompt `INSERT` and bare `RETURNING` include it even when the new copy does not set it. | Release a schema mapping that omits it; preserve historical bought copies and purchase history. |
| `chats.name`, `chats.renamed_by_hand` | Continuing conversation `INSERT` names both; `chatColumnsFor()` spreads `getTableColumns(chats)`. | Release a mapping and readers that omit both before deletion. |
| `projects.check_in_frequency`, `projects.last_check_in_at` | Quest `INSERT` includes both even though its `RETURNING` selects only the id. | Release a schema mapping that omits both before deletion. |

All these columns stay in 0053. No compatibility preparation PR or runtime rewrite
is needed for the eight-table cleanup. A later column cleanup needs a code-only
compatibility release first; changing the schema mapping and dropping columns in
the same release would still break the live build during migration.

## Local validation

`retired-storage-migration.server.test.ts` builds an isolated database at 0051,
seeds accepted membership/invitation records and continuing data, applies 0052,
then tests 0053. It compares complete retained account, battery ledger, purchase,
listing, artwork, grant and approval rows across cleanup, and compares owned
Journal, Plan, Progress, conversation, image and private prompt reads. Real owner
predicates deny the former member before and after the transition, while their
historical message authorship stays. Another test migrates from scratch and
inserts an account through the current ORM mapping.

Current-schema tests retain their cross-user access assertions but no longer
insert into retired sharing tables. Historical membership transition coverage
lives in the migration test. The orb rollout test stops at 0048; the legacy
conversation deletion test stops at 0052, preserving each migration's assertions
before later authorized table deletion.
