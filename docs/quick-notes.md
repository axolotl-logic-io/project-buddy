# Quick Notes

A Quick Note is a short, dated line that the user saves to one of their quests without opening it. The glossary entry is [Quick Note](../GLOSSARY.md#quick-note). The use case is [`use_case_quick_note`](../apps/web/use-cases/quick-notes.md#use_case_quick_note).

## The Quick Note dialog

The signed-in site panel has a **Quick Note** item at its top. Choosing it closes the panel's drawer on a narrow screen, leaves a docked panel open, and opens a modal dialog, which loads the user's Active quests and offers them newest first. On a quest's page, that quest is chosen if it is Active; otherwise the newest Active quest is chosen. With no Active quest, the dialog says so and links to Quests.

Saving calls no model and spends nothing. A saved Quick Note clears the text and keeps the quest chosen, ready for the next one. The text is trimmed and holds 1 to 1000 characters; the dialog refuses an empty or longer note with a message under the field, and the server checks it again. A quest that is gone, not the user's, or no longer Active takes no note, and the dialog says so. In each case the dialog keeps the typed text. Closing the dialog returns focus to the site panel's button, or to Quick Note when the panel is docked.

## Storage

Quick Notes live in the `quest_notes` table: an id, the quest, the text and when it was saved. They are deleted with their quest. Every query is scoped to the quest's owner and members through `src/accounts/owner-scope.ts`; a quest not open to the user has no Quick Notes and takes none. `src/notes/note.ts` holds the rules for a note's text, `src/notes/note-store.ts` the storage and `src/notes/note-actions.ts` the Server Actions. Constructs don't read Quick Notes.

## A quest's Quick Notes

The quest sidebar's **Quick Notes** bucket, in its Buckets menu, lists the quest's notes, newest first, each with the day it was saved. Select a note to edit it in a multiline text area. Enter inserts a line break; **Save Quick Note** saves the edit and **Cancel editing Quick Note** discards it. Text keeps its line breaks and must contain 1 to 1000 characters after trimming. A refused edit keeps the draft. The note’s actions menu offers **Delete**. Edits send `/edit-note NOTE TEXT` to the conversation and record the change without changing its saved date or awarding experience. `?section=notes` opens it. Deleting is idempotent: a note that is already gone is left as it is. Completed and Abandoned quests keep their Quick Notes to read, edit and delete, though they take no new ones.
