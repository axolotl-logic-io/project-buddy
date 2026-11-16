# Quest status

## use_case_change_quest_status

The owner or a member marks a quest completed or abandoned from Actions or through commands in its conversation.

- **Steps:** Open Actions and choose Complete or Abandon, which sends `/complete` or `/abandon` to the conversation. Alternatively, type the command in the composer and send it. The commands take no arguments and make no construct request.
- **Outcome:** The quest shows the new status, and the conversation shows the command with a note of the change, which the construct reads on its next reply. While the user's last message awaits a reply, the command changes nothing and says why. Its conversations, Tasks and progress stay available. Undo restores the previous status while no newer status change has occurred. Users outside the quest, pending invitees included, cannot change the status.

## use_case_restore_quest

The owner or a member finds a completed or abandoned quest and restores it.

- **Steps:** Open Quests, choose Completed or Abandoned, and choose Restore quest on a card. Alternatively, open the quest and send `/restore`.
- **Outcome:** The quest returns to Active with its contents intact. The list offers Undo even after the restored card leaves the selected list. Status tabs support keyboard navigation; the selected status is preserved in the URL.

Completed and Abandoned quests keep their conversations available to continue. Status changes and Undo replace previous feedback and focus the current result, including when a restored card leaves the list.
