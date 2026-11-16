# Tasks

## use_case_ask_whats_next

The user finds the next step in a quest with a Tasks.

- **Prerequisites:** a quest whose Tasks holds agreed steps.
- **Steps:** open Quests and read Continue, or open the quest's Tasks.
- **Outcome:** the next step is the first open Tasks step. A quest with no open steps has no next step. Asking the local construct in prose returns command guidance; it does not infer an answer from the Tasks.

## use_case_change_tasks

The user changes the quest's tasks herself, without the construct.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - The user opens the quest's Tasks section.
  - The user checks off a step, reopens a done one, adds one, edits one, moves one up or down, or removes one.
- **Outcome:** the Tasks shows compact step rows with circular completion controls. Clicking a step’s text opens the shared inline editor. Enter, Save or clicking outside commits and closes it; clicking another step also opens that editor. Escape or Cancel discards the draft. Failed saves retain the draft. Add a step opens a new row above the list and saves the new step first. Drag a row’s handle to reorder it, or focus the handle and use the arrow keys. Each row’s menu offers Move up, Move down and Remove step, and shows its stable step number. Each change is saved at once, makes no model request, and the page says what changed, with Undo. Undo puts the tasks back as it would be without that change, keeping later ones: a step edited again since keeps its newer text, a step removed since stays removed, and a step whose old neighbour was removed since goes back at the end. When nothing that change did is left to undo, Undo says so and changes nothing. A change refused for a reason, such as a missing step, says why in the same quiet line. A change that failed, because it couldn't be saved or the quest is no longer available, is an alert in the danger colour with the alert icon, announced at once. A step must be one line of at most 200 characters; empty text is refused with the reason, and their text stays in the field. The Tasks has no limit on the number of open or done steps. Done steps fold away under Done. The owner and accepted members share the tasks. Anyone else's quest, a pending invitee's or a removed member's included, looks exactly like one that doesn't exist, and they can't change its tasks.

## use_case_tasks_panel

The user keeps the tasks beside a conversation.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in a conversation in one of their quests.
- **Steps:**
  - Tasks, Ideas, Progress, Quick Notes and Actions are sidebar tabs in the quest side menu. A panel icon opens or collapses the sidebar without discarding drafts. The sidebar sits flush with the right page edge on wide screens; phones start collapsed and open a modal drawer, which Escape closes.
  - The user changes the tasks there, as on the Tasks section.
- **Outcome:** each sidebar change updates the Tasks and shows feedback with Undo in the sidebar, without adding a message to the conversation. Undo also adds no message. The construct reads the current Tasks on its next reply. The panel follows the construct's changes as they arrive. While the construct replies, the panel's controls wait for the reply to end. While their last message has no reply because its reply failed or stopped, they wait too and say why, so that Retry or "send again" still answers that message; the user can change the tasks on the quest's page meanwhile.
- **Next:**
  - `use_case_tasks_commands`: change it from the message box.

## use_case_tasks_commands

The user keeps the tasks with commands in the message box, without the construct.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in a conversation in one of their quests.
- **Steps:**
  - The user types "/" in the message box. A list of the commands shows above it, each with how to write it and what it does; the user moves through it with the arrow keys and picks one with Tab, Enter or a click.
  - The user sends a command, such as `/done`, `/add Paint the eyes`, `/move 4 1` or `/tasks`.
- **Outcome:** the command runs at once, makes no model request. The conversation shows what the user typed and the Tasks change it made, while `/tasks` starts the Tasks spell for subsequent messages. `/undo` undoes their last tasks change in this conversation that has something left to undo, passing over one whose steps were all changed or removed since. The message box empties. The construct reads each change on its next reply, as a note rather than a request. A step is named by its number, as the tasks shows it.
- **Variations:**
  - An unknown command, a missing step, text that's too long or a place out of range: nothing changes, the site says why under the message box, and their text stays there.
  - While their last message awaits a reply, because one is running or it failed or stopped: a tasks command changes nothing and says why, so Retry and "send again" still answer that message.
  - In a conversation with no quest, tasks commands say they need a quest. Any other message that starts with "/", such as "/shrug ok", goes to the construct as written, and typing "/" lists no tasks commands.
- **Next:**
  - `use_case_change_tasks`: see the whole tasks on the quest's page.

## use_case_recurring_steps

The user marks a step in Dailies to do every day.

- **Prerequisites:** [`use_case_dailies`](quests.md#use_case_dailies), with a step in its Tasks.
- **Steps:** the user opens the step's menu and chooses Make recurring. Later, they can choose Make one-off to change it back.
- **Outcome:** the step shows a repeat icon. The page says what changed, with Undo, as for any tasks change. Each Start Day reopens the step if it is done ([`use_case_start_day`](quests.md#use_case_start_day)), while a done one-off step stays done.
- **Variations:**
  - Steps in a quest not started as Dailies have no Make recurring.
- **Next:**
  - `use_case_daily_streaks`: see how often each recurring step gets done.

## use_case_daily_streaks

The user sees how many days in a row they have done each recurring step.

- **Prerequisites:** `use_case_recurring_steps`, and days begun with [`use_case_start_day`](quests.md#use_case_start_day).
- **Steps:**
  - The user looks at a recurring step in Tasks.
  - The user opens the sidebar's Progress tab.
- **Outcome:** each recurring step shows its streak beside its repeat icon: the number of days in a row, up to the current day, on which it was done. The current day counts once the step is done, and an open step doesn't end the streak until the next Start Day. A day the step wasn't done ends the streak. So does a gap: a calendar date with no day started. Two days started on one date count as one date. Above the progress timeline, a day grid shows each recurring step's last seven dates: filled when done, empty when not, and dashed for a gap. Screen readers announce each date's weekday, date and mark.
- **Variations:**
  - Before the first Start Day, the grid says that Start Day begins counting. With no recurring steps, it says how to make one.
  - A recurring step with no streak shows its repeat icon alone.
  - A date before a step became recurring shows as untracked.
  - A quest not started as Dailies shows no streaks or day grid.
