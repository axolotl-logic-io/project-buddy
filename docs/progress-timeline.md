# Progress timeline

Each quest has a progress timeline: a dated list of what the user got done, on the quest's page. It lets the user see how far they have come. The [glossary](../GLOSSARY.md#progress-timeline) defines the words this page uses.

## Milestones

A milestone is one short line in the past tense about something the user finished, such as “Blocked out the shell and body.” Use **Add milestone** in Progress to record one.

## Timeline

The quest's Progress section lists its milestones, newest first. Each entry shows the day it was recorded and its text. The user can edit an entry's text or delete the entry. An edit keeps the entry's day. When the edit form closes, keyboard focus returns to the entry's Edit button.

A milestone's text is one line of at most 200 characters (`MILESTONE_TEXT` in `src/milestones/milestone.ts`). The page and server both check it.

## Day grid

In the Dailies quest, Day grid on the overview shows recurring history; Progress keeps the recorded milestones. The day grid has one row for each recurring task, with a square for each of its last seven dates: filled when the task was done, empty when it wasn't, and dashed for a gap, a date with no day started. [Dailies](dailies.md) describes the days and streaks behind it.

## Storage

The `milestones` table (`src/db/tables/milestones.ts`) holds one row per milestone, with its quest, the conversation it was recorded in, if that still exists, its text and when it was recorded. A milestone is open to its quest's owner and members, through `milestoneOpenTo` in `src/accounts/owner-scope.ts`, and is deleted with its quest; it outlives the conversation it was recorded in. `src/milestones/milestone-store.ts` is the only module that reads or writes the table.
