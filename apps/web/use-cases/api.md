# API

These cases cover the site's versioned API under `/api/v1`, which scripts and other programs use to work with a user's quests. The caller is the user of the request's session cookie. Every answer is JSON: one record, a list, or an error with the status its code names.

## use_case_api_quests

- **Intent:** List, read, start and change quests through the API.
- **Prerequisites:** [`use_case_return_signed_in`](access.md#use_case_return_signed_in), with the session cookie on each request.
- **Steps:**
  - They ask `/api/v1/me` who they are, then list their quests.
  - They start a quest from a starting point, read a quest and rename it.
  - They complete the quest with the status revision they last read.
- **Outcome:** `/api/v1/me` names the signed-in user. The list shows only quests open to them. Starting from a starting point opens a new quest each time, Dailies too. A status change with a stale revision is refused as a conflict. Another user's quest is not found, whatever the request. A request with no session or an expired session gets an authorization problem, never a sign-in page.

## use_case_api_quest_records

- **Intent:** Keep a quest's lists and list items through the API.
- **Prerequisites:** [`use_case_api_quests`](#use_case_api_quests).
- **Steps:**
  - They list the quest's lists and read one.
  - They add, edit, check off, uncheck, reorder and remove list items, and move one to another list, where it takes that list's type.
  - They undo a change by its version.
  - They list and read the constructs and rites open to them.
- **Outcome:** each change answers with the list as it now is, with its new version. Tasks keep their task numbers, including when moved to another task list. A missing list or list item is not found. Another user's lists are not found.

## use_case_api_performance

- **Intent:** Perform a rite on a list through the API.
- **Prerequisites:** [`use_case_api_quests`](#use_case_api_quests).
- **Steps:**
  - They start a performance of a rite on one of the quest's lists.
  - They send a message from text, read the performance, then stop it.
- **Outcome:** a message adds its list item to the list and waits for the rite's reply, and the performance then shows both with their authors. Sending a message requires an active performance. A quest's members can read its performances; anyone else gets not found.
