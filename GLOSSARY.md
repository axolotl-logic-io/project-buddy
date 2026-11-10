# Glossary

This glossary records the domain language of Project Buddy: the words that users, docs, prompts and code use for the same things. Use these words in code, copy, prompts, docs and issues. When you need a new domain term, add it here first.

## Core model

Three concepts shape every adventure:

- A **[construct](#construct)** is who the user works with: an AI character with a voice and habits, chosen from the [Constructs page](#constructs-page).
- A **[tool](#tool)** is a function the model can call during a reply, such as searching the Blender manual or generating an image.
- An **[activity](#activity)** is what the user and construct are doing together in an adventure, such as Brainstorm, Chat or Break Down a Project. The user can also start an adventure with an activity from Activities or its [start page](#start-page). The current activity can change during the adventure.

Constructs, activities and spells have [prompts](#prompt). The site ships built-in constructs, activities and spells, and users can make and edit their own.

An adventure is a [quest adventure](#quest-adventure) or a [standalone adventure](#standalone-adventure). Both have the same abilities, except that only a quest adventure has a Journal and can record milestones.

## Product

### Project Buddy

The product: a personal site where constructs help each user with their own quests and ideas, on any subject.

### Workshop

The shared editing and testing experience for constructs, activities and spells.

## Prompts and context

### Prompt

Instructions for the model. A construct, activity or spell has a prompt. The application assembles prompts into messages sent to the model.

### Character Sheet, Activity Sheet, Spell Sheet

The generic headings in built-in and starter prompts: `# Character Sheet` for a construct, `# Activity Sheet` for an activity, and `# Spell Sheet` for a spell. The separate name identifies the definition; the sheet contains its instructions. These are prompt headings, not new names for constructs, activities or spells. Renaming a definition does not require editing its heading or identity instructions.

### Built-in construct, activity or spell

A construct, activity or spell that ships with the site.

### Own construct, activity or spell

A user's private, editable construct, activity or spell, made by copying another or crafting one. Its prompt can become part of a shared adventure without giving others access to the original.

### Retire, Retirement, restore, delete forever

To **retire** an own construct, activity, or spell is to put it aside without losing its saved definition. It disappears from active collections and choices, and cannot be used for a new adventure, a new activity entry, or a future spell cast. Existing adventure snapshots and past casts stay intact.

**Retirement** is the central page listing the user's retired constructs, activities, and spells.
**Restore** makes the same definition available again, preserving its source and bought-copy ownership without charging batteries.
**Delete forever** permanently removes a retired definition after confirmation. It cannot remove an active definition. Built-in definitions cannot be retired.

### Customize, craft, tweak, clone, rename

To **customize** is to make an own copy of a built-in construct, activity or spell. To **craft** is to create an own construct, activity or spell without copying another. To **tweak** is to edit one of the user's own in place. To **clone** is to copy one of the user's own. To **rename** is to change its name.

- **Avoid:** "Write new", "write from scratch" and "New construct/activity/spell" as creation action labels; use "Craft" with the kind where needed.

### Message

One contribution to the adventure or to the model's input. A message has content and a role that identifies how the model should treat it. Prompts can be assembled into instruction messages; user messages, construct replies and tool results contribute other content.

### Context

Everything made available to the model for a call: instructions, adventure messages, tool definitions and results, images, and relevant information such as the Journal. Prompts contribute instructions to context; the Journal contributes information. Context can change between calls without changing the saved prompts.

Application state, such as the acting user's identity and access rights, is not automatically model context. Only information actually supplied to the model is part of its context.

### Placeholder

A marker in a prompt that is replaced when its text is used. Substitution changes the rendered text, not the saved prompt or its snapshot.

### Reset prompt or instructions

Replace the draft prompt of an own construct, activity or spell with its built-in source or starter text. Undo reset restores the previous draft; only Save changes the saved instructions. The name and separate opening request or when-to-use description stay unchanged. Existing adventure snapshots and casts stay unchanged. Bought copies and their clones have no built-in reset source; editing and cloning remain available.

### Snapshot

A preserved copy of a construct or activity's name and prompt, kept with an adventure. An adventure preserves its construct at the start and its activity each time it enters an activity. Later edits to those originals do not change their snapshots. Current context, such as Journal, can still change between replies.

### Harness

The application machinery around the model: it assembles context, makes model calls, executes tool calls and carries the adventure forward. The harness enforces access and battery rules; a prompt cannot grant access or tools the harness does not allow.

### Global prompt

Instructions that every adventure gets, whatever its construct and activity: the role, the shared rules, and the short rules for starting a quest and recording a milestone. Longer tool instructions that only some replies need, such as the Blender manual lookup's, are built-in spells instead, which the construct casts when they fit. Users cannot edit the global prompt.

## Constructs

### Constructs page

The page listing the built-in [constructs](#construct) and the user's own. The user chooses a construct to start an adventure.

- **UI:** "Constructs".
- **Avoid:** "Buddies", "team", "party", "roster" for this collection.

### Construct

An AI character with a name and a [prompt](#prompt) that sets its [voice](#voice) and [habits](#habits). Each adventure has exactly one construct, chosen when the adventure starts. The site ships built-in constructs, and users can make and edit their own. A construct writes the replies, calls the tools and casts the spells in an adventure.

A construct is not a prompt; it has one. People working together on a [team quest](#team-quest) are its [members](#member).

- **UI:** "Construct", "Constructs", "Choose a construct…", "Built-in constructs", "Your constructs", "Craft construct".
- **Avoid:** "buddy", "bot", "tutor", "persona", "assistant", and "character" except to explain a construct.

### Earlier names (compatibility)

Constructs were first called buddies. Use the new names everywhere except these compatibility boundaries, which keep the earlier name so that a release, which runs migrations while the earlier build is still live, and a rollback, which never reverts the schema, keep working:

- The `buddies` table (`ownPrompts` in code), its `buddies_*` constraint and index names, and the `buddy_id`, `buddy_name` and `buddy_parts` columns of `chats`.
- The stored kind `buddy` of an own construct and a listing (`STORED_PROMPT_KINDS` in `src/prompts/prompt.ts`), and the stored Journal author `buddy` (`STORED_MEMORY_AUTHORS` in `src/memory/memory.ts`). The stored kind's reader accepts both names; the stored Journal author is `user` or `buddy` only. Writers write `buddy`.
- The `kind` in a saved prompt draft's browser storage key, and old `?kind=buddy` Marketplace links, which are read as constructs.
- The `buddyId` a Workshop test request also carries, for the earlier build.
- The `/buddies`, `/buddies/<id>`, `/guild` and `/guild/<id>` links, which redirect, temporarily, to `/constructs` and `/constructs/<id>`.
- `BUDDY_MODEL`, read when `CONSTRUCT_MODEL` is unset.
- An own copy of a built-in construct, activity or spell whose text is unchanged is stored in the built-in one's text from before the rename, recorded in `src/prompts/earlier-built-ins.ts`, and read back in today's text, so both builds know it as a copy of the built-in one.
- Historical migration SQL, snapshots and their test fixtures.

User-written prompts and adventure [snapshots](#snapshot) are never rewritten; they may still say "buddy".

### Built-in construct

A construct that ships with the site. Its voice and habits are independent of the subject of an adventure.

### Default construct

The construct initially chosen when starting an adventure.

### Voice

How a construct talks, as described by its prompt.

### Habits

How a construct works with the user, as described by its prompt. Voice describes how it talks; habits describe how it helps.

Habits hold the construct's personal style, which carries across every activity. Setting the scene and opening the adventure belong to the [activity](#activity), not to habits.

- **Avoid:** "teaching rules".

## Activities

### Activity

What the user and construct are doing together in an adventure, such as brainstorming ideas, breaking down a quest, conducting an interview or chatting. An activity has a [prompt](#prompt) that guides the construct. Users can customize built-in activities or write their own.

An adventure has one [current activity](#current-activity). Its instructions guide the construct. Changing activities keeps the conversation and construct, but changes those instructions.

Each activity has a name, a prompt and an [opening request](#activity-opening). The user can start an adventure with it from the New adventure modal on Activities or its [start page](#start-page). The adventure saves a [snapshot](#snapshot) each time it enters an activity, so later edits do not change that session.

The construct chooses from the acting user's built-in and own activities. Start actions use activity names directly. Display name changes do not rename own activities or rewrite saved snapshots. Built-in instruction text and ids stay compatible, including `open-chat` for Chat.

- **UI:** "Activity", "Activities".
- **Avoid:** "mode", which is a theme setting, and "scene" outside explanations.

### Find something to make

A built-in activity for discovering a small achievable creative project, even when the user has no idea or inspiration source yet. It supports uncertainty and challenges as the user makes their project. It works in a standalone adventure or a quest adventure. Its stable id is `find-something-to-make`.

- **UI:** "Find something to make".

### Start page

The page where the user starts an adventure with an activity and chooses its construct.

### Current activity

The activity an adventure is in now. The user chooses the starting activity; the construct can change it during the adventure.

### Activity session

The stretch of an adventure spent in one activity, from the message where the activity started until the next change or the end of the adventure. An adventure with no session is in Chat.

### Activity opening

A separate prompt belonging to the activity that tells the construct how to open a new adventure when there is no [prepared opening](#prepared-opening).

- **UI:** "Opening request".

### Built-in activity

An activity that ships with the site.

### Own activity

A user's private, editable activity, made by customizing a built-in activity, cloning another own activity, or crafting one.

### Break Down a Project

The built-in activity that helps the user split a goal into milestones and small next steps. It can run with no quest, an existing quest or a new quest. The quest creation form defaults to this activity.

- **UI:** "Break Down a Project".

### Interview (retired)

An earlier built-in activity. Existing adventure snapshots keep its instructions. It is no longer offered for new adventures; older links and activity requests lead to Break Down a Project.

### New quest construct

The account setting that defaults the construct for a new quest's first adventure, initially Vellum. The user can change it in the Start Quest picker before starting. New-adventure forms use the construct the user chooses, including when starting a new quest. Existing adventure snapshots stay unchanged. The internal `interview` identifiers remain compatible.

- **UI:** "New quest construct".

### Brainstorm

The built-in activity for exploring an idea, questioning assumptions and making decisions.

- **UI:** "Brainstorm".

### Chat

The built-in activity with no set scene. It is the default when the user picks no activity. Chat names the `open-chat` activity; the earlier use of chat for an adventure remains only for compatibility.

- **UI:** "Chat".

## Spells

### Spellbook

A user's list of [spells](#spell), built in and their own, and the page that shows it. It is the user's lorebook of spells; use "lorebook" only to explain it.

- **UI:** "Spellbook", "Built-in spells", "Your spells", "Craft spell".
- **Avoid:** "skill library", "lorebook" outside explanations.

### Spell

Reusable guidance with a [prompt](#prompt) that the construct loads only when it fits. A spell has a name, a [when-to-use](#when-to-use) description and a prompt, shown as [instructions](#instructions-of-a-spell). The name and when-to-use description help select the spell; they are separate from its prompt. Every adventure's instructions list the user's spells by id, name and when-to-use line, and the construct [casts](#cast) one to load its instructions. A spell grants no tools: its instructions may only say how to use the tools every adventure has.

Built-in spells are read-only. The user can make, edit and delete their own spells.

- **UI:** "Spell", "Spells".
- **Avoid:** "skill", "macro", "recipe".

### When to use

A description of when the construct should cast a [spell](#spell). The construct sees this beside the spell's name before casting it.

- **UI:** "When to use".
- **Avoid:** "trigger", "description".

### Instructions (of a spell)

A [spell](#spell)'s prompt: what the construct does once it casts the spell. Casting makes these instructions available to the construct. An activity's prompt guides the adventure throughout its current activity session.

- **UI:** "Instructions".

### Cast

To make a spell's instructions available to the construct. A cast preserves the instructions as they were then, so later edits or deletion of the spell do not change past casts. Cast instructions remain available in later replies of that adventure, including replies to other team quest members. They are not exposed as readable prompts to people viewing the adventure.

- **UI:** "Cast SPELL NAME".
- **Avoid:** "invoke", "run", "load" in copy.

## Adventures

### Adventure

One conversation between the user and one [construct](#construct). Every adventure is either a [quest adventure](#quest-adventure) or a [standalone adventure](#standalone-adventure).

- **UI:** "Adventure", "Adventures", "New adventure".
- **Earlier name:** "Chat" or "Chats", retained only for compatibility. The current [Chat](#chat) activity is one activity an adventure can use.
- **Avoid:** "lesson", and "conversation" in names. ("Conversation" is fine in prose.)

### Quest status

A quest is Active, Completed or Abandoned. Completed means the user has finished their goal; Abandoned means they have chosen to move on. Both keep the quest's contents and turn off check-ins. The owner can restore either to Active. Restoring leaves check-ins off until the owner turns them on.

- **UI:** "Active", "Completed", "Abandoned", "Mark completed", "Mark abandoned", "Restore quest", "Quest actions".

### Quest adventure

An adventure about one quest. It receives the quest's Journal and can update it, and can record milestones on the quest's progress timeline.

### Standalone adventure

An adventure about anything, in no quest. It has every ability a quest adventure has, except a Journal and recording milestones.

- **UI:** shown with other adventures under "Adventures".
- **Avoid:** "central adventure".

### Opening

The construct's first message, ready before the adventure is saved. Every adventure gets one: its [prepared opening](#prepared-opening), if it has one, or else one the construct writes, as the [activity opening](#activity-opening) of the adventure's first activity says.

- **Avoid:** "synopsis", "first question". Use "opening request" for the prompt that asks for an opening.

### Prepared opening

An opening written ahead of time for a built-in construct in a built-in activity, so the adventure starts at once, without a model call. A construct or activity of the user's own whose prompts are unchanged from built-in ones, such as a copy the user has only renamed, gets the built-in one's. An edited one has none, so its construct writes the opening.

### Check-in

A quest adventure the construct starts automatically on a schedule its owner chooses. Its opening draws on the Journal to help the user resume. Check-ins are optional. For who pays for model use, see [batteries](#batteries).

- **UI:** "Check-ins".
- **Avoid:** "nudge", "reminder", "ping".

### Unread

The state of an adventure that a user hasn't opened yet. Each user has their own mark: a [check-in](#check-in) marks its new adventure unread for the quest's owner and each [member](#member), and opening the adventure clears only the opener's mark. Adventure lists, such as the Adventures page and Today, mark the adventures that are unread for the user viewing them.

- **UI:** "Unread".
- **Avoid:** "new", "unseen".

### Adventure name

An adventure's one-line title. The site names an adventure automatically until the user renames it.

### Adventures page

The page for finding the user's adventures again, including quest and standalone adventures.

- **UI:** "Adventures".
- **Avoid:** "adventures hub", "all-adventures page", "all-adventures list".

### Today

A view of what is waiting for the user: their recent quests, next steps and adventures. Showing it makes no model call.

- **UI:** "Today", "Continue", "Recent adventures".

### Image attachment

An image the user selects or pastes into an adventure message. It belongs to the adventure and remains available to the construct in follow-up replies.

- **UI:** "Image", "Attach images".

### Author

The user who wrote a user message. Authorship belongs to the message and does not change with the person viewing or continuing the adventure. For planned API access, a message submitted through a [connection](#connection) still has that connection’s user as its author; the backend separately records the submitting connection without changing the adventure UI. For who saved a Journal version, see [Journal author](#journal-author).

- **UI:** the author's name, or "You" on the viewer's own messages.
- **Avoid:** "sender" and "writer" as names for this concept.

### Reply

The construct's answer to one user message: text, plus any tool calls. The model writes it from the global prompt, the adventure's snapshots, the Journal and the conversation so far.

## Quests and Journal

### Quest

Something the user wants to make or learn, which they work on over several quest adventures. A quest can be about any subject. A quest can start with any activity.

- **UI:** "Quest", "Quests".
- **Avoid:** "Project", "Projects" for this concept.

The code and storage still use `Project`, `project` and `projects`, including route paths, tool names and built-in activity ids. These compatibility names refer to quests; they are not user-facing terms. The product name remains Project Buddy. The Home heading "Your projects await" is the user-approved copy exception; other labels use Quest and Quests.

### Team quest

A quest that its [owner](#owner) shares with [members](#member). Everyone in it shares its adventures, Journal, Quick Notes and progress timeline. A quest with no members is not a team quest, though nothing else sets it apart.

In a team quest adventure, the chosen construct's and activity's instructions are shared with the quest's members, own ones too, through the adventure's [snapshots](#snapshot). The original construct or activity stays private to its user.

- **UI:** "Shared" on the owner's quests list, "Shared with you" on a member's.
- **Avoid:** "shared quest" in code, "group quest", "workspace".

### Member

A user in someone else's [team quest](#team-quest), who works in it as the owner does except for the owner's actions. A member can leave; the owner can remove them. Either ends their access at once, and their past messages stay.

- **UI:** "Member", "Members", "Leave quest", "Remove".
- **Avoid:** "collaborator", "teammate", "guest".

### Journal

One editable Markdown document per quest, shared by all its adventures. It holds the quest's goals, milestones, progress, preferences and Quick Notes. The user and the construct can both change it. The quest's [plan](#plan) is kept beside it, as its first typed section; the Journal page shows it above the Markdown.

- **UI:** "Journal", "Quest Journal".
- **Earlier name:** "Memory" or "Quest memory".
- **Avoid:** "quest state", "shared Journal".

### Journal version

One saved revision of a quest's Journal. Restoring a version saves it again as a new version.

- **UI:** "Version N".

### Journal author

Who saved a Journal version: the construct or a person in the quest. A recorded person appears as “you” to that person and by name to other viewers. For older versions whose saver was not recorded, the history says that the name was not recorded.

### Journal change

A note in an adventure that the construct updated the quest's Journal.

- **UI:** "Journal change".
- **Avoid:** "Journal change card", "Journal change notice".

### Quick Note

A short, dated line the user saves to a quest between adventures, without an adventure or model call. It becomes part of the Journal, so the construct can read it in later replies. Saving or deleting one makes a new Journal version by the user. **Quick Notes** names the feature and a quest's collection of them.

- **UI:** "Quick Note" for a single item and "Quick Notes" for the feature and collection.
- **Avoid:** "note" alone or "quick capture" for this feature in UI copy and docs; "memo", "jot", "inbox".

### Goal

The outcome the user wants to make or learn through a quest.

### Milestone

A meaningful result on the path toward a [goal](#goal). A milestone can be planned or reached. Break Down a Project helps the user describe planned milestones in the Journal. A [recorded milestone](#milestone-recorded) captures a result already reached; a plan alone must not be recorded as completed progress.

### Milestone (recorded)

Something the user got done in a quest: one short line, in the past tense, that the construct records from a quest adventure, dated and linked to that adventure. The user can edit or delete it. A standalone adventure can't record one, as it has no quest.

- **UI:** "Milestone", "Added to the progress timeline".
- **Avoid:** "achievement", "accomplishment", "streak", "log entry".

### Progress timeline

A quest's collection of recorded milestones. It celebrates what the user has done: it never counts days or streaks, or points out a pause.

- **UI:** "Progress".
- **Avoid:** "activity log", "history" (the Journal's versions have the history), "streak".

### Next step

The one small thing the user means to do next in a quest: the first open [step](#step) of its [plan](#plan). It is the first action toward a planned milestone. A quest whose plan has no steps yet falls back to its Journal's line that starts "Next step:", which the construct kept before plans.

- **UI:** "Next step".
- **Avoid:** "todo", "task", "action item" as names for this concept.

### Plan

A quest's ordered list of [steps](#step): the remaining work the user agreed to. The construct changes it with a tool, and the user changes it on the quest's Plan section, in the Plan panel beside an adventure, or with [commands](#command). Every change is saved as a version and can be undone. The plan has no deadlines and never counts open steps or days.

- **UI:** "Plan", "Plan panel".
- **Avoid:** "todo list", "task list", "backlog", "roadmap".

### Step

One piece of remaining work in a [plan](#plan): one short line, open or done, with a number that names it for the whole of the quest, such as #3. A done step isn't a [recorded milestone](#milestone-recorded).

- **UI:** "Step", "#3", "Done".
- **Avoid:** "todo", "task", "item", "action item".

### Plan change

A note in an adventure that the construct or a person changed the quest's [plan](#plan): what each operation did, with Undo. A person's plan change, made with the Plan panel or a command, spends no batteries; the construct reads it on its next reply.

- **UI:** "Plan change", "Undid a plan change".
- **Avoid:** "Plan change card", "plan update".

### Command

A message that starts with "/" and a name, such as `/done 3`, which the site runs at once instead of sending to the construct. Typing "/" in the composer lists them. The plan commands keep the plan without a model call. With the mock model, its own `/mock-…` commands still go to it as messages.

- **UI:** "Commands", "/plan", "/add", "/done", "/reopen", "/edit", "/move", "/drop", "/undo".
- **Avoid:** "slash command" in UI copy.

## Tools

### Tool

A function the model can call during a reply. Tools are available across activities, subject to their requirements: updating Journal, changing the plan and recording a milestone require a quest adventure. An activity guides what the user and construct are doing together; it does not grant tools. A spell gives instructions for using tools, without granting any.

### Tool part

How a tool call appears in an adventure: inline in the reply, or under it.

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

## Preferences

### Extra

An optional part of the site that the user can switch on or off in Settings. Extras only change what is shown.

- **UI:** "Extras", "switch".
- **Avoid:** "feature flag", which suggests a deploy-time switch.

### Theme, mode

A **theme** is the site's look. A **mode** is its light, dark or system appearance setting.

- **UI:** "Appearance", "Theme", "Mode".

## Installed app and notifications

### Installed app

Project Buddy added to a phone's Home Screen, where it opens in a window of its own. It is the same site: nothing is stored for use offline.

- **UI:** "Add to Home Screen", "Install app", as the phone's browser names them.
- **Avoid:** "PWA" and "progressive web app" in copy; "native app".

### Notification

A message the site sends to the user's devices, which appears even when the site is closed. Tapping it opens a page of the site.

- **UI:** "Notifications", "Send a test notification".
- **Avoid:** "alert", which is an error message on the page; "push" alone in copy.

### Device

One browser on one of the user's phones or computers, as far as notifications go. The user turns notifications on or off for each device separately, in Settings.

- **UI:** "this device".
- **Avoid:** "registration", "token".

## Accounts and access

### User

A person with an account, found by email.

- **UI:** "Account".

### Role

A user's account role: user or admin. The admin role grants only the right to send invitations, and no access to other users' data.

### Acting user

The user performing an action now. Their access determines what the action may read or change. In a team quest, the acting user can be the owner or a member; acting does not confer ownership.

The acting user is distinct from a message's author and from the user viewing it: a later reply or a different viewer does not change authorship. For who pays for model use, see [batteries](#batteries).

When a [client](#client) acts through a connection, the connection’s user is the acting user. The connection can narrow that user’s permissions, but cannot grant access the user does not have.

### Owner

The user something belongs to. A quest's owner is the user who made it. Members share access to its adventures, Journal, Quick Notes and progress timeline, but only the owner controls check-ins and removes members. The owner cannot leave their quest.

Ownership and access are distinct: own constructs, activities, spells and batteries belong to individual users, team quest data is accessible to members, and listed Marketplace offerings are visible to signed-in users. Something the acting user cannot access reads as not found.

- **UI:** "Owner" for a quest's owner.
- **Avoid:** "owner" for the acting user unless they own the subject; use "site owner" for the person running the site.

### Invitation, setup link

An **invitation** lets someone create an account. An admin sends it to an email address. Its **setup link** confirms the invitation and creates the account; it can be used once.

- **UI:** "Invitation", "Set up my account".

### Quest invitation

A quest's owner asks someone to join as a member. The invitee joins or declines; until then it is pending, and the owner can revoke it. A quest invitation cannot create an account or reveal whether an email address has an account.

- **UI:** "Invite someone", "Pending invitations", "Revoke", "Quest invitations", "Join", "Decline".
- **Avoid:** "invitation" alone for this concept; "share" or "add" for inviting.

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

A client uses the same quests, adventures and other domain concepts as the site. It is not a construct, a quest member or a user account.

- **Avoid:** "tool" for an API client; a tool is a function the model can call during a reply.

### External agent

Software outside Project Buddy that can use a client to act on a user's behalf. It can submit messages to a construct or use deterministic API operations directly. It has no separate user identity or quest membership in this model.

- **Avoid:** "construct" for an external agent.

### Connection

A user's revocable authorization for a client to act on their behalf, within specified permissions. A user can have several connections, including several for the same client. A connection belongs to one user; it does not own quests or adventures.

The backend records which connection submitted each API user message. That provenance does not change its author or add a label to the adventure UI. Ending a connection does not erase past messages or their provenance.

A connection is distinct from a site session and from the credentials used to access it. Renewing credentials does not by itself create a new connection.

### Connection permission

An operation or set of operations a user allows through a connection. Effective access is limited by both these permissions and the acting user's current access. Losing quest membership ends the connection's access to that quest too.

Permissions distinguish reading data, changing it directly and requesting construct replies. Allowing a reply also needs to account for the tools the harness can execute during it; permissions apply to those actions too.

### Login command

The `login` command starts browser-based authorization for a command utility to connect to Project Buddy. The user signs in to Project Buddy if needed and approves the connection's permissions. A successful login lets the utility use the connection without a browser approval for every operation.

- **Command:** `login`. The utility's executable name is not yet chosen.
- **Copy:** continue to use "sign in" for signing in to the site. `login` is the command-name exception.

## Images

### Generated image

An image a construct creates at the [acting user](#acting-user)'s request, spending that user's [batteries](#batteries). It belongs to its source adventure. An image in a team quest adventure is accessible to the quest's owner and members.

### Image gallery

The generated images made at a user's request. Each user's gallery lists their own generations, including those made in team quests. Deleting a source adventure also deletes its generated images.

## Usage

### Batteries

Formerly called **gold**. The balance each user spends on model use. It does not reset periodically. Replies, generated images and automatic adventure names spend the [acting user](#acting-user)'s batteries. A new adventure's generated opening spends the batteries of the user starting it. An automatic check-in spends the quest owner's batteries.

Batteries fund model use. Before the orb migration, legacy Marketplace sales transferred the shared gold balance between users. The migration pauses all buys. After separate operator activation, Marketplace sales use orbs and do not fund model use. See the [cutover plan](docs/marketplace.md#currency-cutover-proposal).

- **UI:** "Batteries", "1 battery", "100 batteries", "Buy batteries", "You're out of batteries."
- **Avoid:** "gold" in new model-use copy except compatibility identifiers; "credits", "coins", "tokens", "budget", "quota", "spend" as a noun, and "monthly usage" in UI copy.

### Battery balance

How many batteries a user has available.

- **UI:** "Batteries balance".
- **Avoid:** "usage meter" in UI copy and docs.

### Credit

A model provider account's prepaid balance. Provider credit is separate from each user's batteries.

- **Avoid:** "credits" for batteries.

### Orbs

The separate Marketplace balance prepared by the orb rollout. Orb buys start paused and require an explicit operator cutover; see the [rollout plan](docs/marketplace.md#currency-cutover-proposal). Before that migration, legacy Marketplace trades used the shared model-use gold balance, now called Batteries. Each user receives 100 orbs once. Listing prices are whole orbs from 0 to 5. Orbs cannot be bought, cashed out or converted to Batteries. Model use spends Batteries separately. Historical gold purchases keep their original currency.

- **UI:** "orbs", "Orb balance".

## Prompt marketplace

### Marketplace

The page where users share their own constructs, activities and spells and sell them to each other for orbs. Listings are visible to every signed-in user.

- **UI:** "Marketplace", "Sell in the Marketplace", "Your listings".
- **Avoid:** "store", "shop" in UI copy.

### Listing

A published copy of a seller's own construct, activity or spell, with a description and a price in orbs. A free listing lets users share them without payment. Editing the original construct, activity or spell does not change the listing until the seller updates it. Unlisting stops new sales. Browsing a listing does not reveal its prompt.

Built-in constructs, activities and spells, unchanged copies of them, and bought ones cannot be listed.

- **UI:** "listing", "Update listing", "Unlist", "Free".
- **Avoid:** "share link", "product", "item" as names for this concept.

### Seller

The user who published a listing. Only they update or unlist it. Others see the seller's name, or "A Project Buddy user" for someone with no name, never an email address.

### Buy

To get one's own copy of someone else's listing: the buyer's orbs move to the seller, all at once with saving the copy, or nothing changes. A free listing moves no orbs ("Get for free"). A buyer holds at most one copy of a listing; once they delete it forever, buying again charges again. A retired bought copy is still held; restore it without paying again.

- **UI:** "Buy", "Get for free".
- **Avoid:** "purchase" in UI copy.

### Bought construct, activity or spell

A construct, activity or spell a user got by buying a listing, or cloned from one. The user can edit it, but cannot list it. Its instructions are another user's, but the tools stay the buyer's own, so it can't reach anyone else's data.

## Adventure and Journal naming compatibility

Adventures were previously called chats; the Journal was called quest memory.
Use Adventure and Journal in new product copy and prompts. The existing
`chat`/`chats` and `memory` module names, exported identifiers, copy keys,
route paths, database names, API fields, tool names and prompt boundary tags
remain compatibility names in this release. The Chat activity keeps
its `open-chat` id. Existing user text, saved snapshots, version contents,
Quick Note paragraphs and historical migration fixtures are never rewritten.
The global prompt explains earlier names so constructs understand them.

### Premade quest

An editable starting point from the Quest library: a name, description, starting Journal and suggested first activity. Starting it creates an ordinary quest and its first adventure. Planned milestones remain Journal plans until real achievements are recorded. Browsing creates nothing.

- **UI:** “Premade quests”, “Explore quest”.

## Library

The in-site reading area with Getting Started and books on Constructs, Spells, Activities and Model context. A book explains a subject through navigable chapters, practical examples and links to site actions. This Library is distinct from the Spellbook and the Quest library of premade quests.

- **UI:** “Library”, “Getting Started”, “Chapters”.
