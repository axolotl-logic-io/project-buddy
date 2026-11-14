# Plan

## use_case_ask_whats_next

The user asks what to work on next in a quest with a Plan.

- **Prerequisites:** a quest whose Plan holds agreed steps.
- **Steps:** the user asks the construct what is next.
- **Outcome:** the construct receives the current Plan, including its stable step numbers and done states, and can identify the first open step. A quest with no open steps has no next step. Replies use the conversation and Plan, without Goal, Preferences or Journal fields.

## use_case_construct_changes_plan

The construct keeps the quest's plan: the steps she agreed to, in order.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in an adventure in one of her quests.
- **Steps:**
  - She agrees to the next stretch of work, or tells the construct she finished a step or changed her mind.
  - The construct changes the plan: it adds, checks off, changes, moves or removes steps.
- **Outcome:** the adventure shows a Plan change, set apart from the construct's words, with what each operation did and Undo, as soon as the construct makes it and again when she reopens the adventure. Every adventure in the quest gets the plan in its instructions from its next reply on, each step with its number and the done ones marked. The quest’s Plan section shows its remaining steps. A plan emptied or with every step done has no next step. The construct adds only steps she agreed to, checks off a step when she says she finished it, and never counts open steps or days *(checked by the real-Claude smoke test)*.
- **Variations:**
  - The construct names a step that is gone, such as one she removed meanwhile: nothing changes, and the construct gets the plan as it is to try again.
  - In an adventure with no quest, the construct has no plan to change.
- **Next:**
  - `use_case_change_plan`: change the plan herself.
  - `use_case_plan_panel`: keep it beside the adventure.

## use_case_change_plan

The user changes the quest's plan herself, without the construct.

- **Prerequisites:** [`use_case_open_quest`](quests.md#use_case_open_quest).
- **Steps:**
  - She opens the quest's Plan section.
  - She checks off a step, reopens a done one, adds one, edits one, moves one up or down, or removes one.
- **Outcome:** the Plan shows compact todo rows with circular completion controls. Clicking a step’s text opens the shared inline editor. Enter, Save or clicking outside commits and closes it; clicking another step also opens that editor. Escape or Cancel discards the draft. Failed saves retain the draft. Add a step opens a new row above the list and saves the new step first. Drag a row’s handle to reorder it, or focus the handle and use the arrow keys. Each row’s menu offers Move up, Move down and Remove step, and shows its stable step number. Each change is saved at once, makes no model call and makes no model request, and the page says what changed, with Undo. Undo puts the plan back as it would be without that change, keeping later ones: a step edited again since keeps its newer text, a step removed since stays removed, and a step whose old neighbour was removed since goes back at the end. When nothing that change did is left to undo, Undo says so and changes nothing. A change refused for a reason, such as the step limit below, says why in the same quiet line. A change that failed, because it couldn't be saved or the quest is no longer available, is an alert in the danger colour with the alert icon, announced at once. A step must be one line of at most 200 characters; empty text is refused with the reason, and her text stays in the field. The plan holds at most 30 open steps, counted on the plan a change leaves, so one change may add a step and remove another at the limit. Done steps fold away under Done. Anyone else's quest, even one they were once a member of, looks exactly like one that doesn't exist, and they can't change its plan.
- **Next:**
  - `use_case_construct_changes_plan`: the construct works from the changed plan on its next reply.

## use_case_plan_panel

The user keeps the plan beside an adventure.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in an adventure in one of her quests.
- **Steps:**
  - Plan, Ideas and Progress are sidebar tabs in the quest side menu. A panel icon opens or collapses the sidebar without discarding drafts. The sidebar sits flush with the right page edge on wide screens; phones start collapsed and open a modal drawer, which Escape closes.
  - She changes the plan there, as on the Plan section.
- **Outcome:** each sidebar change updates the Plan and shows feedback with Undo in the sidebar, without adding a message to the conversation. Undo also adds no message. The construct reads the current Plan on its next reply. The panel follows the construct's changes as they arrive. While the construct replies, the panel's controls wait for the reply to end. While her last message has no reply because its reply failed or stopped, they wait too and say why, so that Retry or "send again" still answers that message; she can change the plan on the quest's page meanwhile.
- **Next:**
  - `use_case_plan_commands`: change it from the message box.

## use_case_plan_commands

The user keeps the plan with commands in the message box, without the construct.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message), in an adventure in one of her quests.
- **Steps:**
  - She types "/" in the message box. A list of the commands shows above it, each with how to write it and what it does; she moves through it with the arrow keys and picks one with Tab, Enter or a click.
  - She sends a command, such as `/done`, `/add Paint the eyes`, `/move 4 1` or `/plan`.
- **Outcome:** the command runs at once, makes no model call and makes no model request. The adventure shows what she typed and the Plan change it made, while `/plan` starts the Plan Activity for subsequent messages. `/undo` undoes her last plan change in this adventure that has something left to undo, passing over one whose steps were all changed or removed since. The message box empties. The construct reads each change on its next reply, as a note rather than a request. A step is named by its number, as the plan shows it.
- **Variations:**
  - An unknown command, a missing step, text that's too long or a place out of range: nothing changes, the site says why under the message box, and her text stays there.
  - While her last message awaits a reply, because one is running or it failed or stopped: a plan command changes nothing and says why, so Retry and "send again" still answer that message.
  - In an adventure with no quest, plan commands say they need a quest. Any other message that starts with "/", such as "/shrug ok", goes to the construct as written, and typing "/" lists no plan commands.
- **Next:**
  - `use_case_change_plan`: see the whole plan on the quest's page.
