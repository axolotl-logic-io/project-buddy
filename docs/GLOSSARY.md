# Project Buddy glossary

Use these terms in code, copy, prompts, docs and issues so the same words describe the same behavior. Use the full term on first mention and in standalone labels. Shorten it when the surrounding text makes the meaning clear. For workflows and examples, see the [web use cases](../apps/web/use-cases/README.md).

## Quests and sharing

### Quest

A workspace for something the user wants to learn, make or do, or for their daily work. A quest has an owner, a status and its lists. List items belong to the quest's lists and persist across performances. [Quest use cases](../apps/web/use-cases/quests.md)

### Quest starting point

A reusable preset that supplies the initial quest name, starting context, construct and lists. Every starting point creates a Tasks list, which adds tasks, and an Ideas list, which adds plain list items. The four starting points are Dailies, Learn a thing, Make a thing and Do a thing. Dailies and Learn a thing assign Vellum. Make a thing and Do a thing assign Lumen. Each start makes a new quest. Dailies asks for no Why. [Starting point use case](../apps/web/use-cases/quests.md#use_case_browse_premade_quests)

### Quest status

The state of a quest: **Active** for ongoing work, **Completed** for finished work and **Abandoned** for work the user has stopped pursuing. **Complete** and **Abandon** keep the quest's contents. **Restore quest** returns it to Active. Pending describes an invitation. [Quest status use cases](../apps/web/use-cases/quest-status.md)

### Current quest

The Active quest offered under **Continue** on Quests. Among quests open to the user, it is the one with the most recent performance activity. A quest with no performances ranks by the time it started. Continue also shows its next task when one exists. [Continue use case](../apps/web/use-cases/quests.md#use_case_continue_quest)

### Quest owner

The account that started the quest. The owner can work in the quest and manage sharing. The owner always retains access, including when membership changes. [Quest member powers](../apps/web/use-cases/quest-members.md#use_case_quest_member_powers)

### Quest member

An account that has accepted an invitation to the quest. Members share the quest's lists and performances with the owner. They can rename the quest, change its status, start or stop a performance, invite others and remove other members. A member's own rites and other quests keep their existing access rules. [Quest member access](../apps/web/use-cases/quest-members.md#use_case_quest_member_access)

### Quest invitation

An offer sent to an email address to join a specific quest. A **pending invitee** can see their invitation in **Pending**. Accepting grants quest access and declining closes the invitation. An invitation to an address without an account sets aside an invited account for that address. [Quest invitation use cases](../apps/web/use-cases/quest-members.md)

### Quest open to a user

A quest the user owns or has joined as a quest member. Use **open to** for access and **Active** for quest status. A quest that is closed to the user behaves like a missing quest. [Private data use case](../apps/web/use-cases/accounts.md#use_case_private_data)

## Lists and list items

### List

A named, ordered collection of list items in a quest. Every list belongs to one quest and has one type: **plain**, **task** or **quick note**. Every list item in a list has the list's type, and the type names the items on screen: items, tasks or notes. A list also sets the verbs for checking off and unchecking its tasks. Changing a list's type converts every list item in it. The site refuses the change when an item's text is too long for the new type. Themed wording, such as spooky verbs, belongs in a list's verbs and a rite's replies rather than in the glossary. [List use cases](../apps/web/use-cases/lists.md)

### List item

Anything in a list. A list item has its list's type. To **move** a list item is to place it in another list of the same quest. It keeps its text and takes the new list's type, and the site refuses the move when the text is too long for that type. [List types use case](../apps/web/use-cases/lists.md#use_case_list_types)

### Task

A list item in a task list: a piece of work the user has committed to. To **check off** a task is to mark it done. To **uncheck** it is to make it open again. The list's verbs name these actions on screen. A task number identifies a task within its quest and stays the same when the task moves to another task list. [Task use cases](../apps/web/use-cases/tasks.md)

### Next task

The first open task in the quest, taking its task lists in order and each list's tasks in their saved order. A quest with no open tasks has no next task. [Next task use case](../apps/web/use-cases/tasks.md#use_case_ask_whats_next)

### Quick note

A list item in a quick note list: a thought of up to 1000 characters, on several lines if needed, that shows the date it was added. A plain item or a task takes one line of up to 200 characters.

### Quick Add

The panel, open from any page, that adds a list item to a list of an Active quest without opening the quest. The item takes the list's type. [Quick Add use case](../apps/web/use-cases/lists.md#use_case_quick_add)

## Days and streaks

### Quest day

A day in a quest, from one midnight to the next in the quest owner's time zone. Everyone in the quest shares the owner's days. Nothing runs at midnight: each read of a task works out whether it is still checked off today. [Recurring task use case](../apps/web/use-cases/tasks.md#use_case_recurring_tasks)

### Time zone

The time zone whose midnight starts a new quest day in each quest the user owns. The user chooses it on sign-up, starting at the browser's own, and can change it in Settings. An account made before time zones has UTC. [Set time zone use case](../apps/web/use-cases/accounts.md#use_case_set_time_zone)

### Recurring task

A task marked to do every day, in any quest. At the next midnight it reads as unchecked again if it is checked off, keeping its task number and place in its list. A **one-off task** stays checked off. [Recurring task use case](../apps/web/use-cases/tasks.md#use_case_recurring_tasks)

### Streak

A run of consecutive quest days on which someone checked off a recurring task. A day without a check-off breaks the run. **Day grid** shows each recurring task's marks for up to seven recent dates. [Daily streak use case](../apps/web/use-cases/tasks.md#use_case_daily_streaks)

### Home

The signed-in landing page at the site's root, above Quests in the breadcrumbs. It shows the user's experience, then **Streaks**: every recurring task of the Active quests open to them over the last seven dates, which they can check off in place on any of those dates since the task was added. [Home streaks use case](../apps/web/use-cases/home.md#use_case_home_streaks)

## Rites and performances

### Rite

A named way to add list items to a list and reply to the user. A **rite definition** supplies the name and a list of replies. The site writes the messages for starting and stopping a performance, and for a message the list can't hold, from the rite's name and the list's type. The built-in rites are **Capture**, which confirms each message, and **Brainstorm**, which replies with brainstorming cues. Either can be performed on any list. [Customize rite use case](../apps/web/use-cases/grimoire.md#use_case_customize_rite)

### Reply

The rite's answer to a message in a performance, picked at random from the rite's reply list. A reply can prompt the user with a brainstorming or planning cue that helps them think of more, based on their goals or what they just wrote. Replies can use the rite's name, the list's name, the message's text and its author's name.

### Performance

A rite performed on one list of a quest, from start to stop. Starting a performance saves a **rite snapshot**, a copy of the definition, so editing or forgetting the rite leaves the performance unchanged. The **active performance** is the one in effect for everyone in the quest, and a quest has at most one. **Stop** ends it.

During the active performance, users in the quest send messages. Each message adds one list item to the performance's list, and the rite replies. A message keeps its author's name. [Performance use cases](../apps/web/use-cases/performances.md) and [send a message use case](../apps/web/use-cases/performances.md#use_case_send_message)

### Construct

The character shown with a performance's replies. The built-in constructs are Vellum and Lumen. A quest's starting point assigns its construct, and the quest keeps it. [Construct use cases](../apps/web/use-cases/constructs.md)

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

A tracked action that earns experience: adding a list item, checking off a task or completing a quest. An event belongs to the user who performed it, including in a shared quest. Unchecking a task or restoring a completed quest takes its event back. [Experience use case](../apps/web/use-cases/experience.md#use_case_experience)

### Experience

The weighted sum of a user's events. Adding a list item earns 1 experience. Checking off a task earns 3, and completing a quest earns 9. Midnight's uncheck of a recurring task preserves experience.

### Circle

The user's level determined by experience. Progress starts at Circle 1, titled Initiate. The **experience ring** shows progress from the current circle's threshold toward the next one. [Experience ring use case](../apps/web/use-cases/experience.md#use_case_experience_ring)

### Days signed in

The private Profile count of distinct dates with a qualifying signed-in visit. Dates use Coordinated Universal Time (UTC), and each date counts once per account across sessions and devices. This count is independent of the user's time zone, streaks and experience. [Days signed in use case](../apps/web/use-cases/profile.md#use_case_days_signed_in)

## Timer

### Timer schedule

A repeating work and break cycle defined by a fixed start time and the two period lengths. Anyone with its link sees the current period and time remaining. The same schedule can run on the **Timer** page or in a quest's **Timer panel**. Sharing the link shares only the schedule. [Timer use cases](../apps/web/use-cases/timer.md)

### Global timer

A shared schedule with a common fixed start at the Unix epoch. Signed-in users who choose **Join global timer** with the same work and break lengths join the same schedule at its current period. [Global timer use case](../apps/web/use-cases/timer.md#use_case_timer_join_global)

### Timer presence

The count of other signed-in accounts recently following the same schedule. The count treats multiple tabs or devices on one account as one and displays no names. [Timer presence use case](../apps/web/use-cases/timer.md#use_case_timer_see_others)
