# Plan

## use_case_ask_whats_next

The user finds the next step in a quest with a Plan.

- **Prerequisites:** a quest whose Plan holds agreed steps.
- **Steps:** open Quests and read Continue, or open the quest's Plan.
- **Outcome:** the next step is the first open Plan step. A quest with no open steps has no next step. Asking the local construct in prose returns command guidance; it does not infer an answer from the Plan.

## use_case_change_plan

The user changes the quest's plan herself, without the construct.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - The user opens the quest's Plan section.
  - The user checks off a step, reopens a done one, adds one, edits one, moves one up or down, or removes one.
- **Outcome:** the Plan shows compact step rows with circular completion controls. Clicking a step’s text opens the shared inline editor. Enter, Save or clicking outside commits and closes it; clicking another step also opens that editor. Escape or Cancel discards the draft. Failed saves retain the draft. Add a step opens a new row above the list and saves the new step first. Drag a row’s handle to reorder it, or focus the handle and use the arrow keys. Each row’s menu offers Move up, Move down and Remove step, and shows its stable step number. Each change is saved at once, makes no model request, and the page says what changed, with Undo. Undo puts the plan back as it would be without that change, keeping later ones: a step edited again since keeps its newer text, a step removed since stays removed, and a step whose old neighbour was removed since goes back at the end. When nothing that change did is left to undo, Undo says so and changes nothing. A change refused for a reason, such as a missing step, says why in the same quiet line. A change that failed, because it couldn't be saved or the quest is no longer available, is an alert in the danger colour with the alert icon, announced at once. A step must be one line of at most 200 characters; empty text is refused with the reason, and their text stays in the field. The Plan has no limit on the number of open or done steps. Done steps fold away under Done. Anyone else's quest looks exactly like one that doesn't exist, and they can't change its plan.

## use_case_plan_panel

The user keeps the plan beside a conversation.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in a conversation in one of their quests.
- **Steps:**
  - Plan, Ideas and Progress are sidebar tabs in the quest side menu. A panel icon opens or collapses the sidebar without discarding drafts. The sidebar sits flush with the right page edge on wide screens; phones start collapsed and open a modal drawer, which Escape closes.
  - The user changes the plan there, as on the Plan section.
- **Outcome:** each sidebar change updates the Plan and shows feedback with Undo in the sidebar, without adding a message to the conversation. Undo also adds no message. The construct reads the current Plan on its next reply. The panel follows the construct's changes as they arrive. While the construct replies, the panel's controls wait for the reply to end. While their last message has no reply because its reply failed or stopped, they wait too and say why, so that Retry or "send again" still answers that message; the user can change the plan on the quest's page meanwhile.
- **Next:**
  - `use_case_plan_commands`: change it from the message box.

## use_case_plan_commands

The user keeps the plan with commands in the message box, without the construct.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in a conversation in one of their quests.
- **Steps:**
  - The user types "/" in the message box. A list of the commands shows above it, each with how to write it and what it does; the user moves through it with the arrow keys and picks one with Tab, Enter or a click.
  - The user sends a command, such as `/done`, `/add Paint the eyes`, `/move 4 1` or `/plan`.
- **Outcome:** the command runs at once, makes no model request. The conversation shows what the user typed and the Plan change it made, while `/plan` starts the Plan spell for subsequent messages. `/undo` undoes their last plan change in this conversation that has something left to undo, passing over one whose steps were all changed or removed since. The message box empties. The construct reads each change on its next reply, as a note rather than a request. A step is named by its number, as the plan shows it.
- **Variations:**
  - An unknown command, a missing step, text that's too long or a place out of range: nothing changes, the site says why under the message box, and their text stays there.
  - While their last message awaits a reply, because one is running or it failed or stopped: a plan command changes nothing and says why, so Retry and "send again" still answer that message.
  - In a conversation with no quest, plan commands say they need a quest. Any other message that starts with "/", such as "/shrug ok", goes to the construct as written, and typing "/" lists no plan commands.
- **Next:**
  - `use_case_change_plan`: see the whole plan on the quest's page.
