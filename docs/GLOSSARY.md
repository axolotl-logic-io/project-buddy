# Project Buddy glossary

Use these terms in code, copy, prompts, docs and issues so the same words describe the same behavior. Use the full term on first mention and in standalone labels. Shorten it when the surrounding text makes the meaning clear. For workflows and examples, see the [web use cases](../apps/web/use-cases/README.md).

## Quests and sharing

### Quest

A workspace for something the user wants to learn, make or do, or for their daily work. A quest has an owner, a status and its spaces. Murmlings belong to the quest's spaces and persist across performances. [Quest use cases](../apps/web/use-cases/quests.md)

### Quest starting point

A reusable preset that supplies the initial quest name, starting context, construct and spaces. Every starting point creates a Tasks space, which adds tasks, and an Ideas space, which adds plain murmlings. The four starting points are Dailies, Learn a thing, Make a thing and Do a thing. Dailies and Learn a thing assign Vellum. Make a thing and Do a thing assign Lumen. Starting Dailies again opens the account's existing Dailies quest. [Starting point use case](../apps/web/use-cases/quests.md#use_case_browse_premade_quests)

### Quest status

The state of a quest: **Active** for ongoing work, **Completed** for finished work and **Abandoned** for work the user has stopped pursuing. **Complete** and **Abandon** keep the quest's contents. **Restore quest** returns it to Active. Pending describes an invitation. [Quest status use cases](../apps/web/use-cases/quest-status.md)

### Current quest

