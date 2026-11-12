# Glossary

This glossary records the domain language of Project Buddy: the words that users, docs, prompts and code use for the same things. Use these words in code, copy, prompts, docs and issues. When you need a new domain term, add it here first.

## Core model

Constructs currently run a local command engine inspired by multi-user dungeons (MUDs). The app makes no requests to AI model companies. Prompts and snapshots remain saved for compatibility; this engine does not interpret their prose as instructions. References to model context below describe the retained harness protocol.

Three concepts shape every [conversation](#conversation):

- A **[construct](#construct)** is who the user works with: a character with a voice and habits, chosen inside Start Quest; [Workshop](#workshop) holds their private definitions.
- A **[tool](#tool)** is a function the model can call during a reply, such as searching the Blender manual or generating an image.
- An **[activity](#activity)** is what the user and construct are doing together in a conversation, such as Brainstorm, Chat or Break Down a Project. The user chooses the first one when a quest starts; the construct can change it as the conversation goes on.

Constructs, activities and spells have [prompts](#prompt). The site ships built-in constructs, activities and spells, and users can make and edit their own.

A conversation is a [quest](#quest)'s one conversation or the user's private [Chat](#chat-destination). Both have the same abilities, except that only a quest has a plan and a progress timeline.

## Product

### Project Buddy

The product: a personal site where constructs help each user with their own quests and ideas, on any subject.

### Workshop

The shared editor for constructs, activities and spells. It has no test drawer: a saved definition is tried in a quest or Chat.

## Prompts and context

### Prompt

Instructions for the model. A construct, activity or spell has a prompt. The application assembles prompts into messages sent to the model.

### Character Sheet, Activity Sheet, Spell Sheet

The generic headings in built-in and starter prompts: `# Character Sheet` for a construct, `# Activity Sheet` for an activity, and `# Spell Sheet` for a spell. The separate name identifies the definition; the sheet contains its instructions. These are prompt headings, not new names for constructs, activities or spells. Renaming a definition does not require editing its heading or identity instructions.

### Built-in construct, activity or spell

A construct, activity or spell that ships with the site.

### Own construct, activity or spell

A user's private, editable construct, activity or spell, made by copying another or creating one. Using it in a conversation gives no one else access to the original.

### Retire, Retirement, restore, delete forever

To **retire** an own construct, activity, or spell is to put it aside without losing its saved definition. It disappears from active collections and choices, and cannot be used for a new quest, a new activity entry, or a future spell cast. Existing conversation snapshots and past casts stay intact.

**Retirement** is the central page listing the user's retired constructs, activities, and spells.
**Restore** makes the same definition available again, preserving its source, without charging batteries.
**Delete forever** permanently removes a retired definition after confirmation. It cannot remove an active definition. Built-in definitions cannot be retired.

### Create, make a copy, edit, save, cancel

**Create construct**, **Create activity** and **Create spell** make a private definition from starter instructions. **Make a copy** makes a private, editable copy of either a built-in or an own definition and opens its editor. Built-ins remain read-only. New copies add " (copy)" to the source name; existing saved names are unchanged.

**Edit** opens an own definition. **Save** stores its name and instructions. **Cancel** puts back the saved fields and clears the browser draft without changing saved data. Leaving the editor without Save or Cancel preserves draft recovery. These actions never start a quest. Creating, copying and saving prompt text spend no batteries; construct artwork keeps its explicit generation and battery rules. **Rename** means changing the name in the editor.

- **UI:** "Create construct", "Create activity", "Create spell", "Make a copy", "Edit", "Save", "Cancel".
- **Avoid:** "Craft", "Customize", "Clone" and "Tweak" as action labels. Internal identifiers and saved user text may retain earlier names.

### Message

One contribution to the conversation or to the model's input. A message has content and a role that identifies how the model should treat it. Prompts can be assembled into instruction messages; user messages, construct replies and tool results contribute other content.

### Context

Everything made available to the model for a call: instructions, the conversation's newest messages, tool definitions and results, images, and relevant information such as the current Plan. Prompts contribute instructions to context; the Plan contributes information. Context can change between calls without changing the saved prompts.

Application state, such as the acting user's identity and access rights, is not automatically model context. Only information actually supplied to the model is part of its context.

### Placeholder

A marker in a prompt that is replaced when its text is used. Substitution changes the rendered text, not the saved prompt or its snapshot.

### Reset prompt or instructions

Replace the draft prompt of an own construct, activity or spell with its built-in source or starter text. Undo reset restores the previous draft; only Save changes the saved instructions. The name and separate opening request or when-to-use description stay unchanged. Existing conversation snapshots and casts stay unchanged. A copy from no built-in source, such as one bought in the Marketplace before it was removed, resets to the starter text.

### Snapshot

A preserved copy of a construct or activity's name and prompt, kept with a conversation. A conversation preserves its construct when it starts and its activity each time it enters an activity. Later edits to those originals do not change their snapshots. Current context, such as the Plan, can still change between replies.

### Harness

The application machinery around the model: it assembles context, makes model calls, executes tool calls and carries the conversation forward. The harness enforces access and battery rules; a prompt cannot grant access or tools the harness does not allow.

### Global prompt

Instructions that every conversation gets, whatever its construct and activity: the role, the shared rules, and the short rules for starting a quest and recording a milestone. Longer tool instructions that only some replies need, such as the Blender manual lookup's, are built-in spells instead, which the construct casts when they fit. Users cannot edit the global prompt.

## Constructs

### Workshop

The single collection destination for inspecting built-in constructs, activities and spells and editing private copies. Each kind has a tab. Built-ins offer Make a copy; private definitions offer Edit, Make a copy and retirement. Quest starts keep their own construct choice. Old Constructs and Spellbook collection URLs redirect here.

- **UI:** "Workshop", "Constructs", "Activities", "Spells".
- **Avoid:** "Buddies", "team", "party", "roster" for this collection.

### Construct

A character with a name and a [prompt](#prompt) that sets its [voice](#voice) and [habits](#habits). Each conversation has exactly one construct, chosen when it starts and kept for its whole life; there is no switching constructs within it. The site ships built-in constructs, and users can make and edit their own. A construct writes the replies, calls the tools and casts the spells in a conversation.

A construct is not a prompt; it has one.

- **UI:** "Construct", "Constructs", "Choose a construct…", "Built-in constructs", "Your constructs", "Create construct".
- **Avoid:** "buddy", "bot", "tutor", "persona", "assistant", and "character" except to explain a construct.

### Construct code names

Use **construct** in code, stored kinds and configuration. Own constructs, activities and spells share the `own_prompts` table. Conversations store `construct_id`, `construct_name` and `construct_parts`; the user’s saved preference is `interview_construct_id`. `CONSTRUCT_MODEL` selects local commands or the non-production test script.

The nomenclature migrations transfer existing rows and references. Browser drafts use the construct key. New copies store current built-in wording. Historical built-in text records still let readers recognize unchanged older copies; user-written prompts and conversation snapshots retain their text.

The product name remains **Project Buddy**.

### Built-in construct

A construct that ships with the site. Its voice and habits are independent of the subject of a conversation.

### Default construct

The construct initially chosen when starting a quest, and the construct of the private Chat.

### Voice

How a construct talks, as described by its prompt.

### Habits

How a construct works with the user, as described by its prompt. Voice describes how it talks; habits describe how it helps.

Habits hold the construct's personal style, which carries across every activity. Setting the scene and opening the conversation belong to the [activity](#activity), not to habits.

- **Avoid:** "teaching rules".

## Activities

### Activity

What the user and construct are doing together in a conversation, such as brainstorming ideas, breaking down a quest, conducting an interview or chatting. An activity has a [prompt](#prompt) that guides the construct. Users can customize built-in activities or write their own.

A conversation has one [current activity](#current-activity). Its instructions guide the construct. Changing activities keeps the conversation and construct, but changes those instructions.

Each activity has a name, a prompt and an [opening request](#activity-opening). The conversation saves a [snapshot](#snapshot) each time it enters an activity, so later edits do not change that session.

An activity is internal instructions, not a destination. The site has no Activities page and no activity start action, and the user never picks an activity to start a quest: each [starting point](#premade-quest) begins in its own activity, and Chat begins in Chat. After that, the construct chooses from the acting user's built-in and own activities with its activity tool. The user customizes activities in the [Workshop](#workshop)'s Activities tab. Display name changes do not rename own activities or rewrite saved snapshots. Built-in instruction text and ids stay compatible, including `open-chat` for Chat.

- **UI:** "Activity", "Activities" (the Workshop tab only).
- **Avoid:** "mode", which is a theme setting, and "scene" outside explanations.

### Find something to make

A built-in activity for discovering a small achievable creative project, even when the user has no idea or inspiration source yet. It supports uncertainty and challenges as the user makes their project. It works in Chat or in a quest. Its stable id is `find-something-to-make`.

- **UI:** "Find something to make".

### Current activity

The activity a conversation is in now. A quest starts in its starting point's activity; only the construct changes it after that, with its activity tool.

### Activity session

The stretch of a conversation spent in one activity, from the message where the activity started until the next change. A conversation with no session is in the Chat activity.

### Activity opening

A separate prompt belonging to the activity that tells the construct how to open a new conversation when there is no [prepared opening](#prepared-opening).

- **UI:** "Opening request".

### Built-in activity

An activity that ships with the site.

### Own activity

A user's private, editable activity, made by customizing a built-in activity, cloning another own activity, or crafting one.

### Break Down a Project

The built-in activity that helps the user split a goal into milestones and small next steps. It can run with no quest, an existing quest or a new quest. Do a thing starts in it.

- **UI:** "Break Down a Project".

### Interview (retired)

An earlier built-in activity. It is no longer offered for new quests; older links and activity requests lead to Break Down a Project.

### New quest construct

The account setting that defaults the construct for a new quest's conversation, initially Vellum. The user can change it before starting. Existing conversation snapshots stay unchanged. The internal `interview` identifiers remain compatible.

- **UI:** "New quest construct".

### Brainstorm

The built-in activity for exploring an idea, questioning assumptions and making decisions.

- **UI:** "Brainstorm".

### Chat

The built-in activity with no set scene. It is the default when the user picks no activity. It has the `open-chat` id. Not to be confused with the [Chat destination](#chat-destination).

- **UI:** "Chat".

## Spells

### Spell

Reusable guidance with a [prompt](#prompt) that the construct loads only when it fits. A spell has a name, a [when-to-use](#when-to-use) description and a prompt, shown as [instructions](#instructions-of-a-spell). The name and when-to-use description help select the spell; they are separate from its prompt. Every conversation's instructions list the user's spells by id, name and when-to-use line, and the construct [casts](#cast) one to load its instructions. A spell grants no tools: its instructions may only say how to use the tools every conversation has.

Built-in spells are read-only. The user can make, edit and delete their own spells.

- **UI:** "Spell", "Spells".
- **Avoid:** "skill", "macro", "recipe".

### When to use

A description of when the construct should cast a [spell](#spell). The construct sees this beside the spell's name before casting it.

- **UI:** "When to use".
- **Avoid:** "trigger", "description".

### Instructions (of a spell)

A [spell](#spell)'s prompt: what the construct does once it casts the spell. Casting makes these instructions available to the construct. An activity's prompt guides the conversation throughout its current activity session.

- **UI:** "Instructions".

### Cast

To make a spell's instructions available to the construct. A cast preserves the instructions as they were then, so later edits or deletion of the spell do not change past casts. Cast instructions remain available in later replies of that conversation. They are not exposed as readable prompts to people viewing the conversation.

- **UI:** "Cast SPELL NAME".
- **Avoid:** "invoke", "run", "load" in copy.

## Conversations

### Conversation

The continuing exchange between the user and one [construct](#construct). Each [quest](#quest) has exactly one, open to its owner alone, and each user has one private [Chat](#chat-destination). Starting a conversation again reaches the same one; reading a quest never starts one. Changing activity keeps the conversation.

- **UI:** the quest's or Chat's own page; no list of conversations and no conversation names.
- **Avoid:** "adventure", "thread", "session", and any second conversation in a quest.

### Chat (destination)

The user's private conversation for talking without a goal, in no quest. It has no Plan or progress timeline. The user can [turn it into a quest](#turn-chat-into-a-quest), and the construct can offer to; confirming makes a new quest with its own conversation and moves no Chat messages into it.

- **UI:** "Chat".
- **Avoid:** "standalone adventure", "central chat", "Chats".

### Adventure (removed)

The earlier name for one of several conversations in a quest, or a standalone one. Adventures were removed (#892): a quest has one conversation, and the user has one Chat. Existing adventures are deleted by a later cutover release. `chat`/`chats` names in code and storage remain for conversations.

- **Avoid:** in product copy, prompts and docs, except when describing the removal.

### Quest status

A quest is Active, Completed or Abandoned. Completed means the user has finished their goal; Abandoned means they have chosen to move on. Both keep the quest's contents. The owner can restore either to Active.

- **UI:** "Active", "Completed", "Abandoned", "Mark completed", "Mark abandoned", "Restore quest", "Quest actions".

### Opening

The construct's first message in a new quest's conversation: its [prepared opening](#prepared-opening), if it has one, or else one the construct writes, as the [activity opening](#activity-opening) of its first activity says. The private Chat starts empty.

- **Avoid:** "synopsis", "first question". Use "opening request" for the prompt that asks for an opening.

### Prepared opening

An opening written ahead of time for a built-in construct in a built-in activity, so the conversation starts at once, without a model call. A construct or activity of the user's own whose prompts are unchanged from built-in ones, such as a copy the user has only renamed, gets the built-in one's. An edited one has none, so its construct writes the opening.

### Check-in (removed)

A message the construct once added to a quest's conversation on a schedule its owner chose, with an email and an unread mark. Automatic check-ins were removed (#903): the construct writes only in answer to the user, and Dailies continues when the user writes or chooses Start the day. `check_in_frequency`, `last_check_in_at` and `chat_unreads` remain in storage, unused, until a held cleanup drops them.

- **Avoid:** in product copy, prompts and docs, except when describing the removal; also "nudge", "reminder", "ping" for anything the site sends on its own.

### Current quest

The quest Quests offers to pick up again, in its Continue card above Start a quest: the user's own Active quest whose conversation was most recently active, by its newest message, or by when it started if it has none, with its [next step](#next-step). Continue opens its conversation. With no Active quest there is none. Showing it makes no model call.

- **UI:** "Current quest", "Continue".
- **Earlier name:** "Today", on the removed Home page.

### Image attachment

An image the user selects or pastes into a message. It belongs to the conversation and remains available to the construct in follow-up replies.

- **UI:** "Image", "Attach images".

### Author

The user who wrote a user message. Authorship belongs to the message and does not change with the person viewing or continuing the conversation. For planned API access, a message submitted through a [connection](#connection) still has that connection’s user as its author; the backend separately records the submitting connection without changing the conversation UI.

- **UI:** the author's name, or "You" on the viewer's own messages.
- **Avoid:** "sender" and "writer" as names for this concept.

### Reply

The construct's answer to one user message: text, plus any tool calls. The model writes it from the global prompt, the conversation's snapshots, the Plan, and the conversation's newest messages: a bounded window, so a long-running quest never sends its whole history.

## Quests and Plan

### Quest

Something the user wants to do, make or learn, which they work on in the quest's one continuing [conversation](#conversation), with its plan and progress timeline. A quest can be about any subject and starts from a [premade quest](#premade-quest), with an activity and a construct.

- **UI:** "Quest", "Quests".
- **Avoid:** "Project", "Projects" for this concept.

### Start a quest

One of the two ways to create a quest: the shared form that offers the four [premade quests](#premade-quest) as tiles, each one target with its name and a one-line tagline, then the chosen one's name, starting context and construct to edit and confirm. Every link that starts a quest opens this same form; no construct or activity page has a start of its own. Browsing or closing it creates nothing and spends nothing.

- **UI:** "Start a quest".
- **Avoid:** "New quest" as a separate flow, "Explore".

### Turn Chat into a quest

The other way to create a quest: from [Chat](#chat-destination), the same form as Start a quest, opened on Do a thing with a summary of the Chat, or the construct's offered name and summary, as the starting context to confirm. The construct's offer creates nothing on its own. A quest's conversation can't create quests.

- **UI:** "Turn Chat into a quest".
- **Avoid:** "Start a quest from this", "transfer".

### Quest code names

Use `Quest`, `QuestId`, `quest`, `quests` and `questId` throughout the application. Quest pages use `/quests`, storage uses the `quests` table and `quest_id` columns, and the construct offers a quest with `create_quest`. Break Down a Project has the id `project-breakdown`.

The product name remains Project Buddy. Software build projects, hosting projects and a creative project retain their ordinary meanings. Historical migrations record earlier database names; the nomenclature migration transfers existing quest data and structured conversation fields to the current names.

### Personal quest

Every quest is its [owner](#owner)'s alone: no one else can open, read or change its conversation, Plan and progress timeline. Quests were once shareable with members through quest invitations; those were removed (#907). A former member's past messages keep their author, but their old membership or invitation grants nothing.

- **Avoid:** "team quest", "shared quest", "member", "quest invitation" for anything current.

### Goal

The outcome the user wants to achieve through a quest. It is discussed in the conversation; agreed work becomes steps in the Plan. There is no separate Goal field.

### Milestone

A meaningful result on the path toward a [goal](#goal). A milestone can be planned or reached. Break Down a Project helps the user describe planned milestones in the conversation. A [recorded milestone](#milestone-recorded) captures a result already reached; a plan alone must not be recorded as completed progress.

### Milestone (recorded)

Something the user got done in a quest: one short line, in the past tense, that the construct records in a quest's conversation, dated and linked to the quest. The user can edit or delete it. Chat can't record one, as it has no quest.

- **UI:** "Milestone", "Added to the progress timeline".
- **Avoid:** "achievement", "accomplishment", "streak", "log entry".

### Progress timeline

A quest's collection of recorded milestones. It celebrates what the user has done: it never counts days or streaks, or points out a pause.

- **UI:** "Progress".
- **Avoid:** "activity log", "history", "streak".

### Next step

The one small thing the user means to do next in a quest: the first open [step](#step) of its [plan](#plan). It is the first action toward a planned milestone. A quest with no open steps has no next step.

- **UI:** "Next step".
- **Avoid:** "todo", "task", "action item" as names for this concept.

### Plan

A quest's ordered list of [steps](#step): the remaining work the user agreed to. The construct changes it with a tool, and the user changes it on the quest's Plan section, in the Plan panel beside the conversation, or with [commands](#command). Every change is saved as a version and can be undone. The plan has no deadlines and never counts open steps or days.

- **UI:** "Plan", "Plan panel".
- **Avoid:** "todo list", "task list", "backlog", "roadmap".

### Step

One piece of remaining work in a [plan](#plan): one short line, open or done, with a number that names it for the whole of the quest, such as #3. A done step isn't a [recorded milestone](#milestone-recorded).

- **UI:** "Step", "#3", "Done".
- **Avoid:** "todo", "task", "item", "action item".

### Plan change

A note in a quest's conversation that the construct or a person changed the quest's [plan](#plan): what each operation did, with Undo. A person's plan change, made with the Plan panel or a command, spends no batteries; the construct reads it on its next reply.

- **UI:** "Plan change", "Undid a plan change".
- **Avoid:** "Plan change card", "plan update".

### Command

A message that starts with "/" and a name, such as `/done 3`, which the site runs at once instead of sending to the construct. Typing "/" in the composer lists them. The plan commands keep the plan without a model call. With the mock model, its own `/mock-…` commands still go to it as messages. In Chat only the plan commands' names are commands, and they say they need a quest; any other "/word" message goes to the construct.

- **UI:** "Commands", "/plan", "/add", "/done", "/reopen", "/edit", "/move", "/drop", "/undo".
- **Avoid:** "slash command" in UI copy.

## Tools

### Tool

A function the model can call during a reply. Tools are available across activities, subject to their requirements: changing the plan and recording a milestone require a quest. An activity guides what the user and construct are doing together; it does not grant tools. A spell gives instructions for using tools, without granting any.

### Tool part

How a tool call appears in a conversation: inline in the reply, or under it.

## Blender resources

### Blender manual lookup

Searching the Blender manual and citing what the construct read. Its instructions are a built-in spell. Casting the spell gives guidance for the lookup; it does not grant access to the tools.

### Blender manual

The Blender Reference Manual. Use “Blender manual” on first mention and in labels that stand alone. For contextual shortening, follow the [docs style guide](docs/docs-style-guide.md#contextual-shortening).

- **UI:** "the Blender manual".

### Manual section

One heading of the Blender manual and its text: the unit that a search returns and a citation links to.

### Manual index, reindex

A **manual index** is the searchable copy of the Blender manual. To **reindex** is to rebuild that copy.

### Lookup

One call to a search tool.

- **UI:** "Searching the Blender manual" for a Blender manual lookup.

### Working note

Text a construct writes before a lookup or a spell [cast](#cast), shown muted above it.

### Citation

A link to a Blender manual section the construct used in its reply.

- **UI:** "From the Blender manual".
- **Avoid:** "manual credit", which is the licence credit on the Credits page.

### Manual credit

The licence attribution for the Blender Reference Manual.


## Installed app

### Installed app

Project Buddy added to a phone's Home Screen, where it opens in a window of its own. It is the same site: nothing is stored for use offline.

- **UI:** "Add to Home Screen", "Install app", as the phone's browser names them.
- **Avoid:** "PWA" and "progressive web app" in copy; "native app".

## Accounts and access

### Settings

The single destination for profile name, appearance, the new quest construct, Batteries and security. Old Account links redirect here.

- **UI:** "Settings".

### User

A person with an account, found by email.

- **UI:** "Account".

### Role

A user's account role: user or admin. The admin role grants only the right to send invitations, and no access to other users' data.

### Acting user

The user performing an action now. Their access determines what the action may read or change. Acting does not confer ownership.

The acting user is distinct from a message's author and from the user viewing it: a later reply or a different viewer does not change authorship. For who pays for model use, see [batteries](#batteries).

When a [client](#client) acts through a connection, the connection’s user is the acting user. The connection can narrow that user’s permissions, but cannot grant access the user does not have.

### Owner

The user something belongs to. A quest's owner is the user who made it, and the only user who can reach it ([personal quest](#personal-quest)).

Ownership and access are distinct: own constructs, activities, spells, quests and batteries belong to individual users. Something the acting user cannot access reads as not found.

- **UI:** "Owner" for a quest's owner.
- **Avoid:** "owner" for the acting user unless they own the subject; use "site owner" for the person running the site.

### Invitation, setup link

An **invitation** lets someone create an account. An admin sends it to an email address. Its **setup link** confirms the invitation and creates the account; it can be used once.

- **UI:** "Invitation", "Set up my account".

### Sign-in link

An emailed link that signs in an existing user.

- **UI:** "sign-in link".
- **Avoid:** "login link" in UI copy and docs.

### Session, sign out everywhere

A **session** keeps a user signed in. **Sign out everywhere** ends their existing sessions and invalidates their sign-in links.

## API access (planned)

These terms describe planned API access, tracked in [API access requirements](https://github.com/axolotl-logic-io/project-buddy/issues/684). They do not mean the API or connection management is already available.

### Client

Software that calls the Project Buddy API on a user's behalf, such as a command utility or an application that runs an external agent. A client is distinct from a connection: the same client can have connections for different users or installations.

A client uses the same quests, conversations and other domain concepts as the site. It is not a construct or a user account.

- **Avoid:** "tool" for an API client; a tool is a function the model can call during a reply.

### External agent

Software outside Project Buddy that can use a client to act on a user's behalf. It can submit messages to a construct or use deterministic API operations directly. It has no separate user identity in this model.

- **Avoid:** "construct" for an external agent.

### Connection

A user's revocable authorization for a client to act on their behalf, within specified permissions. A user can have several connections, including several for the same client. A connection belongs to one user; it does not own quests or conversations.

The backend records which connection submitted each API user message. That provenance does not change its author or add a label to the conversation UI. Ending a connection does not erase past messages or their provenance.

A connection is distinct from a site session and from the credentials used to access it. Renewing credentials does not by itself create a new connection.

### Connection permission

An operation or set of operations a user allows through a connection. Effective access is limited by both these permissions and the acting user's current access.

Permissions distinguish reading data, changing it directly and requesting construct replies. Allowing a reply also needs to account for the tools the harness can execute during it; permissions apply to those actions too.

### Login command

The `login` command starts browser-based authorization for a command utility to connect to Project Buddy. The user signs in to Project Buddy if needed and approves the connection's permissions. A successful login lets the utility use the connection without a browser approval for every operation.

- **Command:** `login`. The utility's executable name is not yet chosen.
- **Copy:** continue to use "sign in" for signing in to the site. `login` is the command-name exception.

## Images

### Generated image

An image a construct creates at the [acting user](#acting-user)'s request, spending that user's [batteries](#batteries). It belongs to its source conversation. An image in a quest's conversation is accessible to the quest's owner alone.

### Image gallery

The generated images made at a user's request. Each user's gallery lists their own generations. Deleting a source conversation, or its quest, also deletes its generated images.

## Usage

### Batteries

Formerly called **gold**. The balance each user spends on model use. It does not reset periodically. Replies and generated images spend the [acting user](#acting-user)'s batteries. A new quest's generated opening spends the batteries of the user starting it. Reading a quest or Chat spends none.

Batteries fund model use only. Older ledger rows may record Marketplace sales, from before the Marketplace was removed, when the same balance paid for them.

- **UI:** "Batteries", "1 battery", "100 batteries", "Buy batteries", "You're out of batteries."
- **Avoid:** "gold" in new model-use copy except compatibility identifiers; "credits", "coins", "tokens", "budget", "quota", "spend" as a noun, and "monthly usage" in UI copy.

### Battery balance

How many batteries a user has available.

- **UI:** "Batteries balance".
- **Avoid:** "usage meter" in UI copy and docs.

### Credit

A model provider account's prepaid balance. Provider credit is separate from each user's batteries.

- **Avoid:** "credits" for batteries.

### Bought copy

A construct, activity or spell a user bought in the Marketplace, which the site no longer has, or cloned from one. It is an ordinary own definition: the user can use, edit, reset, clone, retire, restore and delete it. Its tools stay the user's own, so it can't reach anyone else's data.

## Conversation names

Conversations were previously called chats, then adventures. Use conversation and Chat in new product copy and prompts. Existing `chat`/`chats` code and storage names refer to conversations. The Chat activity keeps its `open-chat` id.

### Premade quest

One of the four starting points every quest begins from: [Dailies](#dailies), Learn a thing, Make a thing and Do a thing. Each supplies a name, starting context and its own activity. The user chooses a construct and optionally fills in Why; starting it creates an ordinary quest with its conversation. They are not quest types: once started, every quest works the same. Learn, Make and Do can be started for as many goals as the user likes. Browsing or cancelling creates nothing and spends no batteries.

- **UI:** “Dailies”, “Learn a thing”, “Make a thing”, “Do a thing”.
- **Avoid:** "quest type", "template".

### Dailies

The user's one ongoing quest for starting the day, continued every day in its one conversation. Starting Dailies again resumes it as it is, without clearing its conversation or Plan, whatever the user has renamed it: it is found by its mark, not its name. Start the day is a message the user sends in it. Dailies keeps no streaks, deadlines or daily resets.

- **UI:** “Dailies”, “Start the day”.
- **Avoid:** "daily quest" for a new quest per day, "streak".

## Library

The in-site reading area with Getting Started and books on Constructs, Spells, Activities and Model context. A book explains a subject through navigable chapters, practical examples and links to site actions. This Library is distinct from Workshop and the Quest library of premade quests.

- **UI:** “Library”, “Getting Started”, “Chapters”.
