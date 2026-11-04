# Progress timeline

Each project has a progress timeline: a dated list of what the user got done, on the project's page. It lets the user see how far they have come. The [glossary](../GLOSSARY.md#progress-timeline) defines the words this page uses.

## Milestones

A milestone is one short line, in the past tense, of something the user finished, such as "Blocked out the shell and body". The buddy records it with the `record_milestone` tool when the user says they finished something meaningful in a project chat. The global prompt (`src/replies/global-prompt.ts`) tells every buddy to record milestones sparingly: a real achievement, not every step, question or plan, and never twice for the same thing.

To avoid a second record of the same thing from another chat, each project chat's system prompt lists the project's 10 newest milestones, with their days, beside the project memory (`src/replies/milestones-prompt.ts`). The buddy reads them as already recorded.

The tool is active only in project chats. A standalone chat has no project, so it has no timeline. If a buddy calls the tool there anyway, the call fails and records nothing.

The chat shows each recorded milestone as a notice, apart from the buddy's words, with a link to the project's page. The notice comes from the tool's saved result, so it looks the same while the reply streams and after the user reopens the chat.

## Timeline

The project's page lists its milestones, newest first, between the New chat button and the chats. Each entry shows the day it was recorded, its text and a link to the chat it came from. The user can edit an entry's text or delete the entry. An edit keeps the entry's day and chat. When the edit form closes, keyboard focus returns to the entry's Edit button.

A milestone's text is one line of at most 200 characters (`MILESTONE_TEXT` in `src/milestones/milestone.ts`). The tool and the edit form both check it.

The timeline celebrates and doesn't nag. Its copy (`src/ui/copy/milestones.ts`) and the buddy's rules never count days or streaks, or point out a pause.

## Storage

The `milestones` table (`src/db/tables/milestones.ts`) holds one row per milestone, with its project, its chat, its text and when it was recorded. A milestone is open to everyone in its project, its owner and its [members](team-projects.md), through `milestoneOpenTo` in `src/accounts/owner-scope.ts`, and is deleted with its project or its chat. `src/milestones/milestone-store.ts` is the only module that reads or writes the table. Migration 0024 adds the table; it is an additive migration, which the live build can run beside.
