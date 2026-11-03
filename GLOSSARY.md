# Glossary

This glossary records the domain language of Project Buddy: the words that users, docs, prompts and code use for the same things. Use these words in code, copy, prompts, docs and issues. When you need a new word, add it here first.

Status: written in a domain modelling session on 2026-10-29 for [issue #544, Blender non-specific](https://github.com/axolotl-logic-io/project-buddy/issues/544), and followed by the code since [#549](https://github.com/axolotl-logic-io/project-buddy/issues/549). **Decided** marks a choice Autumn made that the code and docs don't follow yet. **Proposed** marks a choice still waiting for a decision. [Open questions](#open-questions) lists what is left.

The domain modelling session on 2026-10-31 retired "skill" in favor of tools and confirmed the activity model: one current activity per chat, with instructions, an opening request and a snapshot for each activity session.

Each entry gives:

- **UI:** the word users see.
- **Code:** the type, module or table name.
- **Avoid:** other names for the same thing, which should be replaced.

## Core model

Three concepts shape every chat:

- A **[buddy](#buddy)** is who the user talks with: a character, its voice and its habits.
- A **[tool](#tool)** is a function the model can call during a reply, such as searching the Blender manual or generating an image.
- An **[activity](#activity)** is what the user and buddy are doing together in a chat, such as an interview, brainstorming or an open chat. The user can also start a chat with an activity, from its [start page](#start-page). The current activity can change during the chat.

Buddies and activities are [prompts](#prompt) that the user can customize: the site ships built-in ones, and the user can make their own from them or write their own from scratch, then edit and rename them. **Proposed:** [spells](#spell) are a third kind of prompt: instructions the buddy loads with a tool only when they fit.

A chat is a [project chat](#project-chat) or a [standalone chat](#standalone-chat). Both have the same abilities, except that only a project chat has project memory and can record milestones.

## Product

### Project Buddy

The product: a personal site where buddies help each user with their own projects and ideas, on any subject. Blender is not the site's purpose. The [Blender manual lookup](#blender-manual-lookup) uses tools available across activities.

- **UI:** "Project Buddy" (`src/ui/copy/site.ts:6`).
- **Code:** the repository `project-buddy`.
- **Avoid:** "Project Buddies", "Blender AI tutor", "the Blender tutor", "Blender tutor site".

## Prompts

### Prompt

A buddy, an activity or a [spell](#spell): named text that the site puts into the model's instructions, and that the user can customize. Use "prompt" for the kinds together; use the specific word when you mean one kind.

Tool instructions are not prompts in this sense. They are defined by the site and users can't customize them for now.

- **Code:** `PromptKind` (`"buddy"`, `"activity"` or `"spell"`), `PromptSnapshot`, `src/prompts/`.

### Built-in prompt

A buddy, activity or spell that ships with the site. Built-in prompts are read-only.

### Own prompt

A user's private, editable buddy, activity or spell, made from a built-in prompt or another own prompt, or written from scratch.

- **UI:** "your own buddies", "One of your own buddies.", "your activities".
- **Code:** `OwnPrompt`, `OwnPromptId`, `OwnBuddy`, `OwnActivity`, `OwnSpell`, `src/prompts/own-prompt-store.ts`, table `buddies` with its `kind` column. **Proposed:** a later release renames the table `prompts`.
- **Avoid:** "custom buddy", "user persona".

### Customize, write from scratch, tweak, clone, rename

The ways to make and change a prompt. To **customize** is to make an own copy of a built-in prompt. To **write from scratch** is to make a new own prompt from no other prompt: it starts with the parts it resets to, and has no source. To **tweak** is to edit an own prompt in place. To **clone** is to copy an own prompt as "NAME (clone)". To **rename** is to change an own prompt's name.

- **UI:** "Customize", "New buddy", "New activity", "New spell", "Tweak", "Clone". A buddy, activity or spell written from scratch is named "New buddy", "New activity" or "New spell" until the user renames it. Only a spell has "Delete" so far.
- **Code:** `cloneOwnPrompt`, `createOwnPrompt`, `createBuddy`, `createActivity`, `createSpell`, `starterBuddyParts`, `starterActivityParts`, `starterSpellParts`; the `cloned_from` column is null for a prompt written from scratch.

### Prompt part

A named section of a prompt. Static parts are text that the user can edit on an own prompt. Dynamic parts are filled in for each chat, such as the project memory, the project name and the date.

- **UI:** "part".
- **Code:** `BuddyParts`, `ActivityParts` and `SpellParts` keys, `BUDDY_PART_KEYS`, `ACTIVITY_PART_KEYS`, `SPELL_PART_KEYS`.

### Snapshot

A copy of a prompt's name and parts, kept with a chat. Later edits to the prompt, or to the defaults, don't change the chat. A chat keeps a snapshot of its buddy when it starts, and a snapshot of each activity it enters, with the message where the activity started. Chats started before #549 keep their Blender text.

Tool instructions have no snapshots: like the global prompt, they change for every chat when the site changes.

- **Code:** `BuddySnapshot`, `ActivitySnapshot`; columns `chats.buddy_name`, `chats.buddy_parts`, and `activity_sessions.activity_name`, `activity_sessions.activity_parts`.

### Global prompt

Instructions that every chat gets, whatever its buddy and activity: the role, the shared rules and the instructions for tools. Users can't edit global prompts.

- **Code:** `src/replies/global-prompt.ts`, which `src/replies/system-prompt.ts` puts first.

## Buddies

### Buddy

A character who talks with the user in a chat. A buddy has a [voice](#voice) and [habits](#habits). Each chat has exactly one buddy, chosen when the chat starts.

"Buddy" is the only word for whoever answers the user. It replaced "tutor" and "persona" everywhere, including code and stored values.

- **UI:** "Buddy", "Buddies".
- **Code:** `Buddy`, `src/buddies/`.
- **Avoid:** "tutor", "persona", "assistant", and "character" except to explain a buddy.

### Built-in buddy

One of the six buddies that ship with the site: Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain. Their voices and habits carry no Blender lines.

- **Code:** `BuddyId`, `BUDDY_IDS`.

### Default buddy

Hippy. The buddy chosen first on every creation form, and the sender name on outgoing email.

- **Code:** `DEFAULT_BUDDY_ID`.

### Voice

The part that sets how a buddy talks. Use "voice" only for this part and the manner it describes.

### Habits

The part that sets how a buddy works with the user, as a Markdown list. For example, Hippy checks in between steps, closes with a calm recap, and reassures the user before giving a fix. Where the voice is how the buddy talks, the habits are how it helps.

Habits hold the buddy's personal style, which carries across every activity. Setting the scene and opening the chat belong to the [activity](#activity), not to habits.

- **Code:** `habits`.
- **Avoid:** "teaching rules".

## Activities

### Activity

What the user and buddy are doing together in a chat, such as brainstorming ideas, breaking down a project, conducting an interview or having an open chat. An activity is also a [prompt](#prompt): there are built-in activities, and the user can customize them into their own.

A chat has one [current activity](#current-activity). Its instructions guide the buddy. Changing activities keeps the conversation and buddy, but changes those instructions.

Each activity has a name, instructions and an [opening request](#activity-opening). The user can start a chat with it from its [start page](#start-page). The chat saves a [snapshot](#snapshot) each time it enters an activity, so later edits do not change that session.

The buddy sees every activity the user has, built-in and own, in its list of activities. To use one, it calls `select_activity`.

- **UI:** "Activity", "Activities".
- **Code:** `Activity`, `ActivityId`, `src/activities/`.
- **Avoid:** "mode", which is a theme setting, and "scene" outside explanations.

### Start page

The page where the user starts a chat with an activity. The user picks the buddy there too.

Every activity, built-in or own, starts from the new chat page with the activity chosen, at `/chats/new?activity=ACTIVITY_ID`, where `ACTIVITY_ID` is the activity's id. For the interview, the page chooses a new project too, and asks for its name when the chat starts. The new project form on the projects page also starts the interview.

### Current activity

The activity a chat is in now, saved in its activity sessions. The user chooses the starting activity when creating a chat. The buddy changes it by calling `select_activity`, whose in-chat result shows the change. Active chats have no activity selector.

- **Code:** `currentActivity`, `select_activity`, `activity_sessions`.

### Activity session

The stretch of a chat spent in one activity, from the message where the activity started until the next change or the end of the chat. A chat with no session, such as one the end-to-end tests make, is in the open chat.

- **Code:** table `activity_sessions`, `src/activities/activity-sessions.ts`.

### Activity opening

Each activity has its own opening kickoff part, which tells the buddy how to write the opening of a chat that starts in that activity, when the chat has no [prepared opening](#prepared-opening).

- **UI:** "Opening request".
- **Code:** the `openingKickoff` part.

### Built-in activity

An activity that ships with the site. There are four so far:

| Activity | What happens | Start page | Code |
|---|---|---|---|
| Open chat | No set scene: the buddy follows the user's lead. It is the default when the user picks no activity. | The new chat page | `open-chat` |
| Interview | The buddy asks about a new project, then writes the first goals and milestones to memory. It is the default when the user starts a project. | The new chat page, with a new project | `interview` |
| Brainstorming | The buddy helps the user generate and sort ideas. | The new chat page | `brainstorming` |
| Project breakdown | The buddy helps the user split a project into steps. | The new chat page | `project-breakdown` |

### Own activity

A user's private, editable activity, made by customizing a built-in activity, cloning another own activity, or writing one from scratch.

### Interview

The built-in activity that starts every project. The buddy asks what the user wants to make or learn and what they already know, then writes the first goals and milestones to the project memory.

- **UI:** "Project interview".
- **Code:** `INTERVIEW_ACTIVITY_ID`, `src/activities/interview.ts`. Before #549, the column `projects.interview_chat_id` named the interview chat; migration 0018 drops it.

A standalone chat can't enter the interview, which needs a project's memory. The buddy calls `create_project` instead, and the interview continues in the new project's chat.

### Open chat

The built-in activity with no set scene. It is the default when the user picks no activity.

## Spells

### Spellbook

**Proposed** in [#641](https://github.com/axolotl-logic-io/project-buddy/issues/641). A user's list of [spells](#spell), built in and their own, and the page that shows it. It is the user's lorebook of spells; use "lorebook" only to explain it.

- **UI:** "Spellbook", "Built-in spells", "Your spells", "New spell".
- **Code:** `src/spells/`, the pages under `src/app/(workspace)/spellbook/`, route `/spellbook`.
- **Avoid:** "skill library", "lorebook" outside explanations.

### Spell

**Proposed** in [#641](https://github.com/axolotl-logic-io/project-buddy/issues/641). A [prompt](#prompt) of instructions that the buddy loads only when they fit, as a skill is in agentic coding. A spell has a name, a [when-to-use](#when-to-use) line and [instructions](#instructions-of-a-spell). Every chat's instructions list the user's spells by id, name and when-to-use line, and the buddy [casts](#cast) one to load its instructions. A spell grants no tools: its instructions may only say how to use the tools every chat has.

The site ships built-in spells, starting with "Ask one question at a time". The user customizes, writes from scratch, tweaks, clones, renames and deletes their own.

- **UI:** "Spell", "Spells".
- **Code:** `Spell`, `SpellId`, `SPELL_IDS`, `OwnSpell`, `SpellChoice`, `spellChoices`, `src/spells/`; own spells are rows of the table `buddies` with `kind = 'spell'`.
- **Avoid:** "skill", "macro", "recipe".

### When to use

**Proposed.** The part of a [spell](#spell) that says, in one line of at most 300 characters, when the buddy should cast it. Every chat's instructions carry it beside the spell's name.

- **UI:** "When to use".
- **Code:** the `whenToUse` part, `SPELL_PART_MAX.whenToUse`.
- **Avoid:** "trigger", "description".

### Instructions (of a spell)

**Proposed.** The part of a [spell](#spell) that says what the buddy does once it casts the spell, at most 20,000 characters. Only a [cast](#cast) gives them to the buddy. An activity's instructions are a different part, which the chat's current activity always carries.

- **UI:** "Instructions".
- **Code:** the `instructions` part of `SpellParts`, `SPELL_PART_MAX.instructions`.

### Cast

**Proposed.** What the buddy does to load a [spell](#spell): it calls `cast_spell` with the spell's id, and the tool's result is the spell's name and instructions as they are then. The chat shows "Cast SPELL NAME". The saved reply keeps the result for the buddy, so a later edit to the spell changes no past chat, but the chat's page sends the instructions to no browser. An id that isn't one of the user's spells casts nothing.

- **UI:** "Cast SPELL NAME".
- **Code:** `cast_spell`, `CAST_SPELL_TOOL`, `src/spells/cast-spell.ts`, `withoutSpellInstructions`, `listMessages` (as people see a chat) and `listMessagesForModel` (as a reply reads it), the mock buddy's `/mock-cast`.
- **Avoid:** "invoke", "run", "load" in copy.

## Chats

### Chat

One conversation between the user and one buddy. Every chat is either a [project chat](#project-chat) or a [standalone chat](#standalone-chat).

- **UI:** "Chat", "Chats".
- **Code:** `Chat`, `ChatId`, `src/chats/`, table `chats`.
- **Avoid:** "lesson", and "conversation" in names. ("Conversation" is fine in prose.)

### Project chat

A chat about one project. It receives the project's memory and can update it, and can record milestones on the project's progress timeline.

- **Code:** `ProjectChat`, a `Chat` whose `project` is set.

### Standalone chat

A chat about anything, in no project. It has every ability a project chat has, except project memory and recording milestones.

- **UI:** shown with other chats under "Chats".
- **Code:** a `Chat` whose `project` is undefined, `src/chats/standalone-chat.ts`, `chats.project_id IS NULL`.
- **Avoid:** "central chat". It dates from when each user had one such chat (#315).

### Opening

The buddy's first message, ready before the chat is saved. Every chat gets one: its [prepared opening](#prepared-opening), if it has one, or else one the buddy writes, as the [activity opening](#activity-opening) of the chat's first activity says.

- **Code:** `chatOpening`, `createChatWithOpening`, the `openingKickoff` part, `NEUTRAL_KICKOFF`.
- **Avoid:** "synopsis", "first question". Use "kickoff" only for the prompt parts that ask for an opening.

### Prepared opening

An opening written ahead of time for a built-in buddy in a built-in activity, so the chat starts at once, without Claude. A buddy or activity of the user's own whose parts are still a built-in one's, such as a copy she has only renamed, gets the built-in one's. An edited one has none, so its buddy writes the opening.

- **Code:** `preparedOpening`, `src/activities/prepared-openings.ts`.

### Check-in

**Proposed.** A new project chat that the project's buddy starts on its own, on a schedule the user picks for the project: daily, a few times a week or weekly. Check-ins are off until the user turns them on. The chat is in the open chat, with the buddy of the project's newest chat, and opens with a short message, written from the project memory, about where the user left off and one small next step. The site also emails the message, with a link to the chat and a link to turn the project's check-ins off.

A check-in is a model call, so it spends the project owner's [gold](#gold); when they are out of gold, it is skipped. A project the user has worked in during the interval gets none, and neither does one whose last check-in is still [unread](#unread).

- **UI:** "Check-ins", "How often", "Off", "Daily", "A few times a week", "Weekly".
- **Code:** `src/check-ins/`, `startCheckIn`, `CHECK_IN_KICKOFF`, `CheckInFrequency`; columns `projects.check_in_frequency`, `projects.last_check_in_at`; route `/api/check-ins`, which a Vercel cron calls; page `/check-ins/off`.
- **Avoid:** "nudge", "reminder", "ping".

### Unread

**Proposed.** The state of a chat that a user hasn't opened yet. Each user has their own mark: a [check-in](#check-in) marks its new chat unread for the project's owner and each [member](#member), and opening the chat clears only the opener's mark. Chat lists, such as the Chats page and Today, mark the chats that are unread for the user viewing them.

- **UI:** "Unread".
- **Code:** `Chat.unread`, table `chat_unreads`, `src/chats/unread-marks.ts`, `markChatRead`. The column `chats.unread` is no longer read. It is still written for the chat's owner for one release, and a later release stops writing it and drops it.
- **Avoid:** "new", "unseen".

### Chat name

A chat's one-line title. A small model names a chat automatically until the user renames it.

- **Code:** `ChatName`, `chats.renamed_by_hand`.

### Chats page

The page at `/chat` for finding the user's chats again: it lists all of them, newest first, with a filter by project. Its "New chat" button opens a dialog with the new-chat form; the new chat page at `/chats/new` stays the start page of activities.

- **UI:** "Chats".
- **Avoid:** "chats hub", "all-chats page", "all-chats list".

### Today

**Proposed** in [#610](https://github.com/axolotl-logic-io/project-buddy/issues/610). The section at the top of the new chat page, the landing page, that shows what is waiting for the user: the projects they were most recently active in, each with its [next step](#next-step) and a Continue link to its latest chat, and their recent chats. Showing it makes no model call. A user with no chats sees only the new-chat form.

- **UI:** "Today", "Continue", "Recent chats".
- **Code:** `Today`, `src/today/`, `TodaySection`.
- **Avoid:** "dashboard", "home feed", "inbox".

### Image attachment

An image the user selects or pastes into a chat message. Its private bytes belong to the chat and remain available to the buddy in follow-up replies.

- **UI:** "Image", "Attach images".
- **Code:** `src/images/`, table `images`.

### Author

**Proposed** in [#629](https://github.com/axolotl-logic-io/project-buddy/issues/629). The user who wrote a user message. A message saved with no author belongs to the chat's owner. A chat shows the name of each author other than the viewer, and when a chat has more than one author, the buddy is told who wrote each message, by name or by a per-chat label such as "person 2", never by email address. For who saved a memory version, see [memory author](#memory-author).

- **UI:** the author's name, or "You" on the viewer's own messages.
- **Code:** `MessageAuthor`, `ChatMessage`, `src/chats/message-author.ts`, column `messages.user_id`, `src/replies/author-names.ts`.
- **Avoid:** "sender" and "writer".

### Reply

The buddy's answer to one user message: text, plus any tool calls. The model writes it from the global prompt, the chat's snapshots, the project memory and the conversation so far.

- **Code:** `src/replies/reply.ts`.

## Projects and memory

### Project

Something the user wants to make or learn, which they work on over several project chats. A project can be about any subject. Every project starts with an interview.

- **UI:** "Project", "Projects".
- **Code:** `Project`, `ProjectId`, `src/projects/`, table `projects`.

### Team project

**Proposed.** A project that its [owner](#owner) shares with [members](#member). Everyone in it shares its chats, project memory, notes and progress timeline. A project with no members is not a team project, though nothing else sets it apart.

In a team project chat, the chosen buddy's and activity's instructions are shared with the project's members, own ones too, through the chat's [snapshots](#snapshot). The own prompt itself stays its user's.

- **UI:** "Shared" on the owner's projects list, "Shared with you" on a member's.
- **Code:** `Project.shared`, `src/projects/members-store.ts`, `projectOpenTo` in `src/accounts/owner-scope.ts`.
- **Avoid:** "shared project" in code, "group project", "workspace".

### Owner

**Proposed.** The user who made a project. Only the owner sets its check-ins and removes its members, and the owner can't leave it. In code, "owned by" predicates select what only the owner may act on.

- **UI:** "Owner".
- **Code:** `projects.user_id`, `ProjectRole` `"owner"`, `projectOwnedBy`.

### Member

**Proposed.** A user in someone else's [team project](#team-project), who works in it as the owner does except for the owner's actions. A member can leave; the owner can remove them. Either ends their access at once, and their past messages stay. The owner sees each member's name and email address; a member sees others' names, and an email address only for someone with no name.

- **UI:** "Member", "Members", "Leave project", "Remove".
- **Code:** table `project_members`, `ProjectMember`, `ProjectRole` `"member"`.
- **Avoid:** "collaborator", "teammate", "guest".

### Project memory

One editable Markdown document per project, shared by all its chats. It holds the project's goals, milestones, progress and preferences. The user and the buddy can both change it.

- **UI:** "Memory", "Project memory".
- **Code:** `Memory`, `src/memory/`.
- **Avoid:** "project state", "shared memory".

### Memory version

One saved revision of a project's memory, numbered from 1. Version 0 means empty. Restoring a version saves it again as a new version.

- **UI:** "Version N".
- **Code:** `MemoryVersion`, `MemoryVersionNumber`, table `memory_versions`.

### Memory author

Who saved a memory version: the user or the buddy.

- **Code:** `MEMORY_AUTHORS = ["user", "buddy"]`, stored in `memory_versions.author` behind a check constraint.

### Memory change

A note in a chat that the buddy updated the project's memory.

- **UI:** "Memory change".
- **Code:** `MemoryChangePart`.
- **Avoid:** "memory change card", "memory change notice".

### Note, quick capture

**Proposed** in [#612](https://github.com/axolotl-logic-io/project-buddy/issues/612). A note is a short line the user saves to a project between chats, dated with the day they wrote it. It lives in the project's memory as a paragraph of its own, `Note (YYYY-MM-DD): text`, so the buddy reads it from the next reply on, and saving or deleting one makes a new memory version by the user. Quick capture is the header's one-tap form that saves a note, with no chat and no model call.

- **UI:** "Note", "Quick note", "Notes".
- **Code:** `Note`, `src/notes/`, `saveNote`, `deleteNote`, route `/capture`.
- **Avoid:** "memo", "jot", "inbox".

### Goal, milestone

What the user wants from a project, and the small steps toward it. The interview writes both to memory. A step she has reached can also become a [recorded milestone](#milestone-recorded) on the project's progress timeline.

### Milestone (recorded)

**Proposed.** Something the user got done in a project: one short line, in the past tense, that the buddy records from a project chat, dated and linked to that chat. The user can edit or delete it. A standalone chat can't record one, as it has no project.

- **UI:** "Milestone", "Added to the progress timeline".
- **Code:** `Milestone`, `MilestoneId`, `src/milestones/`, table `milestones`, the `record_milestone` tool, `MilestonePart`.
- **Avoid:** "achievement", "accomplishment", "streak", "log entry".

### Progress timeline

**Proposed.** A project's recorded milestones, newest first, on the project's page. It celebrates what the user has done: it never counts days or streaks, or points out a pause.

- **UI:** "Progress".
- **Code:** `ProgressTimeline`, `listMilestones`, `PROGRESS_TIMELINE_COPY`.
- **Avoid:** "activity log", "history" (the memory's versions have the history), "streak".

### Next step

**Proposed** in [#610](https://github.com/axolotl-logic-io/project-buddy/issues/610). The one small thing the user means to do next in a project, kept in its [project memory](#project-memory) on a line that starts "Next step:". The buddy keeps it current through `update_memory`, and the user can edit it on the memory page. [Today](#today) shows it beside the project. It is smaller than a milestone: the first action toward the next one.

- **UI:** "Next step:".
- **Code:** `nextStepOf`, `NEXT_STEP_LABEL`, `src/memory/next-step.ts`.
- **Avoid:** "todo", "task", "action item".

## Tools

### Tool

A function that the model can call during a reply. Each tool has a contract, a description, and a [tool part](#tool-part) that shows its call in the chat. Tools are available across activities, subject to their requirements. For example, updating memory and recording a milestone require a project chat. An activity guides what the user and buddy are doing together; it does not grant tools.

| Tool | Comes with |
|---|---|
| `search_blender_manual` | Every chat: searches the Blender manual |
| `cite_blender_manual` | Every chat: cites Blender manual sections |
| `select_activity` | Every chat: enters one of the user's activities |
| `cast_spell` | Every chat: [casts](#cast) one of the user's spells |
| `update_memory` | Project chats |
| `record_milestone` | Project chats: adds a milestone to the progress timeline |
| `create_project` | Every chat |
| `generate_image` | Every chat: creates a private image and saves it in Image gallery |

Tools remain functions that the model calls. A [spell](#spell) is instructions, not a tool: casting one is a call to the `cast_spell` tool, and a spell's instructions may say how to use the other tools, but never add one.

Messages saved before #549 named the Blender manual tools `search_manual` and `cite_manual`; migration 0016 renamed them.

### Tool part

How a tool call appears in a chat: inline in the reply, or under it.

- **Code:** `TOOL_PARTS`, `placement`, `placementOf`.

## Blender manual

### Blender manual lookup

Searching the Blender manual and citing what the buddy read, using `search_blender_manual` and `cite_blender_manual`. A buddy uses these tools when the user’s question needs Blender facts. The tools are available in every activity.

- **Code:** `src/blender-manual/`.

### Blender manual

The Blender Reference Manual, for the current Blender release. The site keeps its own index of it. Name it "Blender manual" in full.

- **UI:** "the Blender manual".
- **Code:** `src/blender-manual/`, `MANUAL_BRANCH`, `manualUrl`.
- **Avoid:** "the manual" alone.

### Manual section

One heading of the Blender manual and its text: the unit that a search returns and a citation links to.

- **Code:** `ManualSection`, table `manual_sections`.

### Manual index, reindex

The searchable copy of the Blender manual in the database, and the command that rebuilds it from the manual's Git repository.

- **Code:** `reindexManual`, `cloneManual`.

### Lookup

One call to a search tool, such as `search_blender_manual`.

- **UI:** "Searching the manual for …", the **Search and tool lines** extra.

### Working note

Text a buddy writes before a lookup or a spell [cast](#cast), shown muted above it.

- **Code:** `textBefore: "working-note"`.

### Citation

A link to a manual section, shown under a reply, from a `cite_blender_manual` call.

- **UI:** "From the Blender manual".
- **Code:** `ManualCitationsPart`.
- **Avoid:** "manual credit", which is the licence credit on the Credits page.

### Manual credit

The CC BY-SA 4.0 credit for the Blender Reference Manual on the public Credits page, linked from every page's menu.

## Preferences

### Extra

An optional part of the site that the user can switch on or off in Settings. Extras only change what is shown.

- **UI:** "Extras", "switch".
- **Code:** `Flag`, `FLAGS`, `FlagId` (`src/flags/flags.ts`); column `users.hidden_extras`; cookie `hidden-extras`; attribute `data-extra`.
- **Avoid:** "feature flag", which suggests a deploy-time switch. In code, "flag" is the type name for an extra.

The column `users.hidden_extras` stores the ids of extras switched away from their defaults, not only hidden ones. Ids of extras that no longer exist, such as those a browser\'s cookie still holds, are ignored when read. Stored ids are renamed or removed along with the extras: migration 0016 removed the ids of the extras #549 retired.

### Theme, mode

A theme is a whole look: Gravy Falls, Ghost Hasslers or Ay, Liens!. A mode is Light, Dark or System. The browser stores both.

- **UI:** "Appearance", "Theme", "Mode".

## Installed app and notifications

### Installed app

Project Buddy added to a phone's Home Screen, where it opens in a window of its own. It is the same site: nothing is stored for use offline.

- **UI:** "Add to Home Screen", "Install app", as the phone's browser names them.
- **Code:** the web app manifest `src/app/manifest.ts`; the colours and icons in `src/ui/web-app.ts`.
- **Avoid:** "PWA" and "progressive web app" in copy; "native app".

### Notification

A message the site sends to the user's devices, which appears even when the site is closed. Tapping it opens a page of the site.

- **UI:** "Notifications", "Send a test notification".
- **Code:** `PushNotification`, `sendPushNotification` (`src/push/send-push-notification.ts`); the service worker `public/sw.js` shows them.
- **Avoid:** "alert", which is an error message on the page; "push" alone in copy.

### Device

One browser on one of the user's phones or computers, as far as notifications go. The user turns notifications on or off for each device separately, in Settings.

- **UI:** "this device".
- **Code:** a push subscription: `SavedPushSubscription`, table `push_subscriptions`, keyed by the push service's endpoint (`src/push/push-subscriptions.ts`). `src/push/push-device.ts` is the browser's side.
- **Avoid:** "registration", "token".

## Accounts and access

### User

A person with an account, found by email.

- **UI:** "Account".
- **Code:** `User`, `UserId`, table `users`.

### Role

A user's role: `user` or `admin`. The admin role grants only the right to send invitations, and no access to other users' data.

### Owner

The user that a row belongs to. Every query on user data is scoped to its owner, so another user's item reads as not found.

- **Code:** `owner: UserId`, `src/accounts/owner-scope.ts`.
- **Avoid:** "owner" for the person who runs the site. Say **site owner** for that, or Axlog when a decision is theirs.

### Invitation, setup link

An admin invites an email address. The invitation email carries a setup link, which never expires and works once. Confirming it creates an ordinary account. A newer invitation to the same address replaces the link.

- **UI:** "Invitation", "Set up my account".
- **Code:** `invitations`, `acceptInvitation`, route `/setup`.

### Project invitation

**Proposed** in [#628](https://github.com/axolotl-logic-io/project-buddy/issues/628). A project's [owner](#owner) asks someone to join the project as a [member](#member), by their email address. The invitee joins or declines; until then the invitation is pending, and the owner can revoke it. A newer invitation to the same address replaces the pending one. A project invitation can't create an account, and doesn't show who has one: for an address with an account it is saved and emailed; for an address with none it is saved by the address alone and sent to no one, and the owner sees both the same way, in the answer ("If ADDRESS has a Project Buddy account, we've sent them a project invitation"), the send limits and the pending invitations. One saved by address can be seen and answered only by an account with that address, once an admin's [invitation](#invitation-setup-link), the only way someone new comes to the site, has made one. The email holds a [sign-in link](#sign-in-link) that opens the invitation's page.

- **UI:** "Invite someone", "Pending invitations", "Revoke", "Project invitations", "Join", "Decline".
- **Code:** `src/projects/project-invitations.ts`, `inviteToProject`, `joinProject`, `ProjectInvitation`, `ProjectInvitationId`, table `project_invitations`, route `/projects/invitations/[token]`.
- **Avoid:** "invitation" alone, which is an admin's invitation to the site; "share", "add" for inviting.

### Sign-in link

An emailed link that signs in an existing user. It works for 30 minutes and can be used more than once.

- **UI:** "sign-in link".
- **Code:** `src/accounts/sign-in-links.ts`, `sendSignInLink`, `signInLinks`; table `login_links`, routes `/login` and `/login/link`.
- **Avoid:** "login link", except in the table's and the routes' names.

### Session, sign out everywhere

A session is a signed cookie that lasts 30 days. Signing out everywhere raises the user's session epoch, which ends every earlier session and deletes their sign-in links.

## Images

### Generated image

An image a buddy creates with `generate_image` at the user’s request. It belongs to its source chat, shares private storage with uploaded images, and spends the owner’s [gold](#gold).

### Image gallery

The owner’s generated images, with prompts, downloads and source-chat links, at `/gallery`. Deleting a source chat also deletes its generated images.

## Usage

### Gold

**Proposed.** The one balance of model spend each user has: model calls spend it, and it never resets. 1 gold is $0.01 of model spend; users only ever see gold, never dollars or the rate, which lives in `src/gold/gold.ts`. Every account starts with 100 gold, once, when it is made. Each model call spends the gold of the user who caused it: a reply, and any image or chat name it makes, the user who sent the message; a new chat's opening, the user who starts the chat; a check-in, the project's owner. A new model call is refused once the balance is under 1 whole gold, so whenever the account page shows "Gold: 0" ("You're out of gold."); a call already under way finishes, so a balance may end a little below 0. Gold moves between users only by a transfer, such as a Marketplace sale, where the buyer's gold goes to the seller.

- **UI:** "gold", such as "100 gold"; "You're out of gold."
- **Code:** `src/gold/`, `checkGold`, `chargeGold`, `transferGold`, the error case `out-of-gold`; tables `gold_balances` and `gold_ledger`.
- **Avoid:** "credits" (see [Credit](#credit)), "coins", "tokens", "budget", "quota", "spend" (as a noun; the verb, as in "spends your gold", is fine) and "monthly usage" in UI copy.

### Gold balance

**Proposed.** How much gold a user has, stored in micro-USD so that no call's cost rounds away, and shown as whole gold rounded down, with a balance below 0 shown as 0. The account page shows it, such as "Gold: 87", as the **Gold balance** extra (stored id `usage-meter`). The ledger keeps every grant and transfer that changed it (the starting grant, Marketplace sales and purchases), with its reason and the ids it relates to, and holds one row per user, reason and reference id, so a repeated transfer moves nothing again; model-call charges change the balance in place and are not written there.

- **UI:** "Gold: 87", the **Gold balance** extra.
- **Code:** `readGoldBalance`, `wholeGold`, `readGoldLedger`; tables `gold_balances`, `gold_ledger`.
- **Avoid:** "usage meter", except as the extra's stored id.

### Credit

The Anthropic account's prepaid balance. Running out of credit (`out-of-credits`) is not the same as a user running out of gold (`out-of-gold`).

- **Avoid:** "credits" for gold.

## Marketplace

### Marketplace

**Proposed** in [#643](https://github.com/axolotl-logic-io/project-buddy/issues/643). The page where users share their own buddies, activities and spells and sell them to each other for gold. Every signed-in user sees what is listed, newest first, filtered by kind, and their own listings under Your listings.

- **UI:** "Marketplace", "Sell in the Marketplace", "Your listings".
- **Code:** `src/marketplace/`, route `/marketplace`.
- **Avoid:** "store", "shop" in UI copy.

### Listing

**Proposed.** A published copy of one of a [seller](#seller)'s own prompts, of any kind: its name and parts as they were when the seller last published it, a description of at most 500 characters, shown as plain text, and a price in whole gold, from 0 to 10,000. A price of 0 is a free listing, which is how a user simply shares a prompt. Edits to the seller's prompt reach the listing only when the seller updates it. Unlisting stops new sales. A listing's parts are never shown, only its buyers' copies' are. A prompt whose parts are still a built-in one's, or a [bought prompt](#bought-prompt), can't be listed.

- **UI:** "listing", "Update listing", "Unlist", "Free", "25 gold".
- **Code:** `ListingId`, `publishListing`, `updateListing`, `unlistListing` (`src/marketplace/listing-store.ts`); table `listings`; the "listed" predicates in `src/accounts/owner-scope.ts`.
- **Avoid:** "share link", "product", "item".

### Seller

**Proposed.** The user who published a listing. Only they update or unlist it. Others see the seller's name, or "A Project Buddy user" for someone with no name, never an email address.

- **Code:** `listings.seller_id`, `listingSoldBy`.

### Buy

**Proposed.** To get one's own copy of someone else's listing: the buyer's gold moves to the seller, all at once with saving the copy, or nothing changes. A free listing moves no gold ("Get for free"). A buyer holds at most one copy of a listing; once they delete it, buying again charges again.

- **UI:** "Buy for 25 gold", "Get for free".
- **Code:** `buyListing` (`src/marketplace/buy-listing.ts`); table `purchases`.
- **Avoid:** "purchase" in UI copy.

### Bought prompt

**Proposed.** An own prompt a user got by buying a listing, or cloned from one. It is an ordinary own prompt, except that it can't be listed. Its instructions are another user's, but the tools stay the buyer's own, so it can't reach anyone else's data.

- **Code:** `OwnPrompt.boughtFrom`, column `buddies.bought_from`, which clones inherit.

## Code layout

The code in `apps/web/src/` follows this glossary:

| Path | Holds |
|---|---|
| `prompts/` | The shared model for buddies, activities and spells: prompt kinds, snapshots, and the store of own prompts, with customize, write from scratch, clone and rename |
| `buddies/` | The built-in buddies, the buddy parts (voice, habits) and the own buddy store |
| `activities/` | The built-in activities (open chat, interview, brainstorming, project breakdown), own activities, activity sessions and the `select_activity` tool |
| `spells/` | **Proposed:** the built-in spells, the spell parts (when to use, instructions), the own spell store, the spell list and the `cast_spell` tool |
| `blender-manual/` | The Blender manual lookup: its prompt, its two tools, the index, reindex and search |
| `replies/` | Writing a reply: the model, the instructions assembly, the global prompt, the chat tools, answer-now, chat naming, the mock model |
| `chats/` | Chats, messages and the chat stores |
| `check-ins/` | Check-ins: their schedules, the check-in kickoff, the scheduler's run and the link to turn them off |
| `gold/` | **Proposed:** gold: the rate, the balance store with charges, the starting grant, transfers and the ledger |
| `quota/` | The one gate to Claude (`checkGold` and `QuotaGrant`), model-call prices and the spend meter that charges each call to gold |
| `notes/` | **Proposed:** notes, their paragraphs in a project's memory, and the note store over the memory store |
| `today/` | Today: what the landing page shows is waiting, and the store that reads it |
| `marketplace/` | **Proposed:** the Marketplace: listings, their terms, and buying |
| `push/` | Notifications: each device's push subscription, sending a notification, and the Settings switch's browser side and Server Actions |

The layout removed these concepts:

- **Two kinds of chat with two tool sets.** `ProjectTools`, `CentralTools`, `CentralChat`, `ChatPlace` and `kind: "central"` collapse into one chat type with one tool set. Only `update_memory` depends on whether the chat has a project.
- **Mechanics parts on buddies.** The interview and kickoffs move to activities, the citation rules and tool descriptions to the Blender manual tools, and the memory rules and answer-now note to the global prompt. A buddy is left with its name, voice and habits.
- **Extras that change prompts.** `BUDDY_SKILL_FLAGS` and the brainstorming and project-breakdown extras go, because brainstorming and project breakdown become activities. Every extra then only changes what is shown.
- **The buddy prompt mechanics and interview buddy extras.** Mechanics parts left buddies, and every start page picks a buddy.
- **The interview chat pointer.** A chat's activity sessions say whether it is in the interview. Migration 0018 drops `projects.interview_chat_id`.

## Words to retire

Each rename goes all the way: copy, prompts, docs, code names, environment settings and stored values.

| Word | Use instead | Where it survives |
|---|---|---|
| Tutor | Buddy | Nowhere |
| Persona | Buddy | Extra ids `persona-mechanics` and `interview-persona` in browsers' cookies, which are ignored when read |
| Central chat | Standalone chat | Nowhere |
| Lesson | Chat, project chat | Nowhere |
| Skill | Tool for a callable capability; activity for what the user and buddy are doing together | Retired in the domain modelling session on 2026-10-31 |
| Planning skill | Activity | Extra ids `brainstorming` and `project-breakdown` in browsers' cookies, which are ignored when read |
| `search_manual`, `cite_manual` | `search_blender_manual`, `cite_blender_manual` | Nowhere |
| Teaching rules | Habits | Nowhere |
| Login link | Sign-in link | The table `login_links` and the routes `/login` and `/login/link` |
| Quota, monthly quota | Gold | The module paths `src/quota/` and `QuotaGrant`, the gate to Claude; saved tool results with the status `quotaUsedUp` |
| Spend, monthly usage | Gold balance | The table `monthly_spend`, which nothing reads, until a later release drops it; the extra id `usage-meter` |

## Blender's place

Before #549, Blender was the site's purpose. Since then:

- **Purpose:** the tagline, the role prompt and the chat-naming prompt are subject-neutral.
- **Off-topic steering:** the buddy no longer answers non-Blender questions briefly and steers back to the project. The use case `use_case_ask_any_subject` tests this.
- **Citation rules:** they are the Blender manual lookup instructions (`src/blender-manual/lookup-prompt.ts`).
- **Interview:** it asks what the user already knows, and its milestones aren't Blender steps.
- **Shared rules and buddy voices:** they carry no Blender lines.
- **Snapshots:** chats started before #549 keep their Blender text.

## Open questions

Add new questions here as they come up.

- **Note or quick capture** ([#612](https://github.com/axolotl-logic-io/project-buddy/issues/612)): keep both words, "note" for the thing and "quick capture" for the form, or settle on one.
