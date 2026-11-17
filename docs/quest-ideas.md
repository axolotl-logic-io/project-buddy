# Quest ideas

Each quest's **Ideas** section holds possibilities the user has not committed to. It sits beside Tasks at `/quests/QUEST_ID?section=ideas`, where `QUEST_ID` is the quest's id. The quest's owner and [members](multi-user-quests.md) can read and change its ideas; no one else can.

Ideas share Tasks’s compact editable-list component. Click an idea’s text to open the inline editor, then use Enter, **Save idea**, or click outside to save and close it. Clicking another idea also opens that editor. Escape or **Cancel idea edit** cancels. **Add idea** opens a new editor above the list and saves the new idea first. The row menu offers **Move to Tasks** and **Remove idea**. Drag a row’s handle to reorder it, or focus the handle and use the arrow keys. Saved order survives reopening the quest. Each idea holds up to 200 characters. Ideas have no done state and stay separate from agreed tasks.

The Control desk toolbar counts saved ideas and labels them uncommitted. Each row has an idea symbol and a visible **Move to Tasks** action beneath its text, alongside the Possibility label. The action is available without opening a menu; save or cancel an inline edit before moving the idea. An empty bucket keeps **Add idea** available. The quest section and sidebar share this layout.

**Move to Tasks** adds the saved idea as an open task at the end of Tasks and removes it from Ideas in one transaction. If Tasks is full or the save fails, the idea stays available. Concurrent moves of the same idea create at most one task. Save edits before moving an idea.

These controls make no model call. Ideas are not supplied as model context. The `brainstorm` command enters Brainstorm and captures subsequent messages here until the spell changes or stops. The local command engine continues to use its existing commands.

`src/ideas/idea-store.ts` owns the list and its changes. The `quest_ideas` table stores each idea with its quest and creation time. Deleting a quest deletes its ideas.

## Saved order

Each idea has a `position`. New ideas append. Reordering validates ownership and both positions, locks the quest’s idea rows and saves their positions together.
