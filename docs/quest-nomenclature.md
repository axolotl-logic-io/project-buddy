# Quest nomenclature

The application and code use **quest** for a user’s goal and its conversation, Plan and progress. See the [glossary](../GLOSSARY.md#quest).

Quest domain modules live in `apps/web/src/quests/`. Types use `Quest`, `QuestId` and `QuestName`; fields use `questId`; routes use `/quests`; storage uses `quests` and `quest_id`. The construct’s tool is `create_quest`, and Break Down a Project retains `project-breakdown`.

The nomenclature migration renames existing tables and columns without deleting quest data. It converts structured message keys, saved tool names and executable prompt references. The later Plan-only migration removes Journal storage and its obsolete message parts. Earlier migration files retain the names of the schema they created.

The product name remains **Project Buddy**. Build-tool projects, hosting projects and creative projects retain their ordinary meanings.

## Construct names

Own definitions share `own_prompts`, with kind `construct`, `activity` or `spell`. Conversation columns use `construct_id`, `construct_name` and `construct_parts`; the saved user preference uses `interview_construct_id`. The construct migrations transfer existing IDs, ownership, snapshots, artwork references and purchase provenance. Browser drafts use the current construct-kind key. New copies store current prompt wording. `CONSTRUCT_MODEL` is the sole model setting.

## Release cutover

This is a coordinated schema cutover, not an additive migration. The old build cannot read the renamed tables and columns. The normal release workflow migrates while that build is live, so this change must not use that sequence unchanged.

The production preflight on 2026-11-12 found migrations 0056 through 0059 already applied, with hashes matching this release. Both production connection settings address the same database. The release workflow therefore has no pending schema changes for this cutover and can deploy the matching build through the normal release sequence.

For a database that still has the earlier schema, stop application traffic and drain existing requests before applying these migrations, then deploy the matching build before resuming traffic. A rollback must restore the matching database and build together; a Vercel code-only rollback is insufficient. Do not run old and new builds against the renamed schema together.
