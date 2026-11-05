# Quest status

## use_case_change_quest_status

The owner marks a quest completed or abandoned through Quest actions on the quest page.

- **Steps:** Open Quest actions and choose Mark completed or Mark abandoned.
- **Outcome:** The quest shows the new status. Its adventures, Journal, Quick Notes, progress and memberships stay available. Check-ins turn off. Undo restores the previous status while no newer status change has occurred. Members and other users cannot change the status.

## use_case_construct_changes_quest_status

The construct verifies whether the user wants to complete, abandon or restore the entire quest, then proposes the exact change on an approval card.

- **Steps:** In a quest adventure, ask for a status change. Review the quest name and current and proposed statuses. Confirm or keep the current status.
- **Outcome:** The tool creates a saved proposal without changing the quest. Only the requesting owner can approve it. Approval applies that exact proposal once. Declining persists. A proposal becomes outdated after any status change, including one later undone. Reloading never makes an answered card actionable again. Concurrent or repeated approvals cannot overwrite a newer status. A construct cannot supply its own approval.

## use_case_restore_quest

The owner finds a completed or abandoned quest and restores it.

- **Steps:** Open Quests, choose Completed or Abandoned, and choose Restore quest on a card. Alternatively, open the quest and choose Restore quest from Quest actions, or approve a construct's restoration proposal.
- **Outcome:** The quest returns to Active with its contents intact. The list offers Undo even after the restored card leaves the selected list. Check-ins remain off until the owner turns them on. Status tabs support keyboard navigation; the selected status is preserved in the URL.

Home features only Active quests. New adventure keeps Completed and Abandoned quests available and labels each quest option with its status. Status changes and Undo replace previous feedback and focus the current result, including when a restored card leaves the list.
