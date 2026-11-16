# Command line

These cases cover the `project-buddy` command, which works with the user's quests through the site's `/api/v1` routes. Each command writes JSON Lines: one record per list entry, then one result or error record. Its exit status names the kind of failure.

## use_case_cli_api_quests

- **Intent:** List, read, start and change quests from a terminal.
- **Prerequisites:** [`use_case_return_signed_in`](access.md#use_case_return_signed_in), with the session in `PROJECT_BUDDY_SESSION`.
- **Steps:**
  - They run `project-buddy whoami`, then `project-buddy quest list`.
  - They start a quest from a starting point, read a quest and rename it.
  - They complete the quest with the status revision they last read.
- **Outcome:** `whoami` names the signed-in user. The list shows only quests open to them. Starting from a starting point opens a new quest; starting Dailies again resumes the open one. A status change with a stale revision is refused as a conflict. Another user's quest is not found, whatever the request. A command with no session or an expired session gets an authorization problem, never a sign-in page.

## use_case_cli_api_quest_records

- **Intent:** Keep a quest's Tasks, Ideas, Quick Notes and milestones from a terminal.
- **Prerequisites:** [`use_case_cli_api_quests`](#use_case_cli_api_quests).
- **Steps:**
  - They add, edit, complete and remove Tasks by step number, and undo a change by its version.
  - They add Ideas, reorder them and move one to Tasks.
  - They save and delete Quick Notes, and list and edit milestones.
  - They list and read the constructs and spells open to them.
- **Outcome:** each change answers with the quest's records as they now are, and Tasks answers with its new version. A missing Idea, Task step or milestone is not found. Quick Notes save only to an Active quest, and deleting one that's already gone succeeds. Another user's records are not found.

## use_case_cli_api_conversation

- **Intent:** Talk with a quest's construct from a terminal.
- **Prerequisites:** [`use_case_cli_api_quests`](#use_case_cli_api_quests).
- **Steps:**
  - They send a message, from `--text`, a file or stdin.
  - They read the conversation, cast a spell and stop it.
- **Outcome:** sending waits for the construct's reply, and the conversation then shows both messages with their authors. A message sent while a reply is in progress is refused. A quest's members can read its conversation; anyone else gets not found.
