# Glossary

This glossary records the domain language of Project Buddy: the words that users, docs, prompts and code use for the same things. Use these words in code, copy, prompts, docs and issues. When you need a new word, add it here first.

Status: draft from a domain modelling session on 2026-10-29, written to prepare [issue #544, Blender non-specific](https://github.com/axolotl-logic-io/project-buddy/issues/544). **Decided** marks a choice Autumn made in that session that the code and docs don't follow yet. **Proposed** marks a choice still waiting for a decision. [Open questions](#open-questions) lists what is left.

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

**Decided:** a buddy or an activity: named text that the site puts into the model's instructions, and that the user can customize. Use "prompt" for the two together; use the specific word when you mean one kind.

**Decided:** skills that aren't activities are not prompts in this sense. They are built in, and users can't customize them for now.

- **Code:** **Proposed:** `Prompt` with a `kind` of `"buddy"` or `"activity"`, in `src/prompts/`.

### Built-in prompt

A buddy or activity that ships with the site. Built-in prompts are read-only.

### Own prompt

A user's private, editable buddy or activity, made from a built-in prompt or another own prompt.

- **UI:** "your own buddies", "One of your own buddies."
- **Code:** today `UserBuddy`, `UserBuddyId`, `OwnBuddyChoice`, table `buddies`.
- **Avoid:** "custom buddy", "user persona".

### Customize, tweak, clone, rename

The ways to change a prompt. To **customize** is to make an own copy of a built-in prompt. To **tweak** is to edit an own prompt in place. To **clone** is to copy an own prompt as "NAME (clone)". To **rename** is to change an own prompt's name.

### Prompt part

A named section of a prompt. Static parts are text that the user can edit on an own prompt. Dynamic parts are filled in for each chat, such as the project memory, the project name and the date.

- **UI:** "part".
- **Code:** today `BuddyParts` keys, `BUDDY_PART_KEYS`.

### Snapshot

A copy of a prompt's name and parts, kept with a chat. Later edits to the prompt, or to the defaults, don't change the chat. A chat keeps a snapshot of its buddy when it starts. **Decided:** it also keeps a snapshot of each activity it enters, with the message where the activity started. Chats started before #544 keep their Blender text.

Built-in skills have no snapshots: like the global prompt, they change for every chat when the site changes.

- **Code:** today `BuddySnapshot`; columns `chats.buddy_name`, `chats.buddy_parts`.

### Global prompt

Instructions that every chat gets, whatever its buddy and activity: the role, the shared rules, the built-in skills, and the rules for tools that every chat has. Users can't edit global prompts.

## Buddies

### Buddy

A character who talks with the user in a chat. A buddy has a [voice](#voice) and [habits](#habits). Each chat has exactly one buddy, chosen when the chat starts.

**Decided:** "buddy" is the only word for whoever answers the user. It replaces "tutor" and "persona" everywhere, including code and stored values.

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

**Decided:** the part that sets how a buddy works with the user, as a Markdown list. For example, Hippy checks in between steps, closes with a calm recap, and reassures the user before giving a fix. Where the voice is how the buddy talks, the habits are how it helps.

Habits hold the buddy's personal style, which carries across every activity. Setting the scene and opening the chat belong to the [activity](#activity), not to habits.

- **Code:** today `teachingRules`; becomes `habits`.
- **Avoid:** "teaching rules".

## Skills

### Skill

**Decided:** something the buddy can do in any chat, which it uses only when it helps. The site defines every skill. A skill can bring its own tools.

There are two kinds:

- A **[built-in skill](#built-in-skill)** is fixed. Users can't customize it for now.
- An **[activity](#activity)** is a skill that sets the scene a chat plays out. Users can customize activities.

- **Avoid:** "planning skill", "planning controls", "prompt choices".

### Built-in skill

A skill that isn't an activity. Every chat has every built-in skill. Built-in skills are part of the global prompt.

| Skill | What it does | Tools | Code today |
|---|---|---|---|
| Blender manual lookup | Searches and cites the Blender manual | `search_blender_manual`, `cite_blender_manual` | `citation` part on each buddy, the manual tools |

### Blender manual lookup

The built-in skill of searching the Blender manual and citing what the buddy read. A buddy uses it when the user's question needs Blender facts, and doesn't have to use it otherwise.

**Decided:** it is not behind an extra or feature flag for now.

## Activities

### Activity

**Decided:** a skill that sets the scene a chat plays out, like a scenario in a role-play chat. An activity is also a [prompt](#prompt): there are built-in activities, and the user can customize them into their own.

An activity differs from a built-in skill in two ways:

- The user can start a chat with it, from its [start page](#start-page).
- While it is the [current activity](#current-activity), its prompt sets the scene for the chat.

The buddy sees every activity the user has, built-in and own, in its list of skills. To use one, it calls `select_activity`.

- **UI:** **Proposed:** "Activity".
- **Code:** **Proposed:** `Activity`, `src/activities/`.
- **Avoid:** "mode", which is a theme setting, and "scene" outside explanations.

### Start page

The page where the user starts a chat with an activity. The user picks the buddy there too.

**Decided:** the interview's start page is the new project page. Every other activity, built-in or own, starts from the new chat page with the activity chosen, at `/chats/new?activity=ACTIVITY_ID`, where `ACTIVITY_ID` is the activity's id.

### Current activity

The activity a chat is in now. The chat shows it in an element that also lets the user override it. The buddy changes it by calling `select_activity`, which also updates the element.

### Activity session

**Decided:** the stretch of a chat spent in one activity, from the message where the activity started until the next change or the end of the chat.

### Activity opening

**Decided:** each activity has its own opening kickoff part, which tells the buddy how to open a chat that starts in that activity.

### Built-in activity

An activity that ships with the site. There are four so far:

| Activity | What happens | Start page | Code today |
|---|---|---|---|
| Open chat | No set scene: the buddy follows the user's lead. It is the default when the user picks no activity. | The new chat page | The `centralChat` and `neutralKickoff` parts |
| Interview | The buddy asks about a new project, then writes the first goals and milestones to memory. It is the default when the user starts a project. | The new project page | The `interview` part |
| Brainstorming | The buddy helps the user generate and sort ideas. | The new chat page | The `brainstorming` part on each buddy, an extra |
| Project breakdown | The buddy helps the user split a project into steps. | The new chat page | The `projectBreakdown` part on each buddy, an extra |

### Own activity

A user's private, editable activity, made by customizing a built-in activity or cloning another own activity.

### Interview

The built-in activity that starts every project. The buddy asks what the user wants to make or learn and what they already know, then writes the first goals and milestones to the project memory.

- **UI:** "Project interview".
- **Code:** today the `interview` part, `projects.interview_chat_id`, `isInterviewChat`.

**Decided:** a standalone chat can enter the interview. The buddy first calls `create_project`, and the interview continues in the new project's chat.

### Open chat

The built-in activity with no set scene. It is the default when the user picks no activity.

## Chats

### Chat

One conversation between the user and one buddy. Every chat is either a [project chat](#project-chat) or a [standalone chat](#standalone-chat).

- **UI:** "Chat", "Chats".
- **Code:** `Chat`, `ChatId`, `src/chats/`, table `chats`.
- **Avoid:** "lesson", and "conversation" in names. ("Conversation" is fine in prose.)

### Project chat

**Decided:** a chat about one project. It receives the project's memory and can update it.

### Standalone chat

**Decided:** a chat about anything, in no project. It has every ability a project chat has, except project memory.

- **UI:** shown with other chats under "Chats".
- **Code:** today `CentralChat`, `createCentralChat`, `ChatPlace` with `kind: "central"`, `chats.project_id IS NULL`.
- **Avoid:** "central chat". It dates from when each user had one such chat (#315).

### Opening

The buddy's first message, written before the chat is saved. The [activity opening](#activity-opening) of the chat's first activity says how to write it. Today only project chats get one. **Decided:** every chat gets one, since each activity has its own opening kickoff.

- **Code:** today `createChatWithOpening`, the `openingKickoff` and `neutralKickoff` parts.
- **Avoid:** "synopsis", "first question". Use "kickoff" only for the prompt parts that ask for an opening.

### Chat name

A chat's one-line title. A small model names a chat automatically until the user renames it.

- **Code:** `ChatName`, `chats.renamed_by_hand`.

### Chats page

The page at `/chat` that lists all the user's chats, with a filter by project.

- **UI:** "Chats".
- **Avoid:** "chats hub", "all-chats page", "all-chats list".

### Reply

The buddy's answer to one user message: text, plus any tool calls. The model writes it from the global prompt, the chat's snapshots, the project memory and the conversation so far.

- **Code:** `src/replies/reply.ts`.

## Projects and memory

### Project

Something the user wants to make or learn, which they work on over several project chats. **Decided:** a project can be about any subject. Every project starts with an interview.

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

- **Code:** `MEMORY_AUTHORS = ["user", "buddy"]`, stored in `memory_versions.author` behind a check constraint. Rows saved before #549 hold `tutor`, which the memory store reads as `buddy`. **Decided:** a later release rewrites them and drops `tutor` from the constraint.

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

**Decided:** `select_activity` is new, and `create_project` comes with every chat. Today `create_project` comes with standalone chats only.

Messages saved before #549 name the Blender manual tools `search_manual` and `cite_manual`. The chat store reads them under the new names (`src/chats/retired-tool-names.ts`). **Decided:** a later release rewrites the saved messages to the new names.

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
- **Avoid:** "manual credit", which is the licence credit in the footer.

### Manual credit

The CC BY-SA 4.0 credit for the Blender Reference Manual on every page. The licence requires it while the site shows manual content.

## Preferences

### Extra

An optional part of the site that the user can switch on or off in Settings. Extras only change what is shown.

- **UI:** "Extras", "switch".
- **Code:** `Flag`, `FLAGS`, `FlagId` (`src/flags/flags.ts`); column `users.hidden_extras`; cookie `hidden-extras`; attribute `data-extra`.
- **Avoid:** "feature flag", which suggests a deploy-time switch. In code, "flag" is the type name for an extra.

The column `users.hidden_extras` stores the ids of extras switched away from their defaults, not only hidden ones. **Decided:** stored ids are renamed along with the extras.

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
- **Code:** `login_links`, `sendLoginLink`, route `/login`.
- **Avoid:** "login link" in copy and docs.

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

## Proposed code layout

**Decided:** reorganize the code to follow this glossary, and generalize, realign or remove concepts where that makes the code simpler. This layout is a proposal for `apps/web/src/`:

| Path | Holds | Comes from |
|---|---|---|
| `prompts/` | The shared model for buddies and activities: `Prompt`, built-in and own prompts, customize, clone, rename, snapshots, part schemas, the store | `buddies/buddy-store.ts`, `buddy-parts-schema.ts`, `chosen-buddy.ts` |
| `buddies/` | The built-in buddies and the buddy parts (voice, habits) | `buddies/` |
| `activities/` | The built-in activities (open chat, interview, brainstorming, project breakdown), activity sessions and the `select_activity` tool | `tutor/interview-prompt.ts`, `tutor/central-chat-prompt.ts`, `tutor/chat-kickoff.ts`, `tutor/planning-prompts.ts` |
| `skills/` | One folder per built-in skill, with its prompt and tools | `tutor/citation-prompt.ts` |
| `skills/blender-manual/` | The Blender manual lookup: its prompt, its two tools, the index, reindex and search | `manual/`, `tutor/tools/*manual*` |
| `replies/` | Writing a reply: the model, the instructions assembly, the global prompt, the chat tools, answer-now, chat naming, the mock model | `tutor/` |
| `chats/` | Chats, messages and the chat store | `chats/` |

The layout removes these concepts:

- **Two kinds of chat with two tool sets.** `ProjectTools`, `CentralTools`, `CentralChat`, `ChatPlace` and `kind: "central"` collapse into one chat type with one tool set. Only `update_memory` depends on whether the chat has a project.
- **Mechanics parts on buddies.** The interview and kickoffs move to activities, the citation rules and tool descriptions to built-in skills, and the memory rules and answer-now note to the global prompt. A buddy is left with its name, voice and habits.
- **Extras that change prompts.** `BUDDY_SKILL_FLAGS` and the brainstorming and project-breakdown extras go, because brainstorming and project breakdown become activities. Every extra then only changes what is shown.
- **The buddy prompt mechanics and interview buddy extras.** **Decided:** both go. Mechanics parts leave buddies, and every start page picks a buddy.
- **The interview chat pointer.** `projects.interview_chat_id` and `isInterviewChat` go, because a chat's activity sessions say whether it is an interview.

## Words to retire

**Decided:** each rename goes all the way: copy, prompts, docs, code names, environment settings and stored values.

| Word | Use instead | Where it survives |
|---|---|---|
| Tutor | Buddy | `memory_versions.author` rows saved before #549, which the memory store reads as `buddy` |
| Persona | Buddy | Extra ids `persona-mechanics` and `interview-persona`, stored in `users.hidden_extras` and the cookie; `/personas` redirect; README "persona prompt" |
| Central chat | Standalone chat | `CentralChat`, `createCentralChat`, `kind: "central"`, `CENTRAL_TOOL_CONTEXT`, the `centralChat` part and its prompt |
| Lesson | Chat, project chat | Use cases, comments in `start-chat.ts` |
| Planning skill | Activity | `BUDDY_SKILL_FLAGS`, Settings copy |
| `search_manual`, `cite_manual` | `search_blender_manual`, `cite_blender_manual` | Messages saved before #549, which the chat store reads under the new names |
| Teaching rules | Habits | The `teachingRules` part, stored in `buddies.parts` and `chats.buddy_parts` |
| Login link | Sign-in link | Code names only |

## Blender coupling

These are the places where Blender is part of the domain today, and what #544 does with each:

- **Purpose:** the tagline (`src/ui/copy/site.ts:14`), the role prompt (`src/tutor/role-prompt.ts:3`) and the chat-naming prompt (`src/tutor/chat-naming.ts:38`) make Blender the purpose. They become subject-neutral. `docs/Blender-AI-Tutor.md` is removed.
- **Off-topic steering:** the citation rules tell the buddy to answer non-Blender questions briefly and steer back to the project (`src/tutor/citation-prompt.ts:14`). The use case `use_case_ask_outside_blender` tests this. The steering is removed.
- **Citation rules:** the rest of the citation rules become the Blender manual lookup skill's prompt.
- **Interview:** it asks for the user's "skill level with Blender" and milestones "they can do in Blender" (`src/tutor/interview-prompt.ts:17,19`). These become subject-neutral.
- **Shared rules and buddy voices:** the shared rule cites the manual's wording (`src/buddies/buddy-parts.ts:26`), and every built-in buddy's voice and sample lines use Blender actions. The Blender lines are removed.
- **Tools:** the manual tools are renamed. `answer-now.ts` names them.
- **Snapshots:** chats started before #544 keep their Blender text.

## Open questions

None. Add new questions here as they come up.
