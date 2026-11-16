# Glossary

This glossary records the domain language of Project Buddy: the words that users, docs, prompts and code use for the same things. Use these words in code, copy, prompts, docs and issues. When you need a new domain term, add it here first.

## Core model

Constructs run a local command engine inspired by multi-user dungeons (MUDs). The app makes no requests to AI model companies. Conversations keep their construct snapshots; this engine does not interpret their prose as instructions. References to model context below describe the retained harness protocol.

Two concepts shape every conversation: the construct is who the user works with, and the active spell is the persistent mode. Tasks saves subsequent messages as agreed tasks; Brainstorm saves them in Ideas. Stopping the spell returns to ordinary Chat. Workshop holds constructs and spells.

A conversation is a [quest](#quest)'s one conversation, with its tasks, ideas and progress timeline.

## Product

### Project Buddy

The product: a site where constructs help each user with their quests and ideas, on any subject, alone or with the members they invite.

### Site panel

The panel on the left of every page, mirroring the quest sidebar on the right. The button at the start of the header, a panel icon, opens and closes it. It holds Quick Note, the **Places** and **You** groups of links for a signed-in user, the Light, Dark and System modes, and Credits. On a wide screen it docks beside the page and stays open from page to page until the user closes it; on a narrower one it is a drawer over the page.

- **UI:** "Site panel", "Close site panel", "Places", "You".

### Workshop

The shared page for editing constructs and inspecting Tasks and Brainstorm. It has no test drawer: a saved definition is tried in a quest.

## Prompts and context

### Prompt

Internal instructions assembled by the application. Workshop has no prose Prompt or Instructions field; the local engine follows commands, spell destinations and reply templates. Stored construct prompt text is neither editable nor read by the engine.

### Character Sheet

A heading in the built-in constructs' stored prompt text. It is not an editable field.

### Built-in construct or spell

A construct or one of the two fixed spells that ships with the site.

### Own construct

A user’s private editable construct, created from starter instructions or by copying another construct. Using it in a conversation gives no one access to the original.

### Retire, Graveyard, restore, delete forever

To **retire** an own construct is to put it aside without losing its saved definition. It disappears from active collections and choices, and cannot be used for a new quest. Existing conversation snapshots and past casts stay intact.

**Graveyard** is the central page listing the user's retired constructs and spells.
**Restore** makes the same definition available again, preserving its source.
**Delete forever** permanently removes a retired definition after confirmation. It cannot remove an active definition. Built-in definitions cannot be retired.

### Create, make a copy, edit, save, cancel

**Create construct** make a private definition from starter instructions. **Make a copy** makes a private, editable copy of either a built-in or an own definition and opens its editor. Built-ins remain read-only. New copies add " (copy)" to the source name; existing saved names are unchanged.

**Edit** opens an own definition. **Save** stores its name and functional settings. **Cancel** puts back the saved fields and clears the browser draft without changing saved data. Leaving the editor without Save or Cancel preserves draft recovery. These actions never start a quest. Creating, copying and saving settings makes no model request. **Rename** means changing the name in the editor.

- **UI:** "Create construct", "Make a copy", "Edit", "Save", "Cancel".

### Message

One contribution to the conversation or to the model's input. A message has content and a role that identifies how the model should treat it. Prompts can be assembled into instruction messages; user messages, construct replies and tool results contribute other content.

### Context

Everything made available to the model for a call: instructions, the conversation's newest messages, tool definitions and results, images, and relevant information such as the current Tasks. Prompts contribute instructions to context; the tasks contribute information. Context can change between calls without changing the saved prompts.

Application state, such as the acting user's identity and access rights, is not automatically model context. Only information actually supplied to the model is part of its context.

### Placeholder

A marker in a prompt that is replaced when its text is used. Substitution changes the rendered text, not the saved prompt or its snapshot.

### Snapshot

The construct name and definition saved when a conversation starts. Later changes to the original do not alter this copy. Current quest context and the active spell can change between replies.

### Harness

The application machinery around the model: it assembles context, makes model calls, executes tool calls and carries the conversation forward. The harness enforces access rules; a prompt cannot grant access or tools the harness does not allow.

### Global prompt

Shared instructions every conversation receives, including the role and rules for quests, Tasks and milestones. Users cannot edit these rules.

## Constructs

### Workshop

The single collection destination for inspecting built-in constructs and spells and editing private copies. Each kind has a tab. Built-ins offer Make a copy; private definitions offer Edit, Make a copy and retirement. Each quest starting point assigns its construct.

- **UI:** "Workshop", "Constructs", "Spells".

### Construct

A named presence with a Visual description and artwork. Each conversation has exactly one construct, chosen when it starts and kept for its whole life; there is no switching constructs within it. The site ships built-in constructs, and users can make and edit their own. A construct writes the replies, calls the tools and casts the spells in a conversation.

The local engine does not interpret a construct’s historical voice or habits text.

- **UI:** "Construct", "Constructs", "Built-in constructs", "Your constructs", "Create construct".

### Construct code names

Use **construct** in code, stored kinds and configuration. Own constructs and spells share the `own_prompts` table. Conversations store `construct_id`, `construct_name` and `construct_parts`. Constructs always use the local command engine.

Browser drafts use the construct key. New copies store current built-in wording; user-written prompts and conversation snapshots keep their text.

The product name remains **Project Buddy**.

### Built-in construct

A construct that ships with the site. Its voice and habits are independent of the subject of a conversation.

### Default construct

Vellum, the construct the site uses when nothing else names one. Each [premade quest](#premade-quest) assigns its own construct.

### Voice

How a construct talks, as described by its prompt.

### Habits

How a construct works with the user, as described by its prompt. Voice describes how it talks; habits describe how it helps.

Habits describe the construct’s personal style across conversations.

## Spells

### Spell

A persistent mode in a quest's conversation. **Tasks** saves subsequent ordinary messages as open tasks; **Brainstorm** saves them in Ideas. These are the built-in spells. Own spells have customizable names, reply lists and Tasks or Ideas destinations. A new conversation has none active. A spell grants no permissions and makes no request to an AI model company.

Workshop’s Spells tab offers creation and copying. Own spells can be edited, retired and restored like constructs. Cast by name. Casting keeps a snapshot, so editing or retiring a definition changes future casts.

### Cast

Set the conversation’s active spell. `cast tasks` and `cast brainstorm` work with or without a leading slash. The shorter `tasks` and `brainstorm` commands work too. Casting the other spell replaces the current one without moving earlier items.

- **UI:** "Cast Tasks", "Cast Brainstorm".

### Stop spell

Clear the active spell and return to ordinary conversation commands. Choose **Stop Tasks** or **Stop Brainstorm** beside the composer, or type `stop`.

## Conversations

### Conversation

The continuing exchange between the user and one [construct](#construct). Each [quest](#quest) has exactly one, open to its owner and [members](#member). Starting a conversation again reaches the same one; reading a quest never starts one. Casting or stopping a spell keeps the conversation.

- **UI:** the quest's own page; no list of conversations and no conversation names.

### Quest status

A quest is Active, Completed or Abandoned. Completed means the user has finished their goal; Abandoned means they have chosen to move on. Both keep the quest's contents. The owner or any member can change the status and restore either to Active.

- **UI:** "Active", "Completed", "Abandoned", "/complete", "/abandon", "/restore", "Restore quest".

### Opening

The construct’s first message in a new quest conversation, generated from the shared greeting request with the quest’s starting context. New conversations have no active spell.

### Current quest

The quest Quests offers to pick up again, in its Continue card above Start a quest: the Active quest open to the user, their own or one they are a member of, whose conversation was most recently active, by its newest message, or by when it started if it has none, with its [next task](#next-task). Continue opens its conversation. With no Active quest there is none. Showing it makes no model call.

- **UI:** "Current quest", "Continue".

### Conversation image

An image saved in a message of a conversation. It belongs to that conversation and is open to the quest's owner and members. The composer accepts text only, so the user adds no new images.

- **UI:** "Image".

### Author

The user who wrote a user message. Authorship belongs to the message and does not change with the person viewing or continuing the conversation, or when its author leaves or is removed from the quest. For planned API access, a message submitted through a [connection](#connection) still has that connection’s user as its author; the backend separately records the submitting connection without changing the conversation UI.

- **UI:** the author's name, or "You" on the viewer's own messages.

### Reply

The construct's answer to one user message: text, plus any tool calls. The model writes it from the global prompt, the conversation's snapshots, the Tasks, and the conversation's newest messages: a bounded window, so a long-running quest never sends its whole history.

## Quests and Tasks

### Quest

Something the user wants to do, make or learn, which they work on in the quest's one continuing [conversation](#conversation), with its tasks, progress timeline and [Quick Notes](#quick-note). A quest can be about any subject and starts from a [premade quest](#premade-quest), with a construct and no active spell.

- **UI:** "Quest", "Quests".

### Start a quest

The shared form that creates a quest: it offers the four [premade quests](#premade-quest) as tiles, each one target with its name and a one-line tagline, then the chosen one's name, starting context and optional Why to edit and confirm. Every link that starts a quest opens this same form; no construct page has a start of its own. Browsing or closing it creates nothing and spends nothing.

- **UI:** "Start a quest".

### Premade quest

One of the four starting points every quest begins from: [Dailies](#dailies), Learn a thing, Make a thing and Do a thing. Each supplies a name, starting context and predetermined construct. Dailies and Learn a thing use Vellum; Make a thing and Do a thing use Lumen. The user optionally fills in Why except for Dailies; starting it creates an ordinary quest with its conversation. They are not quest types: once started, every quest works the same. Learn, Make and Do can be started for as many goals as the user likes. Browsing or cancelling creates nothing.

- **UI:** “Dailies”, “Learn a thing”, “Make a thing”, “Do a thing”.

### Dailies

The user's one ongoing quest for starting the day, continued every day in its one conversation. Starting Dailies again resumes it as it is, without clearing its conversation or Tasks, whatever the user has renamed it: it is found by its mark, not its name. The user begins each day with [Start Day](#start-day). Its tasks can be [recurring](#recurring-task), and each recurring task keeps a [streak](#streak). Dailies has no automatic daily reset: a day begins only when the user starts it.

- **UI:** “Dailies”, “Start Day”.

### Start Day

The Dailies quest's way to begin a new day, in the quest sidebar's Actions tab. After the user confirms, it records a day dated with the browser's calendar date. It sets the conversation and its active spell aside and opens an empty conversation with the same construct, without a model request. Done [recurring tasks](#recurring-task) reopen, and one-off tasks, Ideas and Progress stay as they are. The user can also choose to remove all tasks or all Ideas.

Under the button, a line says how long ago the last day started: in hours for the first two days, then in days. Until someone sends a message in the new day's conversation, **Undo Start Day** brings back the conversation, spell, Tasks and Ideas from before it.

- **UI:** “Start Day”, “Undo Start Day”, “Last day started 5 hours ago”.

### Recurring task

A [task](#task) in the Dailies quest that the user means to do every day. The task's menu in Tasks offers Make recurring and Make one-off. Start Day records whether each recurring task was done that day, then reopens the done ones. A recurring task shows a repeat icon with its [streak](#streak).

- **UI:** “Make recurring”, “Make one-off”.

### Streak

The number of days in a row, up to the current day, on which the user did a [recurring task](#recurring-task). The current day counts once the task is done, and an open task doesn't end the streak until the next Start Day. A day the task wasn't done ends the streak, and so does a [gap](#gap). Two days started on one date count as one date, done if the task was done in either.

- **UI:** “3-day streak”.

### Gap

A calendar date on which the user started no day in the Dailies quest, between days they did start. A gap ends every [streak](#streak). In the Progress section's day grid, a dashed square marks it.

- **UI:** “no day started”.

### Quest code names

Use `Quest`, `QuestId`, `quest`, `quests` and `questId` throughout the application. Quest pages use `/quests` and storage uses the `quests` table and `quest_id` columns.

The product name remains Project Buddy. Software build projects, hosting projects and a creative project retain their ordinary meanings.

### Personal quest

A quest with no [members](#member): open to its [owner](#owner) alone. Every quest starts personal, and [Dailies](#dailies) always stays personal. Inviting someone does not change the quest's kind; it becomes a [multi-user quest](#multi-user-quest) once someone accepts.

### Goal

The outcome the user wants to achieve through a quest. It is discussed in the conversation; agreed work becomes tasks in Tasks. There is no separate Goal field.

### Milestone

A meaningful result on the path toward a [goal](#goal). A milestone can be planned or reached. A [recorded milestone](#milestone-recorded) captures a result already reached; a task list alone must not be recorded as completed progress.

### Milestone (recorded)

Something the user got done in a quest: one short line, in the past tense, that the construct records in a quest's conversation, dated and linked to the quest. The user can edit or delete it.

- **UI:** "Milestone", "Added to the progress timeline".

### Progress timeline

A quest's collection of recorded milestones. It celebrates what the user has done. In the Dailies quest, a day grid sits above it: each [recurring task](#recurring-task)'s last seven dates, with each date marked done, not done or a [gap](#gap).

- **UI:** "Progress".

### Next task

The one small thing the user means to do next in a quest: the first open [task](#task) in its [Tasks](#tasks). It is the first action toward a planned milestone. A quest with no open tasks has no next task.

- **UI:** "Next task".

### Active spell

The conversation’s saved mode: Tasks, Brainstorm or no spell. `cast tasks` and `cast brainstorm` set it; `tasks` and `brainstorm` are shorter forms. Commands accept an optional `/`. **Stop [Spell]**, or `stop`, returns to Chat. Switching spells never moves earlier messages between buckets.

### Ideas

A quest's saved possibilities that the user has not committed to. Ideas is separate from Tasks. The owner or a member can add, edit or remove an idea, or move it into Tasks as an open task. Ideas have no done state.

- **UI:** "Ideas", "Add idea", "Move to Tasks".

### Quick Note

A short, dated line the user saves to an Active quest open to them from the site panel, without opening the quest and without a model request. A quest's Quick Notes are listed, newest first, in its sidebar's Quick Notes tab, where each can be deleted. Constructs don't read them. **Quick Notes** names the feature and a quest's collection of them.

- **UI:** "Quick Note" for the site panel's item, the dialog and a single item; "Quick Notes" for the tab and the collection.

### Quest sidebar actions

The quest sidebar's **Actions** tab holds what the user does to the quest's conversation rather than reads: the spell picker with Cast spell, and [Start Day](#start-day) for an Active Dailies quest.

- **UI:** "Actions".

### Tasks

A quest's ordered list of [tasks](#task): the remaining work the user agreed to. The construct changes it with a tool, and the user changes it on the quest's Tasks section, in the Tasks panel beside the conversation, or with [commands](#command). Every change is saved as a version and can be undone. The tasks have no deadlines.

- **UI:** "Tasks", "Tasks panel".

### Task

One piece of remaining work in a quest's [Tasks](#tasks): one short line, open or done, with a number that names it for the whole of the quest, such as #3. A done task isn't a [recorded milestone](#milestone-recorded). In the Dailies quest, a task can be [recurring](#recurring-task); any other task is one-off.

- **UI:** "Task", "#3", "Done".

### Tasks change

A note in a quest's conversation that the construct or a person changed the quest's [tasks](#tasks): what each operation did, with Undo. A person's tasks change, made with the Tasks panel or a command, the construct reads it on its next reply.

- **UI:** "Tasks change", "Undid a task change".

### Command

A message that starts with "/" and a name, such as `/done 3`, which the site runs at once instead of sending to the construct. Typing "/" in the composer lists them. The tasks commands keep the tasks without a model call.

- **UI:** "Commands", "/tasks", "/add", "/done", "/reopen", "/edit", "/move", "/drop", "/undo".

## Experience

### Experience

What a user has done across their quests, as one number: the sum of their [abilities'](#ability) points, each weighted by what the ability is worth. Experience counts only things done, never open work, days or streaks. It sets the user's [circle](#circle). Profile shows it in its Experience section, the construct answers the `exp` command with it in the conversation, and a ring in the site header fills as it nears the next circle.

- **UI:** "Experience", "120 experience", `exp`.

### Ability

One kind of thing a user does, which gains them one point each time: **Adding tasks**, **Ideating** (adding an idea), **Quick Notes** (saving one), **Completing tasks** and **Completing quests**. Adding a task, an idea or a Quick Note is worth 1 experience; completing a task is worth 3, one of each; completing a quest is worth 9, three completed tasks. Reopening a completed task or quest takes its completion point back, except when Start Day reopens a Dailies quest's recurring tasks. Removing a task or idea keeps its points.

- **UI:** "Abilities", the ability names above, "12 points".

### Circle

A user's level, set by their [experience](#experience). Circle 1 starts at 0 experience, and each circle needs 5 more experience than the one before it did: circle n starts at 5 · n(n − 1) / 2. Some circles start a new title, which the circles after them keep: Initiate (1), Apprentice (10), Practitioner (20), Expert (30), Master (40), Pathfinder (60), Grand Master (80), Legendary (100) and Transcendent (150).

- **UI:** "Circle 12 · Apprentice".

## Tools

### Tool

A function the model can call during a reply. Tools are subject to their requirements: changing the tasks and recording a milestone require a quest. A spell controls message capture without granting tools.

### Tool part

How a tool call appears in a conversation: inline in the reply, or under it.

## Working note

Text a construct writes before a spell cast, shown muted above it.

## Installed app

### Installed app

Project Buddy added to a phone's Home Screen, where it opens in a window of its own. It is the same site: nothing is stored for use offline.

- **UI:** "Add to Home Screen", "Install app", as the phone's browser names them.

## Accounts and access

### Profile

The user's own page: their name, which constructs and quest members see, and their [experience](#experience).

- **UI:** "Profile".

### Settings

The single destination for appearance and security.

- **UI:** "Settings".

### User

A person with an account, found by email.

- **UI:** "Account".

### Role

A user's stored account role: user or admin. Neither role grants access to other users' data. Sign-up creates the user role.

### Acting user

The user performing an action now. Their access determines what the action may read or change. Acting does not confer ownership.

The acting user is distinct from a message's author and from the user viewing it: a later reply or a different viewer does not change authorship.

When a [client](#client) acts through a connection, the connection’s user is the acting user. The connection can narrow that user’s permissions, but cannot grant access the user does not have.

### Owner

The user something belongs to. A quest's owner is the user who made it. The quest is open to its owner and its [members](#member), and no one can remove the owner from it. The site can't delete a quest yet; when it can, only the owner will.

Ownership and access are distinct: own constructs and spells belong to individual users, and membership in a quest never opens them. Something the acting user cannot access reads as not found.

- **UI:** "Owner" for a quest's owner.

### Sign-up link

An emailed link that verifies an email address before creating an account. Anyone can request one. It expires after 30 minutes, is replaced by a fresh request and can be confirmed once. Opening it creates nothing; choosing Continue creates the account and signs the browser in. An existing account, including an [invited account](#invited-account), receives a normal sign-in link instead.

- **UI:** "Sign up", "Continue".

### Sign-in link

An emailed link that signs in an existing user. Continuing from it completes sign-up for an [invited account](#invited-account), with the name the user gives.

- **UI:** "sign-in link".

### Session, sign out everywhere

A **session** keeps a user signed in. **Sign out everywhere** ends their existing sessions and invalidates their sign-in links and [acceptance links](#acceptance-link). Their quest invitations stay pending.

## Multi-user quests

These terms describe [multi-user quests](docs/multi-user-quests.md).

### Multi-user quest

A quest with one owner and one or more [members](#member), who share its one conversation, Tasks, Ideas, Progress and Quick Notes. Members have the owner's powers except removing the owner and, once the site has it, deleting the quest. The quest keeps one construct; messages keep their individual [authors](#author).

Wherever quests are listed or chosen, a multi-user quest carries a short marker, so it can't be mistaken for a personal quest of the same name.

- **UI:** "Shared" on the user's own quest with members; "Shared by" and the owner's name on a quest they joined.

### Member

A user who has accepted a [quest invitation](#quest-invitation). Members can change quest contents, invite users, remove other members, leave, rename the quest and change its status. Membership opens that quest only, not another user's own constructs, spells or other quests. A removed member loses access; what they wrote stays.

- **UI:** "Member", "Members", "Remove", "Leave quest".

### Quest invitation

An invitation for one user to join one quest, sent by email by anyone in the quest. Inviting an address with no account creates an [invited account](#invited-account) at once. Until it is accepted, the quest's people see the invitee only by the address it was sent to. It stays pending until its invitee accepts or declines it, or someone in the quest withdraws it. Accepting it never accepts another.

- **UI:** "Invite by email", "Invite", "Withdraw", "Accept", "Decline".

### Acceptance link

The link in a quest invitation's email. Opening it accepts nothing. Continuing signs the browser in as the invitee, completes an invited account's sign-up with their name, and accepts that one quest invitation. It works once, for 7 days, and a fresh invitation replaces it.

- **UI:** "Join the quest" in the email; "Continue" on its page.

### Pending quest

A quest the user has been invited to but has not accepted. The Quests page lists these quests in its Pending tab, with each quest's name and inviter, Accept and Decline. Pending describes the user's invitation, not the quest's Active, Completed or Abandoned status, and opens nothing else of the quest.

- **UI:** "Pending"; its tab's accessible name adds the count, such as "Pending, 2 invitations".

### Invited account

An account a quest invitation created, before its user completes sign-up. Its user completes sign-up by continuing from any emailed link, an acceptance link or a sign-in link, and giving a name. Account state is separate from acceptance of each quest invitation.

### Signed-up account

An account whose user has completed sign-up: every account made through Sign up, and every invited account once its user has given a name. Completing sign-up keeps the account and its pending invitations.

## Timer

The Timer is a destination of its own in the site panel's Places. It belongs to no quest, and quest membership and timer participation stay separate. See [Timer](docs/timer.md).

### Timer

A repeating work and break timer: a large ring that fills over the current period, the period's name and the time left. It needs the normal signed-in session.

### Timer schedule

A work length, a break length and a start instant. Work and break repeat from the start forever, and the current period follows from the time elapsed, never from counted ticks. A schedule never changes once made; starting again makes a new one.

### Timer link

The address of a timer schedule: `/timer/WORK/BREAK/START`, where `WORK` and `BREAK` are preset minutes and `START` is milliseconds since the Unix epoch. It holds nothing else, so sharing it reaches no quest or account. Signing in from a timer link leads back to it.

### Global timer

The timer schedule of the chosen lengths that starts at the Unix epoch, which everyone who chooses Join global timer with those lengths shares.

### Others following

How many other signed-in accounts had the same timer schedule open in the last 2 minutes. An open timer reports every minute. It counts each account once and names no one; it is not a live attendance list.

## API access (planned)

These terms describe planned API access, tracked in [API access requirements](https://github.com/axolotl-logic-io/project-buddy/issues/684). They do not mean the API or connection management is already available.

### Client

Software that calls the Project Buddy API on a user's behalf, such as a command utility or an application that runs an external agent. A client is distinct from a connection: the same client can have connections for different users or installations.

A client uses the same quests, conversations and other domain concepts as the site. It is not a construct or a user account.

### External agent

Software outside Project Buddy that can use a client to act on a user's behalf. It can submit messages to a construct or use deterministic API operations directly. It has no separate user identity in this model.

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

## Retained storage names

Some code and storage names outlast the features or words they were made for. Use the current terms in copy, prompts, docs and new code.

### Chat, adventure

`chat` and `chats` in code and storage, and `adventure` in a few code names such as `AdventureCharacterHeader` and the `adventure` visual destination kind, mean a quest's [conversation](#conversation). In product copy, "Chat" names only ordinary conversation when no spell is active.

### Generated image

An image a construct once saved as a tool result in a conversation. Constructs don't generate images now; the `image_generations` table and `/api/generated-images/GENERATION_ID` deliver the saved ones to the quest's owner and members.

### Gold, batteries, listings and purchases

The site has no balance, charges or purchases. The `gold_balances`, `gold_ledger`, `battery_purchases`, `battery_cash_events`, `listings` and `purchases` tables, and the `bought_from` column of `own_prompts`, keep their past rows in storage only.

### Other inert storage

Standalone chats, `chats` rows with a `user_id` and no quest that an older build made, are open to no one. The `manual_sections` table, the `users.interview_construct_id` and `users.hidden_extras` columns, and the quests' `check_in_frequency` and `last_check_in_at` columns stay in storage, unread by the site. The site sends nothing on its own.

