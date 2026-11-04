# Prompts

A buddy, activity or spell has a prompt. The editor for an own buddy shows one prompt describing its voice and habits. Headings can organize those instructions without making them separate fields. Built-in definitions are read-only; Customize makes an editable copy.

An activity has a prompt and a separate opening request. The prompt guides the current activity session. The opening request asks for the first reply when no prepared opening exists. Reset restores the activity prompt while preserving its opening request.

A spell has a prompt, shown as Instructions, and separate name and when-to-use metadata. The model sees selection metadata before casting. Casting delivers the instructions through the tool result. Reset restores instructions while preserving the name and when-to-use description.

Reset restores the prompt from the built-in source when there is one. Otherwise a buddy uses the default buddy's prompt, an activity uses the open chat's prompt, and a spell uses its starter instructions. Renaming and resetting never alter existing chat snapshots or past casts. A copy that still matches a built-in definition retains its prepared opening.

## The editor

One editor, `src/components/prompt-editor.tsx`, serves an own buddy, activity and spell. Nothing changes the saved definition but Save:

- **Reset prompt to default** puts the default prompt in the editor only. The page says it isn't saved yet and offers Undo reset, which gives back the text from before the first Reset, even after Reset again or a visit elsewhere; editing the prompt, Undo, Discard or Save lets it go. There is no Reset Server Action.
- **Save** refuses a name that is empty or only spaces beside the name field, before the form is sent, and keeps what the user typed. The Server Action still treats such a name as not found, which only a broken or forged client meets.
- **Unsaved changes** are kept in the browser's local storage (`src/components/local-draft.ts`) until the user saves or discards them. Back on the page, the editor shows them again and says so. A kept draft records the save it was based on, and is ignored once the prompt has been saved since. The server never sees a draft. The memory editor and Quick Note keep drafts the same way.

## Storage compatibility

The shared store handles ownership, cloning, source tracking and Marketplace copies. Domain definitions contain concrete prompt and metadata fields. There is no registry of editable prompt parts.

The existing `buddies` table and JSON columns remain in place. Validated read boundaries convert legacy buddy voice and habits into one prompt, preserving the previous rendered text. Activity and spell boundaries separate their instruction text from opening requests and selection metadata. Writes retain the legacy JSON shape so the currently live build can read newly saved definitions, snapshots and listings during a rollout or rollback. This change needs no schema migration.

Placeholders remain literal in saved definitions and snapshots. Substitution happens when text enters model context. Chat viewers cannot read private spell instructions through saved tool results, and ownership of the original definition does not change team chat access.

Reply and tool application state identifies the acting user. Replies, generated images and automatic chat names charge that user; generated openings charge the starter, and check-ins charge the project owner. Prompt text grants no access or tools.
