# Quest workspace without adventures (#893)

This note records what [#893](https://github.com/axolotl-logic-io/project-buddy/issues/893) changed in the quest UI, after the scope correction that asked for fewer features. It builds on the domain in [#892](simplification-892.md) and shares the conversation screen and quest start with standalone Chat ([#894](simplification-894.md)).

## What the user sees

- `/projects/<id>` opens the quest's one conversation and composer, under the quest's frame: title, status, the section rail (Conversation, Quest Journal, Plan, Progress, Versions, Members and check-ins) and the owner's status actions. The Plan panel beside the conversation names the next step.
- A quest without a conversation, as after the cutover, offers Start the conversation; opening the page starts nothing.
- Quests starts with four premade starting points, Dailies, Learn a thing, Make a thing and Do a thing ([premade quests](../premade-quests.md)). Choosing one shows its details in place; Start quest opens the new quest's conversation.
- Dailies is one ongoing quest. Its conversation offers Start the day, a prepared message sent through the composer.
- Home's Continue, quest rows, check-in emails and old adventure links lead to `/projects/<id>`. Quest rows and Home mark a quest with unread messages for the viewer.

## Removed

- The Adventures section of a quest, its adventure list and New adventure dialog, on the quest page and the Journal page.
- The blank Start Quest dialog and form (`new-project-dialog.tsx`, `new-project-form.tsx`, `createProjectAction`), the Premade quests tab, Find a starting point, the quest library and its activity entry (`quest-library.tsx`, `premade-actions.ts`, `quest-index.ts`), and the four narrowly themed premade quests.
- The rename form in the conversation header, Today's lists (`today-section.tsx`, `readToday`), the milestone links to adventures, and Start a new adventure on a too-long request.
- Use cases and tests for them: project interview, resume interview, new-project motivation, start premade quest, two-field start, reopen adventure, switch construct.

## Added

- `src/components/quest-start.tsx` (the one quest start) and `startQuestAction`.
- `src/activities/dailies.ts` and `src/activities/learn-a-thing.ts`, two built-in activities that carry the starting points' guidance.
- `QuestFrame`, a page frame wide enough for the conversation and its Plan panel, so the quest page doesn't shift as it loads or fails.
- An optional `title` and `starter` on the shared conversation screen, for Chat's heading and Start the day.

No schema change is in this PR. Its one persistent state, `projects.dailies`, is #892's.
