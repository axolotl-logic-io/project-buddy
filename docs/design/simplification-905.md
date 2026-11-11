# Two ways to create a quest (#905)

This note records how #905 removes Activities as a destination and leaves exactly two ways to create a quest: **Start a quest** and **Turn Chat into a quest**. Both open the same shared form. Activities stay as internal instructions that the construct follows and changes with its activity tool. Paths are relative to `apps/web/`.

## What goes

- The Activities page (`/activities`) and its menu, Home and breadcrumb links. The old address redirects to the Workshop's Activities tab and makes nothing.
- Every activity start action: the start dialog on an activity card and on an activity's own page.
- The construct start action ("Start a quest with NAME") on construct cards, and `StartWorkDialog` itself. The construct is picked inside the form.
- The hidden activity field in the quest start form and the activity preset of a start point. The server takes the activity from the chosen starting point (Dailies, Learn a thing, Make a thing or Do a thing).
- The activity list in the quest start choices, which no form shows any more.
- The construct's separate quest confirmation form in Chat (`QuestTransferForm`, `confirmQuestTransfer`, `readQuestTransfer` and their action). The `create_project` tool now creates nothing and writes nothing: its offer opens Turn Chat into a quest filled in with its name and summary, and the user confirms there through `startQuestAction`.
- `create_project` in a quest's conversation. Only Chat can be turned into a quest.
- Copy, Library text, use cases and tests that describe the removed places and actions.

## What stays

- Built-in and own activities, their instructions and opening requests, and the snapshot each conversation saves.
- The construct's `select_activity` tool and the activity list in its instructions.
- Private activity editing: the Workshop's Activities tab lists them, and each opens in its editor at `/activities/ACTIVITY_ID`.
- Dailies: Start a quest creates it once; afterwards its card opens it, and Start the day only sends a message in it.

## Rollout compatibility

There is no schema change.

- A quest start form from the earlier build may still send an `activityId`; the new action ignores it.
- A `create_project` result saved by the earlier build still renders: a "proposed" one with a `proposalId` shows its name, with Turn Chat into a quest in Chat, and a "created" one still links to its quest.
- The `quest_transfers` table and `questTransferOwnedBy` in `src/accounts/owner-scope.ts` are no longer used. The earlier build writes the table while it is live, so dropping it waits for the held schema cleanup, agreed with Consolidator.
