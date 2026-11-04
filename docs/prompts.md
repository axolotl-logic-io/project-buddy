# Prompts

A buddy, activity or spell has a prompt. The editor for an own buddy shows one prompt describing its voice and habits. Headings can organize those instructions without making them separate fields. Built-in definitions are read-only; Customize makes an editable copy.

An activity has a prompt and a separate opening request. The prompt guides the current activity session. The opening request asks for the first reply when no prepared opening exists. Reset restores the activity prompt while preserving its opening request.

A spell has a prompt, shown as Instructions, and separate name and when-to-use metadata. The model sees selection metadata before casting. Casting delivers the instructions through the tool result. Reset restores instructions while preserving the name and when-to-use description.

Reset changes the editor draft and offers Undo reset; only Save stores it. Unsaved names, opening requests and when-to-use descriptions are preserved. Bought copies and clones of bought copies have no built-in source and cannot be reset, including through a direct request. They remain editable. For other copies, reset restores the prompt from the built-in source when there is one. Otherwise a buddy uses the default buddy's prompt, an activity uses the open chat's prompt, and a spell uses its starter instructions. Renaming and resetting never alter existing chat snapshots or past casts. A copy that still matches a built-in definition retains its prepared opening.

## Storage compatibility

The shared store handles ownership, cloning, source tracking and Marketplace copies. Domain definitions contain concrete prompt and metadata fields. There is no registry of editable prompt parts.

The existing `buddies` table and JSON columns remain in place. Validated read boundaries convert legacy buddy voice and habits into one prompt, preserving the previous rendered text. Activity and spell boundaries separate their instruction text from opening requests and selection metadata. Writes retain the legacy JSON shape so the currently live build can read newly saved definitions, snapshots and listings during a rollout or rollback. This change needs no schema migration.

Placeholders remain literal in saved definitions and snapshots. Substitution happens when text enters model context. Chat viewers cannot read private spell instructions through saved tool results, and ownership of the original definition does not change team chat access.

Reply and tool application state identifies the acting user. Replies, generated images and automatic chat names charge that user; generated openings charge the starter, and check-ins charge the project owner. Prompt text grants no access or tools.

## Unsaved edits

The shared editor refuses a blank or whitespace-only name beside the field and keeps all edits. Unsaved edits are kept in this browser for the signed-in viewer and prompt until Save or Discard changes. A draft based on an older save is discarded. Browser storage can be blocked or cleared; these drafts do not follow you to other devices. Anyone with access to this browser’s storage can read them, so use Discard changes on a shared device.
