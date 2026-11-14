# Quest status

## use_case_change_quest_status

The owner marks a quest completed or abandoned through commands in its conversation.

- **Steps:** Type `/complete` or `/abandon` in the composer and send it. The commands take no arguments and make no construct request.
- **Outcome:** The quest shows the new status. Its conversations, Plan and progress stay available. Undo restores the previous status while no newer status change has occurred. Other users cannot change the status.

## use_case_restore_quest

The owner finds a completed or abandoned quest and restores it.

- **Steps:** Open Quests, choose Completed or Abandoned, and choose Restore quest on a card. Alternatively, open the quest and send `/restore`.
- **Outcome:** The quest returns to Active with its contents intact. The list offers Undo even after the restored card leaves the selected list. Status tabs support keyboard navigation; the selected status is preserved in the URL.

Completed and Abandoned quests keep their conversations available to continue. Status changes and Undo replace previous feedback and focus the current result, including when a restored card leaves the list.
