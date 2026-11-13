# Quest ideas

Each quest's **Ideas** section holds possibilities the user has not committed to. It sits beside Plan at `/quests/QUEST_ID?section=ideas`, where `QUEST_ID` is the quest's id. Only the quest's owner can read or change its ideas.

Ideas share Plan’s compact editable-list component. Click an idea’s text to open the inline editor, then use Enter or **Save idea** to save, or Escape or **Cancel idea edit** to cancel. **Add idea** opens a new editor above the list. The row menu offers **Move to Plan** and **Remove idea**. Drag a row’s handle to reorder it, or focus the handle and use the arrow keys. Saved order survives reopening the quest. Each idea holds up to 200 characters. Ideas have no done state and stay separate from agreed Plan steps.

**Move to Plan** adds the saved idea as an open step at the end of Plan and removes it from Ideas in one transaction. If Plan is full or the save fails, the idea stays available. Concurrent moves of the same idea create at most one step. Save edits before moving an idea.

These controls make no model call and spend no batteries. Ideas are not supplied as model context. The `brainstorm` command enters Brainstorm and captures subsequent messages here until the Activity changes or stops. The local command engine continues to use its existing commands.

`src/ideas/idea-store.ts` owns the list and its changes. The `quest_ideas` table stores each idea with its quest and creation time. Deleting a quest deletes its ideas. Migration 0060 adds this table without changing existing data, so the live build can run alongside the new schema.

## Saved order

Migration `0062_first_bastion.sql` adds a defaulted `position` column to ideas. Existing ideas keep their previous relative order until reordered. New ideas append. Reordering validates ownership and both positions, locks the quest’s idea rows and saves their positions together. This additive migration works with the previous build, whose writes omit the new column.