The Active quest offered under **Continue** on Quests. Among quests open to the user, it is the one with the most recent performance activity. A quest with no performances ranks by the time it started. Continue also shows its next task when one exists. [Continue use case](../apps/web/use-cases/quests.md#use_case_continue_quest)

### Quest owner

The account that started the quest. The owner can work in the quest and manage sharing. The owner always retains access, including when membership changes. [Quest member powers](../apps/web/use-cases/quest-members.md#use_case_quest_member_powers)

### Quest member

An account that has accepted an invitation to the quest. Members share the quest's spaces and performances with the owner. They can rename the quest, change its status, start or stop a performance, invite others and remove other members. A member's own rites and other quests keep their existing access rules. [Quest member access](../apps/web/use-cases/quest-members.md#use_case_quest_member_access)

### Quest invitation

An offer sent to an email address to join a specific quest. A **pending invitee** can see their invitation in **Pending**. Accepting grants quest access and declining closes the invitation. An invitation to an address without an account sets aside an invited account for that address. [Quest invitation use cases](../apps/web/use-cases/quest-members.md)

### Quest open to a user

A quest the user owns or has joined as a quest member. Use **open to** for access and **Active** for quest status. A quest that is closed to the user behaves like a missing quest. [Private data use case](../apps/web/use-cases/accounts.md#use_case_private_data)

## Spaces and murmlings

### Space

A named, ordered collection of murmlings in a quest. Every space belongs to one quest. A space sets the words shown for its contents: a singular and plural noun for its murmlings, and the verbs for checking off and unchecking its tasks. It also sets the type a conjuration gives each new murmling. Themed wording, such as spooky verbs, belongs in a space's words and a rite's replies rather than in the glossary. [Space use cases](../apps/web/use-cases/spaces.md)

### Murmling

Anything in a space. Each murmling has one type: **plain**, **task** or **quick note**. On screen, the space's noun names it. To **move** a murmling is to place it in another space of the same quest, keeping its type and contents. [Murmling types use case](../apps/web/use-cases/spaces.md#use_case_murmling_types)

### Task

A murmling marked as a task: a piece of work the user has committed to. To **check off** a task is to mark it done. To **uncheck** it is to make it open again. The space's verbs name these actions on screen. A task number identifies a task within its quest and stays the same when the task moves. [Task use cases](../apps/web/use-cases/tasks.md)

### Next task

The first open task in the quest, taking its spaces in order and each space's murmlings in their saved order. A quest with no open tasks has no next task. [Next task use case](../apps/web/use-cases/tasks.md#use_case_ask_whats_next)

### Quick note

A murmling marked as a quick note: a short thought that shows the date it was added. [Quick note use case](../apps/web/use-cases/spaces.md#use_case_quick_note)

## Dailies

### Dailies quest

The user's one ongoing, private quest for daily work, created from the Dailies starting point. Its identity survives a rename. Naming an ordinary quest Dailies leaves it an ordinary quest. [Dailies use case](../apps/web/use-cases/quests.md#use_case_dailies)

### Dailies day

A day the owner explicitly begins with **Start Day** in an Active Dailies quest. It takes the browser's calendar date under normal conditions. Start Day records the previous day's recurring task results, ends the active performance and unchecks recurring tasks that are checked off. One-off tasks keep their state, and other murmlings remain, unless the owner chooses spaces to empty. **Undo Start Day** is available until the next conjuration in the quest. [Start Day use case](../apps/web/use-cases/quests.md#use_case_start_day) and [Undo Start Day use case](../apps/web/use-cases/quests.md#use_case_undo_start_day)

### Recurring task

A Dailies task marked to do every day. Start Day unchecks it if it is checked off, keeping its task number and place in its space. A **one-off task** has no daily reset. [Recurring task use case](../apps/web/use-cases/tasks.md#use_case_recurring_tasks)

### Streak

A run of consecutive calendar dates on which a recurring task was checked off. A missed date or a **gap**, a date with no Dailies day started, breaks the run. Multiple starts on the same date count as one date. **Day grid** shows each recurring task's marks for up to seven recent dates. [Daily streak use case](../apps/web/use-cases/tasks.md#use_case_daily_streaks)

## Rites and performances

### Rite

A named way to add murmlings to a space and reply to the user. A **rite definition** supplies the name and a list of replies. The site writes the messages for starting and stopping a performance, and for a failed conjuration, from the rite's name and the space's words. The built-in rites are **Capture**, which confirms each conjuration, and **Brainstorm**, which replies with brainstorming cues. Either can be performed on any space. [Customize rite use case](../apps/web/use-cases/grimoire.md#use_case_customize_rite)

### Reply

The rite's answer to a conjuration, picked at random from the rite's reply list. A reply can prompt the user with a brainstorming or planning cue that helps them think of more, based on their goals or what they just wrote. Replies can use the rite's name and the space's words.

### Performance

A rite performed on one space of a quest, from start to stop. Starting a performance saves a **rite snapshot**, a copy of the definition, so editing or forgetting the rite leaves the performance unchanged. The **active performance** is the one in effect for everyone in the quest, and a quest has at most one. **Stop** or Start Day ends it. **Performances** is the quest's record of its past and active performances. [Performance use cases](../apps/web/use-cases/performances.md)

### Conjuration

A message a user writes during the active performance. Each conjuration adds one murmling to the performance's space, with the type the space sets, and the rite replies. A conjuration keeps its author. A user needs an active performance to make a conjuration. [Conjuration use case](../apps/web/use-cases/performances.md#use_case_send_message)

### Construct

The character shown with a performance's replies. The built-in constructs are Vellum and Lumen. A quest's starting point assigns its construct, and the quest keeps a snapshot of the construct's name and portrait. [Construct use cases](../apps/web/use-cases/constructs.md)

### Grimoire

The collection where a user finds built-in rites and manages their own rites. A **built-in rite** is a read-only definition supplied by the site. An **own rite** is a private definition that its owner creates or copies and can edit. Quest members share the performances in a quest according to quest access. They do not acquire access to the original private definition. [Grimoire use cases](../apps/web/use-cases/grimoire.md)

### Forgotten rite

An own rite put aside with **Forget**. It appears in the Grimoire's **Forgotten** tab and is unavailable for new performances. **Restore** makes the same definition available again. **Delete forever** permanently removes the definition. Both actions preserve existing rite snapshots. [Retirement use cases](../apps/web/use-cases/retirement.md)

## Accounts and personal progress

### Account

A user's identity and saved data, tied to their email address. Public sign-up creates the account when the user confirms their verification link and supplies a name. An **invited account** is set aside when a quest invitation goes to an address without an account. Its user supplies a name when completing sign-up. [Account use cases](../apps/web/use-cases/accounts.md) and [invitation acceptance](../apps/web/use-cases/quest-members.md#use_case_join_quest_by_link)

### Session

The signed-in state established when a user confirms an emailed link. Signing out ends the current browser's session. Signing out everywhere ends the account's sessions across browsers and devices. [Account use cases](../apps/web/use-cases/accounts.md)

### Event

A tracked action that earns experience: adding a murmling, checking off a task or completing a quest. An event belongs to the user who performed it, including in a shared quest. Unchecking a task or restoring a completed quest takes its event back. [Experience use case](../apps/web/use-cases/experience.md#use_case_experience)

### Experience

The weighted sum of a user's events. Adding a murmling earns 1 experience. Checking off a task earns 3, and completing a quest earns 9. Start Day's recurring task reset preserves experience.

### Circle

The user's level determined by experience. Progress starts at Circle 1, titled Initiate. The **experience ring** shows progress from the current circle's threshold toward the next one. [Experience ring use case](../apps/web/use-cases/experience.md#use_case_experience_ring)

### Days signed in

The private Profile count of distinct dates with a qualifying signed-in visit. Dates use Coordinated Universal Time (UTC), and each date counts once per account across sessions and devices. This count is independent of Start Day, streaks and experience. [Days signed in use case](../apps/web/use-cases/profile.md#use_case_days_signed_in)

## Timer

### Timer schedule

A repeating work and break cycle defined by a fixed start time and the two period lengths. Anyone with its link sees the current period and time remaining. The same schedule can run on the **Timer** page or in a quest's **Timer panel**. Sharing the link shares only the schedule. [Timer use cases](../apps/web/use-cases/timer.md)

### Global timer

A shared schedule with a common fixed start at the Unix epoch. Signed-in users who choose **Join global timer** with the same work and break lengths join the same schedule at its current period. [Global timer use case](../apps/web/use-cases/timer.md#use_case_timer_join_global)

### Timer presence

The count of other signed-in accounts recently following the same schedule. The count treats multiple tabs or devices on one account as one and displays no names. [Timer presence use case](../apps/web/use-cases/timer.md#use_case_timer_see_others)
