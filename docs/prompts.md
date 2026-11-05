# Prompts

A construct, activity or spell has a prompt. The editor for an own construct shows one prompt describing its voice and habits. Headings can organize those instructions without making them separate fields. Built-in definitions are read-only; Customize makes an editable copy.

An activity has a prompt and a separate opening request. The prompt guides the current activity session. The opening request asks for the first reply when no prepared opening exists. Reset restores the activity prompt while preserving its opening request.

A spell has a prompt, shown as Instructions, and separate name and when-to-use metadata. The model sees selection metadata before casting. Casting delivers the instructions through the tool result. Reset restores instructions while preserving the name and when-to-use description.

Reset changes the editor draft and offers Undo reset; only Save stores it. Unsaved names, opening requests and when-to-use descriptions are preserved. Bought copies and clones of bought copies have no built-in source and cannot be reset, including through a direct request. They remain editable. For other copies, reset restores the prompt from the built-in source when there is one. Otherwise a construct uses the default construct's prompt, an activity uses the open chat's prompt, and a spell uses its starter instructions. Renaming and resetting never alter existing chat snapshots or past casts. A copy that still matches a built-in definition retains its prepared opening.

## Workshop

Construct, activity and spell detail pages share the Workshop. The existing save, reset, Customize, delete and Marketplace actions remain available. Choose an example test case or write a message beside the definition. Tests use the latest draft without requiring a save. A follow-up keeps the test's version; changing the draft or companion settings marks the result as out of date and starts a fresh conversation on the next test. A new test or selected example clears the conversation.

Construct tests choose an activity; activity tests choose a construct and can test the opening request. Spell tests choose both and either let the construct select spells or load the draft spell before replying. Forced casting tests instructions, not selection. The test uses the same prompt renderer, user-name substitution and metered reply model as chats. Real tests spend the acting user's gold.

Workshop tests live only in the open page, with bounded conversation length and reply size. They do not save chats, edit the original definitions or change past snapshots and casts. Leaving or reloading the page clears test results. Only spell casting is available in tests; searching the Blender manual, changing activities, creating quests, editing memory, recording milestones and generating images are unavailable. The test area explains these limits before use. Cancel stops waiting for the test; any model use already incurred can still cost gold.

## Storage compatibility

The product calls ongoing work quests. Existing route paths, tool names, storage fields and built-in activity ids retain their `project` names for compatibility. Saved user prompts, chat snapshots and past messages keep their original text.

The shared store handles ownership, cloning, source tracking and Marketplace copies. Domain definitions contain concrete prompt and metadata fields. There is no registry of editable prompt parts.

The existing `buddies` table and JSON columns remain in place. Validated read boundaries convert legacy construct voice and habits into one prompt, preserving the previous rendered text. Activity and spell boundaries separate their instruction text from opening requests and selection metadata. Writes retain the legacy JSON shape so the currently live build can read newly saved definitions, snapshots and listings during a rollout or rollback. This change needs no schema migration.

Constructs were first called buddies. The rename to constructs changed no schema, and the earlier build, which a release keeps live while it migrates and a rollback returns to, reads everything the current build writes:

- Stored rows, browsers' saved drafts and Workshop request bodies keep the kind `buddy` (`STORED_PROMPT_KIND` in `src/prompts/prompt.ts`), and memory a construct writes keeps the author `buddy` (`STORED_MEMORY_AUTHORS` in `src/memory/memory.ts`). The stored kind's parser also takes `construct`; the stored memory author is a legacy-only boundary, `user` or `buddy`, and refuses `construct`, as the `memory_versions` check does.
- A Workshop request sends the construct's id as both `constructId` and `buddyId` (`workshopRequestBody` in `src/workshop/protocol.ts`), and the server takes either.
- `/buddies`, `/buddies/<id>`, `/guild` and `/guild/<id>` redirect, temporarily, to `/constructs` and `/constructs/<id>` (`next.config.ts`). A Marketplace link with `?kind=buddy` still shows constructs.
- An own copy of a built-in construct, activity or spell is stored, while its whole text is unchanged, in that built-in's text from before the rename, and read back in today's text (`src/prompts/earlier-built-in-texts.ts`). The earlier texts are recorded in `src/prompts/earlier-built-ins.ts` and never edited. The earlier build knows a copy only by exact equality with its own text, so either build keeps the copy's prepared openings and refuses to list it in the Marketplace, whichever build saved it. Edited text is stored exactly as written, and matching stays exact (`src/prompts/matching-built-in.ts`). Chat snapshots and activity sessions are not translated.
- `BUDDY_MODEL` is read when `CONSTRUCT_MODEL` is unset (`readConstructModel` in `src/env.ts`).
- The global prompt tells the model that older instructions may call a construct a buddy. Saved prompts and snapshots are never rewritten.

What the earlier build cannot do after a rollback: open `/constructs` links, or show constructs for a `?kind=construct` link, which shows all listings instead.

Placeholders remain literal in saved definitions and snapshots. Substitution happens when text enters model context. Chat viewers cannot read private spell instructions through saved tool results, and ownership of the original definition does not change team chat access.

Reply and tool application state identifies the acting user. Replies, generated images and automatic chat names charge that user; generated openings charge the starter, and check-ins charge the quest owner. Prompt text grants no access or tools.

## Unsaved edits

The shared editor refuses a blank or whitespace-only name beside the field and keeps all edits. Unsaved edits are kept in this browser for the signed-in viewer and prompt until Save or Discard changes. A draft based on an older save is discarded. Browser storage can be blocked or cleared; these drafts do not follow you to other devices. Anyone with access to this browser’s storage can read them, so use Discard changes on a shared device.
