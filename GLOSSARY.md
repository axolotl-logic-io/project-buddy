# Glossary

This glossary records the domain language of Project Buddy: the words that users, docs, prompts and code use for the same things. Use these words in code, copy, prompts, docs and issues. When you need a new domain term, add it here first. The “Avoid” entries apply to names for these concepts, not ordinary uses of those words in prose.

## Core model

Three concepts shape every chat:

- A **[buddy](#buddy)** is who the user talks with: a character, its voice and its habits.
- A **[tool](#tool)** is a function the model can call during a reply, such as searching the Blender manual or generating an image.
- An **[activity](#activity)** is what the user and buddy are doing together in a chat, such as an interview, brainstorming or an open chat. The user can also start a chat with an activity from Activities or its [start page](#start-page). The current activity can change during the chat.

Buddies, activities and spells have [prompts](#prompt). The site ships built-in buddies, activities and spells, and users can make and edit their own.

A chat is a [quest chat](#quest-chat) or a [standalone chat](#standalone-chat). Both have the same abilities, except that only a quest chat has quest memory and can record milestones.

## Product

### Project Buddy

The product: a personal site where buddies help each user with their own quests and ideas, on any subject. Blender is not the site's purpose. The [Blender manual lookup](#blender-manual-lookup)'s instructions are a built-in spell, for tools that every chat has.

- **UI:** "Project Buddy".
- **Avoid:** "Project Buddies", "Blender AI tutor", "the Blender tutor", "Blender tutor site".

### Workshop

The shared editing and testing experience for buddies, activities and spells. It shows the definition beside example test cases and a temporary conversation that uses the latest draft. Tests spend the acting user's gold and do not create saved chats.

- **UI:** "Workshop".

## Prompts and context

### Prompt

Instructions for the model. A buddy, activity or spell has a prompt; it is not itself a prompt. The application assembles prompts into messages sent to the model. A spell's prompt reaches the model through the result of a cast.

### Built-in buddy, activity or spell

A buddy, activity or spell that ships with the site. Built-in ones are read-only; users customize them to make their own copies.

### Own buddy, activity or spell

A user's private, editable buddy, activity or spell, made by copying another or writing one from scratch. Its prompt can become part of a shared chat without giving others access to the original.

- **UI:** "Your buddies", "Your activities", "Your spells".
- **Avoid:** "custom buddy", "user persona".

### Customize, write from scratch, tweak, clone, rename

To **customize** is to make an own copy of a built-in buddy, activity or spell. To **write from scratch** is to make one without copying another. To **tweak** is to edit one of the user's own in place. To **clone** is to copy one of the user's own. To **rename** is to change its name.

### Message

One contribution to the chat or to the model's input. A message has content and a role that identifies how the model should treat it. Prompts can be assembled into instruction messages; user messages, buddy replies and tool results contribute other content.

### Context

Everything made available to the model for a call: instructions, chat messages, tool definitions and results, images, and relevant information such as quest memory. Prompts contribute instructions to context; quest memory contributes information. Context can change between calls without changing the saved prompts.

Application state, such as the acting user's identity and access rights, is not automatically model context. Only information actually supplied to the model is part of its context.

### Placeholder

A marker in a prompt that is replaced when its text is used. Substitution changes the rendered text, not the saved prompt or its snapshot.

### Reset prompt or instructions

Replace the draft prompt of an own buddy, activity or spell with its built-in source or starter text. Undo reset restores the previous draft; only Save changes the saved instructions. The name and separate opening request or when-to-use description stay unchanged. Existing chat snapshots and casts stay unchanged. Bought copies and their clones have no built-in reset source; editing and cloning remain available.

### Snapshot

A preserved copy of a buddy or activity's name and prompt, kept with a chat. A chat preserves its buddy at the start and its activity each time it enters an activity. Later edits to those originals do not change their snapshots. Current context, such as quest memory, can still change between replies.

### Harness

The application machinery around the model: it assembles context, makes model calls, executes tool calls and carries the chat forward. The harness enforces access and gold rules; a prompt cannot grant access or tools the harness does not allow.

### Global prompt

Instructions that every chat gets, whatever its buddy and activity: the role, the shared rules, and the short rules for starting a quest and recording a milestone. Longer tool instructions that only some replies need, such as the Blender manual lookup's, are built-in spells instead, which the buddy casts when they fit. Users cannot edit the global prompt.

## Buddies

### Buddy

A character who talks with the user in a chat. A buddy has a [voice](#voice) and [habits](#habits). Each chat has exactly one buddy, chosen when the chat starts.

Use "buddy" for whoever answers the user.

- **UI:** "Buddy", "Buddies".
- **Avoid:** "tutor", "persona", "assistant", and "character" except to explain a buddy.

### Built-in buddy

A buddy that ships with the site. Its voice and habits are independent of the subject of a chat.

### Default buddy

The buddy initially chosen when starting a chat.

### Voice

How a buddy talks, as described by its prompt.

### Habits

How a buddy works with the user, as described by its prompt. Voice describes how it talks; habits describe how it helps.

Habits hold the buddy's personal style, which carries across every activity. Setting the scene and opening the chat belong to the [activity](#activity), not to habits.

- **Avoid:** "teaching rules".

## Activities

### Activity

What the user and buddy are doing together in a chat, such as brainstorming ideas, breaking down a quest, conducting an interview or having an open chat. An activity has a [prompt](#prompt) that guides the buddy. Users can customize built-in activities or write their own.

A chat has one [current activity](#current-activity). Its instructions guide the buddy. Changing activities keeps the conversation and buddy, but changes those instructions.

Each activity has a name, a prompt and an [opening request](#activity-opening). The user can start a chat with it from the New chat modal on Activities or its [start page](#start-page). The chat saves a [snapshot](#snapshot) each time it enters an activity, so later edits do not change that session.

The buddy chooses from the acting user's built-in and own activities.

- **UI:** "Activity", "Activities".
- **Avoid:** "mode", which is a theme setting, and "scene" outside explanations.

### Start page

The page where the user starts a chat with an activity and chooses its buddy.

### Current activity

The activity a chat is in now. The user chooses the starting activity; the buddy can change it during the chat.

### Activity session

The stretch of a chat spent in one activity, from the message where the activity started until the next change or the end of the chat. A chat with no session is in the open chat.

### Activity opening

A separate prompt belonging to the activity that tells the buddy how to open a new chat when there is no [prepared opening](#prepared-opening).

- **UI:** "Opening request".

### Built-in activity

An activity that ships with the site.

### Own activity

A user's private, editable activity, made by customizing a built-in activity, cloning another own activity, or writing one from scratch.

### Interview

The built-in activity that starts every quest. The buddy asks what the user wants to make or learn and what they already know, then writes the first goals and milestones to the quest memory.

- **UI:** "Quest interview".

The interview requires a quest and its memory. The Quest interview can also start in an existing quest from either chat-start surface. Empty quest memory begins with the goal; existing memory guides what to complete or revisit. Starting an interview does not replace quest memory.

### Interview buddy

The account setting that chooses the buddy for a new quest's interview. It defaults to Vellum and affects future quests, leaving existing chat snapshots unchanged.

- **UI:** "Interview buddy".

### Open chat

The built-in activity with no set scene. It is the default when the user picks no activity.

## Spells

### Spellbook

A user's list of [spells](#spell), built in and their own, and the page that shows it. It is the user's lorebook of spells; use "lorebook" only to explain it.

- **UI:** "Spellbook", "Built-in spells", "Your spells", "New spell".
- **Avoid:** "skill library", "lorebook" outside explanations.

### Spell

Reusable guidance with a [prompt](#prompt) that the buddy loads only when it fits. A spell has a name, a [when-to-use](#when-to-use) description and a prompt, shown as [instructions](#instructions-of-a-spell). The name and when-to-use description help select the spell; they are separate from its prompt. Every chat's instructions list the user's spells by id, name and when-to-use line, and the buddy [casts](#cast) one to load its instructions. A spell grants no tools: its instructions may only say how to use the tools every chat has.

Built-in spells are read-only. The user can make, edit and delete their own spells.

- **UI:** "Spell", "Spells".
- **Avoid:** "skill", "macro", "recipe".

### When to use

A description of when the buddy should cast a [spell](#spell). The buddy sees this beside the spell's name before casting it.

- **UI:** "When to use".
- **Avoid:** "trigger", "description".

### Instructions (of a spell)

A [spell](#spell)'s prompt: what the buddy does once it casts the spell. Casting makes these instructions available to the buddy. An activity's prompt guides the chat throughout its current activity session.

- **UI:** "Instructions".

### Cast

To make a spell's instructions available to the buddy. A cast preserves the instructions as they were then, so later edits or deletion of the spell do not change past casts. Cast instructions remain available in later replies of that chat, including replies to other team quest members. They are not exposed as readable prompts to people viewing the chat.

- **UI:** "Cast SPELL NAME".
- **Avoid:** "invoke", "run", "load" in copy.

## Chats

### Chat

One conversation between the user and one buddy. Every chat is either a [quest chat](#quest-chat) or a [standalone chat](#standalone-chat).

- **UI:** "Chat", "Chats".
- **Avoid:** "lesson", and "conversation" in names. ("Conversation" is fine in prose.)

### Quest chat

A chat about one quest. It receives the quest's memory and can update it, and can record milestones on the quest's progress timeline.

### Standalone chat

A chat about anything, in no quest. It has every ability a quest chat has, except quest memory and recording milestones.

- **UI:** shown with other chats under "Chats".
- **Avoid:** "central chat".

### Opening

The buddy's first message, ready before the chat is saved. Every chat gets one: its [prepared opening](#prepared-opening), if it has one, or else one the buddy writes, as the [activity opening](#activity-opening) of the chat's first activity says.

- **Avoid:** "synopsis", "first question". Use "opening request" for the prompt that asks for an opening.

### Prepared opening

An opening written ahead of time for a built-in buddy in a built-in activity, so the chat starts at once, without a model call. A buddy or activity of the user's own whose prompts are unchanged from built-in ones, such as a copy the user has only renamed, gets the built-in one's. An edited one has none, so its buddy writes the opening.

### Check-in

A quest chat the buddy starts automatically on a schedule its owner chooses. Its opening draws on quest memory to help the user resume. Check-ins are optional. For who pays for model use, see [gold](#gold).

- **UI:** "Check-ins".
- **Avoid:** "nudge", "reminder", "ping".

### Unread

The state of a chat that a user hasn't opened yet. Each user has their own mark: a [check-in](#check-in) marks its new chat unread for the quest's owner and each [member](#member), and opening the chat clears only the opener's mark. Chat lists, such as the Chats page and Today, mark the chats that are unread for the user viewing them.

- **UI:** "Unread".
- **Avoid:** "new", "unseen".

### Chat name

A chat's one-line title. The site names a chat automatically until the user renames it.

### Chats page

The page for finding the user's chats again, including quest and standalone chats.

- **UI:** "Chats".
- **Avoid:** "chats hub", "all-chats page", "all-chats list".

### Today

A view of what is waiting for the user: their recent quests, next steps and chats. Showing it makes no model call.

- **UI:** "Today", "Continue", "Recent chats".

### Image attachment

An image the user selects or pastes into a chat message. It belongs to the chat and remains available to the buddy in follow-up replies.

- **UI:** "Image", "Attach images".

### Author

The user who wrote a user message. Authorship belongs to the message and does not change with the person viewing or continuing the chat. For who saved a memory version, see [memory author](#memory-author).

- **UI:** the author's name, or "You" on the viewer's own messages.
- **Avoid:** "sender" and "writer" as names for this concept.

### Reply

The buddy's answer to one user message: text, plus any tool calls. The model writes it from the global prompt, the chat's snapshots, the quest memory and the conversation so far.

## Quests and memory

### Quest

Something the user wants to make or learn, which they work on over several quest chats. A quest can be about any subject. Every quest starts with an interview.

- **UI:** "Quest", "Quests".
- **Avoid:** "Project", "Projects" for this concept.

The code and storage still use `Project`, `project` and `projects`, including route paths, tool names and built-in activity ids. These compatibility names refer to quests; they are not user-facing terms. The product name remains Project Buddy. The Home heading "Your projects await" is the user-approved copy exception; other labels use Quest and Quests.

### Team quest

A quest that its [owner](#owner) shares with [members](#member). Everyone in it shares its chats, quest memory, Quick Notes and progress timeline. A quest with no members is not a team quest, though nothing else sets it apart.

In a team quest chat, the chosen buddy's and activity's instructions are shared with the quest's members, own ones too, through the chat's [snapshots](#snapshot). The original buddy or activity stays private to its user.

- **UI:** "Shared" on the owner's quests list, "Shared with you" on a member's.
- **Avoid:** "shared quest" in code, "group quest", "workspace".

### Member

A user in someone else's [team quest](#team-quest), who works in it as the owner does except for the owner's actions. A member can leave; the owner can remove them. Either ends their access at once, and their past messages stay.

- **UI:** "Member", "Members", "Leave quest", "Remove".
- **Avoid:** "collaborator", "teammate", "guest".

### Quest memory

One editable Markdown document per quest, shared by all its chats. It holds the quest's goals, milestones, progress and preferences. The user and the buddy can both change it.

- **UI:** "Memory", "Quest memory".
- **Avoid:** "quest state", "shared memory".

### Memory version

One saved revision of a quest's memory. Restoring a version saves it again as a new version.

- **UI:** "Version N".

### Memory author

Who saved a memory version: the buddy or a person in the quest. A recorded person appears as “you” to that person and by name to other viewers. For older versions whose saver was not recorded, the history says that the name was not recorded.

### Memory change

A note in a chat that the buddy updated the quest's memory.

- **UI:** "Memory change".
- **Avoid:** "memory change card", "memory change notice".

### Quick Note

A short, dated line the user saves to a quest between chats, without a chat or model call. It becomes part of the quest memory, so the buddy can read it in later replies. Saving or deleting one makes a new memory version by the user. **Quick Notes** names the feature and a quest's collection of them.

- **UI:** "Quick Note" for a single item and "Quick Notes" for the feature and collection.
- **Avoid:** "note" alone or "quick capture" for this feature in UI copy and docs; "memo", "jot", "inbox".

### Goal

The outcome the user wants to make or learn through a quest.

### Milestone

A meaningful result on the path toward a [goal](#goal). A milestone can be planned or reached. The interview and quest breakdown help the user describe planned milestones in quest memory. A [recorded milestone](#milestone-recorded) captures a result already reached; a plan alone must not be recorded as completed progress.

### Milestone (recorded)

Something the user got done in a quest: one short line, in the past tense, that the buddy records from a quest chat, dated and linked to that chat. The user can edit or delete it. A standalone chat can't record one, as it has no quest.

- **UI:** "Milestone", "Added to the progress timeline".
- **Avoid:** "achievement", "accomplishment", "streak", "log entry".

### Progress timeline

A quest's collection of recorded milestones. It celebrates what the user has done: it never counts days or streaks, or points out a pause.

- **UI:** "Progress".
- **Avoid:** "activity log", "history" (the memory's versions have the history), "streak".

### Next step

The one small thing the user means to do next in a quest, kept in its [quest memory](#quest-memory). It is the first action toward a planned milestone. The buddy keeps it current, and the user can edit it.

- **UI:** "Next step".
- **Avoid:** "todo", "task", "action item" as names for this concept.

## Tools

### Tool

A function the model can call during a reply. Tools are available across activities, subject to their requirements: updating memory and recording a milestone require a quest chat. An activity guides what the user and buddy are doing together; it does not grant tools. A spell gives instructions for using tools, without granting any.

### Tool part

How a tool call appears in a chat: inline in the reply, or under it.

## Blender resources

### Blender manual lookup

Searching the Blender manual and citing what the buddy read. Its instructions are a built-in spell. Casting the spell gives guidance for the lookup; it does not grant access to the tools.

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

Text a buddy writes before a lookup or a spell [cast](#cast), shown muted above it.

### Citation

A link to a Blender manual section the buddy used in its reply.

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

The acting user is distinct from a message's author and from the user viewing it: a later reply or a different viewer does not change authorship. For who pays for model use, see [gold](#gold).

### Owner

The user something belongs to. A quest's owner is the user who made it. Members share access to its chats, memory, Quick Notes and progress timeline, but only the owner controls check-ins and removes members. The owner cannot leave their quest.

Ownership and access are distinct: own buddies, activities, spells and gold belong to individual users, team quest data is accessible to members, and listed Marketplace offerings are visible to signed-in users. Something the acting user cannot access reads as not found.

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

## Images

### Generated image

An image a buddy creates at the [acting user](#acting-user)'s request, spending that user's [gold](#gold). It belongs to its source chat. An image in a team quest chat is accessible to the quest's owner and members.

### Image gallery

The generated images made at a user's request. Each user's gallery lists their own generations, including those made in team quests. Deleting a source chat also deletes its generated images.

## Usage

### Gold

The balance each user spends on model use. It does not reset periodically. Replies, generated images and automatic chat names spend the [acting user](#acting-user)'s gold. A new chat's generated opening spends the gold of the user starting it. An automatic check-in spends the quest owner's gold.

Gold can also move between users through transfers, such as Marketplace sales. Users see gold rather than provider costs.

- **UI:** "gold", "You're out of gold."
- **Avoid:** "credits", "coins", "tokens", "budget", "quota", "spend" as a noun, and "monthly usage" in UI copy.

### Gold balance

How much gold a user has available.

- **UI:** "Gold balance".
- **Avoid:** "usage meter" in UI copy and docs.

### Credit

A model provider account's prepaid balance. Provider credit is separate from each user's gold.

- **Avoid:** "credits" for gold.

## Prompt marketplace

### Marketplace

The page where users share their own buddies, activities and spells and sell them to each other for gold. Listings are visible to every signed-in user.

- **UI:** "Marketplace", "Sell in the Marketplace", "Your listings".
- **Avoid:** "store", "shop" in UI copy.

### Listing

A published copy of a seller's own buddy, activity or spell, with a description and a price in gold. A free listing lets users share them without payment. Editing the original buddy, activity or spell does not change the listing until the seller updates it. Unlisting stops new sales. Browsing a listing does not reveal its prompt.

Built-in buddies, activities and spells, unchanged copies of them, and bought ones cannot be listed.

- **UI:** "listing", "Update listing", "Unlist", "Free".
- **Avoid:** "share link", "product", "item" as names for this concept.

### Seller

The user who published a listing. Only they update or unlist it. Others see the seller's name, or "A Project Buddy user" for someone with no name, never an email address.

### Buy

To get one's own copy of someone else's listing: the buyer's gold moves to the seller, all at once with saving the copy, or nothing changes. A free listing moves no gold ("Get for free"). A buyer holds at most one copy of a listing; once they delete it, buying again charges again.

- **UI:** "Buy", "Get for free".
- **Avoid:** "purchase" in UI copy.

### Bought buddy, activity or spell

A buddy, activity or spell a user got by buying a listing, or cloned from one. The user can edit it, but cannot list it. Its instructions are another user's, but the tools stay the buyer's own, so it can't reach anyone else's data.
