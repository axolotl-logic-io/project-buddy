# Glossary

This glossary records the domain language of Project Buddy: the words that users, docs, prompts and code use for the same things. Use these words in code, copy, prompts, docs and issues. When you need a new word, add it here first.

Status: written in a domain modelling session on 2026-10-29 for [issue #544, Blender non-specific](https://github.com/axolotl-logic-io/project-buddy/issues/544), and followed by the code since [#549](https://github.com/axolotl-logic-io/project-buddy/issues/549). **Decided** marks a choice Autumn made that the code and docs don't follow yet. **Proposed** marks a choice still waiting for a decision. [Open questions](#open-questions) lists what is left.

Each entry gives:

- **UI:** the word users see.
- **Code:** the type, module or table name.
- **Avoid:** other names for the same thing, which should be replaced.

## Core model

Three concepts shape every chat:

- A **[buddy](#buddy)** is who the user talks with: a character, its voice and its habits.
- A **[skill](#skill)** is something the buddy can do in any chat, which it uses only when it helps, such as looking up the Blender manual.
- An **[activity](#activity)** is a skill that sets the scene a chat plays out, such as an interview, brainstorming or an open chat. The user can also start a chat with an activity, from its [start page](#start-page). The current activity can change during the chat.

Buddies and activities are [prompts](#prompt) that the user can customize: the site ships built-in ones, and the user can make their own from them, then edit and rename them. Skills that aren't activities are built in and fixed.

A chat is a [project chat](#project-chat) or a [standalone chat](#standalone-chat). Both have the same abilities, except that only a project chat has project memory.

## Product

### Project Buddy

The product: a personal site where buddies help each user with their own projects and ideas, on any subject. Blender is not the site's purpose. The [Blender manual lookup](#blender-manual-lookup) is one skill among others.

- **UI:** "Project Buddy" (`src/ui/copy/site.ts:6`).
- **Code:** the repository `project-buddy`.
- **Avoid:** "Project Buddies", "Blender AI tutor", "the Blender tutor", "Blender tutor site".

## Prompts

### Prompt

A buddy or an activity: named text that the site puts into the model's instructions, and that the user can customize. Use "prompt" for the two together; use the specific word when you mean one kind.

Skills that aren't activities are not prompts in this sense. They are built in, and users can't customize them for now.

- **Code:** `PromptKind` (`"buddy"` or `"activity"`), `PromptSnapshot`, `src/prompts/`.

### Built-in prompt

A buddy or activity that ships with the site. Built-in prompts are read-only.

### Own prompt

A user's private, editable buddy or activity, made from a built-in prompt or another own prompt.

- **UI:** "your own buddies", "One of your own buddies.", "your activities".
- **Code:** `OwnPrompt`, `OwnPromptId`, `OwnBuddy`, `OwnActivity`, `src/prompts/own-prompt-store.ts`, table `buddies` with its `kind` column. **Proposed:** a later release renames the table `prompts`.
- **Avoid:** "custom buddy", "user persona".

### Customize, tweak, clone, rename

The ways to change a prompt. To **customize** is to make an own copy of a built-in prompt. To **tweak** is to edit an own prompt in place. To **clone** is to copy an own prompt as "NAME (clone)". To **rename** is to change an own prompt's name.

### Prompt part

A named section of a prompt. Static parts are text that the user can edit on an own prompt. Dynamic parts are filled in for each chat, such as the project memory, the project name and the date.

- **UI:** "part".
- **Code:** `BuddyParts` and `ActivityParts` keys, `BUDDY_PART_KEYS`, `ACTIVITY_PART_KEYS`.

### Snapshot

A copy of a prompt's name and parts, kept with a chat. Later edits to the prompt, or to the defaults, don't change the chat. A chat keeps a snapshot of its buddy when it starts, and a snapshot of each activity it enters, with the message where the activity started. Chats started before #549 keep their Blender text.

Built-in skills have no snapshots: like the global prompt, they change for every chat when the site changes.

- **Code:** `BuddySnapshot`, `ActivitySnapshot`; columns `chats.buddy_name`, `chats.buddy_parts`, and `activity_sessions.activity_name`, `activity_sessions.activity_parts`.

### Global prompt

Instructions that every chat gets, whatever its buddy and activity: the role, the shared rules, the built-in skills, and the rules for tools that every chat has. Users can't edit global prompts.

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

## Skills

### Skill

Something the buddy can do in any chat, which it uses only when it helps. The site defines every skill. A skill can bring its own tools.

There are two kinds:

- A **[built-in skill](#built-in-skill)** is fixed. Users can't customize it for now.
- An **[activity](#activity)** is a skill that sets the scene a chat plays out. Users can customize activities.

- **Avoid:** "planning skill", "planning controls", "prompt choices".

### Built-in skill

A skill that isn't an activity. Every chat has every built-in skill. Built-in skills are part of the global prompt.

| Skill | What it does | Tools | Code |
|---|---|---|---|
| Blender manual lookup | Searches and cites the Blender manual | `search_blender_manual`, `cite_blender_manual` | `src/skills/blender-manual/` |

### Blender manual lookup

The built-in skill of searching the Blender manual and citing what the buddy read. A buddy uses it when the user's question needs Blender facts, and doesn't have to use it otherwise.

It is not behind an extra or feature flag for now.

## Activities

### Activity

A skill that sets the scene a chat plays out, like a scenario in a role-play chat. An activity is also a [prompt](#prompt): there are built-in activities, and the user can customize them into their own.

An activity differs from a built-in skill in two ways:

- The user can start a chat with it, from its [start page](#start-page).
- While it is the [current activity](#current-activity), its prompt sets the scene for the chat.

The buddy sees every activity the user has, built-in and own, in its list of activities. To use one, it calls `select_activity`.

- **UI:** "Activity", "Activities".
- **Code:** `Activity`, `ActivityId`, `src/activities/`.
- **Avoid:** "mode", which is a theme setting, and "scene" outside explanations.

### Start page

The page where the user starts a chat with an activity. The user picks the buddy there too.

The interview's start page is the new project page. Every other activity, built-in or own, starts from the new chat page with the activity chosen, at `/chats/new?activity=ACTIVITY_ID`, where `ACTIVITY_ID` is the activity's id.

### Current activity

The activity a chat is in now. The chat page shows it in a form that also lets the user change it. The buddy changes it by calling `select_activity`, and the page shows the change once the reply has finished.

- **Code:** `currentActivity`, `ActivityForm`, `changeActivityAction`.

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
| Interview | The buddy asks about a new project, then writes the first goals and milestones to memory. It is the default when the user starts a project. | The new project page | `interview` |
| Brainstorming | The buddy helps the user generate and sort ideas. | The new chat page | `brainstorming` |
| Project breakdown | The buddy helps the user split a project into steps. | The new chat page | `project-breakdown` |

### Own activity

A user's private, editable activity, made by customizing a built-in activity or cloning another own activity.

### Interview

The built-in activity that starts every project. The buddy asks what the user wants to make or learn and what they already know, then writes the first goals and milestones to the project memory.

- **UI:** "Project interview".
- **Code:** `INTERVIEW_ACTIVITY_ID`, `src/activities/interview.ts`, `interviewChatOf`. Before #549, the column `projects.interview_chat_id` named the interview chat; migration 0018 drops it.

A standalone chat can't enter the interview, which needs a project's memory. The buddy calls `create_project` instead, and the interview continues in the new project's chat.

### Open chat

The built-in activity with no set scene. It is the default when the user picks no activity.

## Chats

### Chat

One conversation between the user and one buddy. Every chat is either a [project chat](#project-chat) or a [standalone chat](#standalone-chat).

- **UI:** "Chat", "Chats".
- **Code:** `Chat`, `ChatId`, `src/chats/`, table `chats`.
- **Avoid:** "lesson", and "conversation" in names. ("Conversation" is fine in prose.)

### Project chat

A chat about one project. It receives the project's memory and can update it.

- **Code:** `ProjectChat`, a `Chat` whose `project` is set.

### Standalone chat

A chat about anything, in no project. It has every ability a project chat has, except project memory.

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

### Chat name

A chat's one-line title. A small model names a chat automatically until the user renames it.

- **Code:** `ChatName`, `chats.renamed_by_hand`.

### Chats page

The page at `/chat` that lists all the user's chats, with a filter by project.

- **UI:** "Chats".
- **Avoid:** "chats hub", "all-chats page", "all-chats list".

### Image attachment

An image the user selects or pastes into a chat message. Its private bytes belong to the chat and remain available to the buddy in follow-up replies.

- **UI:** "Image", "Attach images".
- **Code:** `src/images/`, table `images`.

### Reply

The buddy's answer to one user message: text, plus any tool calls. The model writes it from the global prompt, the chat's snapshots, the project memory and the conversation so far.

- **Code:** `src/replies/reply.ts`.

## Projects and memory

### Project

Something the user wants to make or learn, which they work on over several project chats. A project can be about any subject. Every project starts with an interview.

- **UI:** "Project", "Projects".
- **Code:** `Project`, `ProjectId`, `src/projects/`, table `projects`.

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

### Goal, milestone

What the user wants from a project, and the small steps toward it. The interview writes both to memory.

## Tools

### Tool

A function that the model can call during a reply. Each tool has a contract, a description, and a [tool part](#tool-part) that shows its call in the chat. A built-in skill's tools come with the skill. Other tools come with every chat.

| Tool | Comes with |
|---|---|
| `search_blender_manual` | Blender manual lookup skill |
| `cite_blender_manual` | Blender manual lookup skill |
| `select_activity` | Every chat: enters one of the user's activities |
| `update_memory` | Project chats |
| `create_project` | Every chat |

Messages saved before #549 named the Blender manual tools `search_manual` and `cite_manual`; migration 0016 renamed them.

### Tool part

How a tool call appears in a chat: inline in the reply, or under it.

- **Code:** `TOOL_PARTS`, `placement`, `placementOf`.

## Blender manual

### Blender manual

The Blender Reference Manual, for the current Blender release. The site keeps its own index of it. Name it "Blender manual" in full.

- **UI:** "the Blender manual".
- **Code:** `src/skills/blender-manual/`, `MANUAL_BRANCH`, `manualUrl`.
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

Text a buddy writes before a lookup, shown muted above it.

- **Code:** `textBefore: "working-note"`.

### Citation

A link to a manual section, shown under a reply, from a `cite_blender_manual` call.

- **UI:** "From the Blender manual".
- **Code:** `ManualCitationsPart`.
- **Avoid:** "manual credit", which is the licence credit on the Credits page.

### Manual credit

The CC BY-SA 4.0 credit for the Blender Reference Manual on the public Credits page, linked from every page's footer.

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

An admin invites an email address. The invitation email carries a setup link, which lasts 30 minutes and works once. Confirming it creates an ordinary account.

- **UI:** "Invitation", "Set up my account".
- **Code:** `invitations`, `acceptInvitation`, route `/setup`.

### Sign-in link

An emailed link that signs in an existing user. It works for 30 minutes and can be used more than once.

- **UI:** "sign-in link".
- **Code:** `src/accounts/sign-in-links.ts`, `sendSignInLink`, `signInLinks`; table `login_links`, routes `/login` and `/login/link`.
- **Avoid:** "login link", except in the table's and the routes' names.

### Session, sign out everywhere

A session is a signed cookie that lasts 30 days. Signing out everywhere raises the user's session epoch, which ends every earlier session and deletes their sign-in links.

## Usage

### Quota

Each user's limit on model spending: $5 per UTC calendar month.

- **Code:** `MONTHLY_QUOTA_MICRO_USD`, `checkQuota`.

### Spend

What a user's model calls cost this month, in micro-USD.

- **UI:** "This month", the **Usage meter** extra.
- **Code:** table `monthly_spend`, `recordSpend`, `MonthlyUsage`.
- **Avoid:** "token spend", "Claude quota".

### Credit

The Anthropic account's prepaid balance. Running out of credit (`out-of-credits`) is not the same as a user using up their quota (`quota-used-up`).

## Code layout

The code in `apps/web/src/` follows this glossary:

| Path | Holds |
|---|---|
| `prompts/` | The shared model for buddies and activities: prompt kinds, snapshots, and the store of own prompts, with customize, clone and rename |
| `buddies/` | The built-in buddies, the buddy parts (voice, habits) and the own buddy store |
| `activities/` | The built-in activities (open chat, interview, brainstorming, project breakdown), own activities, activity sessions and the `select_activity` tool |
| `skills/blender-manual/` | The Blender manual lookup: its prompt, its two tools, the index, reindex and search |
| `replies/` | Writing a reply: the model, the instructions assembly, the global prompt, the chat tools, answer-now, chat naming, the mock model |
| `chats/` | Chats, messages and the chat stores |

The layout removed these concepts:

- **Two kinds of chat with two tool sets.** `ProjectTools`, `CentralTools`, `CentralChat`, `ChatPlace` and `kind: "central"` collapse into one chat type with one tool set. Only `update_memory` depends on whether the chat has a project.
- **Mechanics parts on buddies.** The interview and kickoffs move to activities, the citation rules and tool descriptions to built-in skills, and the memory rules and answer-now note to the global prompt. A buddy is left with its name, voice and habits.
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
| Planning skill | Activity | Extra ids `brainstorming` and `project-breakdown` in browsers' cookies, which are ignored when read |
| `search_manual`, `cite_manual` | `search_blender_manual`, `cite_blender_manual` | Nowhere |
| Teaching rules | Habits | Nowhere |
| Login link | Sign-in link | The table `login_links` and the routes `/login` and `/login/link` |

## Blender's place

Before #549, Blender was the site's purpose. Since then:

- **Purpose:** the tagline, the role prompt and the chat-naming prompt are subject-neutral.
- **Off-topic steering:** the buddy no longer answers non-Blender questions briefly and steers back to the project. The use case `use_case_ask_any_subject` tests this.
- **Citation rules:** they are the Blender manual lookup skill's prompt (`src/skills/blender-manual/skill-prompt.ts`).
- **Interview:** it asks what the user already knows, and its milestones aren't Blender steps.
- **Shared rules and buddy voices:** they carry no Blender lines.
- **Snapshots:** chats started before #549 keep their Blender text.

## Open questions

None. Add new questions here as they come up.
