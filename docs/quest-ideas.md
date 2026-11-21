# Quest ideas

Each quest's **Ideas** section holds possibilities the user has not committed to. It sits beside Tasks at `/quests/QUEST_ID?section=ideas`, where `QUEST_ID` is the quest's id. The quest's owner and [members](multi-user-quests.md) can read and change its ideas; no one else can.

Ideas and Tasks share one editable list: click a text to edit it inline, add above the list, reorder by dragging a row's handle or with the arrow keys, and use the row menu. See [Shared list controls](quest-tasks.md#shared-list-controls). Each idea holds up to 200 characters. Ideas have no done state and stay separate from agreed tasks. Saved order survives reopening the quest.

Each row shows a Possibility label and a **Move to Tasks** action that needs no menu. Save or cancel an inline edit before moving the idea. An empty bucket keeps **Add idea** available.

**Move to Tasks** adds the saved idea as an open task at the end of Tasks and removes it from Ideas in one transaction. If the save fails, the idea stays available. Concurrent moves of the same idea create at most one task.

These controls make no model call, and ideas are not supplied as model context. The `brainstorm` command enters Brainstorm and captures subsequent messages here until the spell changes or stops. Deleting a quest deletes its ideas.

## Saved order

Each idea has a `position`. New ideas go first. Reordering validates ownership and both positions, locks the quest's idea rows and saves their positions together.
