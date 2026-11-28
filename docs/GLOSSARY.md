# Project Buddy glossary

Use these terms in code, copy, prompts, docs and issues so the same words describe the same behavior. Use the full term on first mention and in standalone labels. Shorten it when the surrounding text makes the meaning clear. For workflows and examples, see the [web use cases](../apps/web/use-cases/README.md).

## Quests and sharing

### Quest

A workspace for something the user wants to learn, make or do, or for their daily work. A quest has an owner, a status and its lists. List items belong to the quest's lists and persist across performances. [Quest use cases](../apps/web/use-cases/quests.md)

### Quest panel

The panel beside a quest's pages: a link to the quest's **Members**, the quest's status controls, and the Timer. It docks on wide screens and opens as a drawer on phones. [Open quest use case](../apps/web/use-cases/quests.md#use_case_open_quest), [Quest panel use case](../apps/web/use-cases/quests.md#use_case_quest_panel)

### Life

The quest every user has for the things they do every day. Each user has exactly one, made when they first need it, named Life. Quests pins it above their other quests with how many of its recurring tasks are done today and one of those not done yet, suggested at random to check off. Life stays Active. [Life use case](../apps/web/use-cases/quests.md#use_case_life)

### Quest status

The state of a quest: **Active** for ongoing work, **Completed** for finished work and **Abandoned** for work the user has stopped pursuing. **Complete** and **Abandon** keep the quest's contents. **Restore quest** returns it to Active. Pending describes an invitation. [Quest status use cases](../apps/web/use-cases/quest-status.md)

### Resting

An Active quest with nothing happening in it for 30 days. Quests marks it Resting; it is still Active. [Quests use case](../apps/web/use-cases/quests.md#use_case_view_quests)

### Quest owner

The account that started the quest. The owner can work in the quest and manage sharing. The owner always retains access, including when membership changes. [Quest member powers](../apps/web/use-cases/quest-members.md#use_case_quest_member_powers)

### Quest member

An account that has accepted an invitation to the quest. Members share the quest's lists and performances with the owner. They can rename the quest, change its status, start or stop a performance, invite others and remove other members. A member's own rites and other quests keep their existing access rules. [Quest member access](../apps/web/use-cases/quest-members.md#use_case_quest_member_access)

### Private and shared quests

A **private** quest has only its owner. A **shared** quest has at least one quest member. A quest's overview says **Private** or **Shared**. Wherever quests are listed or chosen, a shared quest is marked **Shared**, or **Shared by** its owner's name for a member. [Quest member access](../apps/web/use-cases/quest-members.md#use_case_quest_member_access)

### Quest invitation

An offer sent to an email address to join a specific quest. A **pending invitee** can see their invitation in **Pending**. Accepting grants quest access and declining closes the invitation. An invitation to an address without an account sets aside an invited account for that address. [Quest invitation use cases](../apps/web/use-cases/quest-members.md)

### Quest open to a user

A quest the user owns or has joined as a quest member. Use **open to** for access and **Active** for quest status. A quest that is closed to the user behaves like a missing quest. [Private data use case](../apps/web/use-cases/accounts.md#use_case_private_data)

## Lists and list items

### List

A named, ordered collection of list items in a quest. Every list belongs to one quest. The site supports **plain**, **task**, **quick note** and **tally** lists. Each list type names its list items on screen: items, tasks, notes or tallies. Changing between these types converts every list item in the list. The site refuses the change when an item's text is too long for the new type. Themed wording belongs in a rite's replies rather than in the glossary. [List use cases](../apps/web/use-cases/lists.md)

A [Zotero Collection list](#zotero-collection-list) is a list of another kind: its list items are references that come from Zotero.

### List item

Anything in a list. A list item has its list's type. To **move** a list item is to place it in another list of the same quest. It keeps its text and takes the new list's type, and the site refuses the move when the text is too long for that type. To **split** a list item is to replace it with two or more list items in its place. The first keeps its identity, such as its task number, and the others are new. [List types use case](../apps/web/use-cases/lists.md#use_case_list_types) and [Split use case](../apps/web/use-cases/lists.md#use_case_split_list_item)

### Task

A list item in a task list: a piece of work the user has committed to. To **check off** a task is to mark it done. To **uncheck** it is to make it open again. A task number identifies a task within its quest and stays the same when the task moves to another task list. [Task use cases](../apps/web/use-cases/tasks.md)

### Next task

The first open task in the quest, taking its task lists in order and each list's tasks in their saved order. A quest with no open tasks has no next task. A pointing hand marks it on the quest's Overview. [Next task use case](../apps/web/use-cases/tasks.md#use_case_ask_whats_next)

### Quick note

A list item in a quick note list: a thought of up to 1000 characters, on several lines if needed, that shows the date it was added. A plain item or a task takes one line of up to 200 characters.

### Tally

A list item in a tally list: a count of something done each day, such as words written, mantras recited or books read. A tally has a **day total** on each quest day, 0 until it changes. To **increment** a tally is to add an amount to today's day total. Its **total** is the sum of all its day totals. Amounts can be fractional or negative, and show decimal places only when they aren't 0. Changing a tally earns no experience. A tally takes one line of up to 200 characters. [Tally list use case](../apps/web/use-cases/lists.md#use_case_tally_lists)

### Quick Add

The panel, open from any page, that adds a list item to a list of an Active quest without opening the quest. The item takes the list's type. [Quick Add use case](../apps/web/use-cases/lists.md#use_case_quick_add)

### Add box

The field under a quest's name on its Overview that searches the quest's lists and adds list items to whichever of them is chosen under it, one after another, or names a new task list. It works as the search box on a List page does. Unlike Quick Add, it adds only to the quest that is open. [Open quest use case](../apps/web/use-cases/quests.md#use_case_open_quest)

### List page

The page for one of a quest's lists, open from its section on Overview. Its **search box** narrows the list to the list items that contain what the user types, and Enter adds that text as a new list item unless the list already has it. The gear beside the list's name shows its settings. [Quest lists use case](../apps/web/use-cases/lists.md#use_case_quest_lists)

## Zotero lists

See the [Zotero use cases](../apps/web/use-cases/zotero.md) for workflows.

### Zotero connection

Permission a user grants Project Buddy through [Zotero's OAuth authorization flow](https://www.zotero.org/support/dev/web_api/v3/oauth). The user chooses **Connect Zotero** in Zotero setup and approves access in Zotero. Each Project Buddy account has at most one Zotero connection, and Project Buddy keeps its credentials on the server. The connection lets Project Buddy read collections and their references. Sending checkmark changes to Zotero requires permission to write to the library.

### Zotero Collection list

A list linked to one collection from the connected Zotero account. The quest owner chooses the collection from their personal library when they set up the list, and chooses **Create and sync** to import it. Each imported reference is a read-only list item displayed as a Modern Language Association (MLA) Works Cited entry. The list's search box filters references. The list takes no new list items and stays out of Quick Add, moves and performances. Zotero supplies the reference text and determines which references belong to the list.

### Zotero sync

An import or refresh that the quest owner starts. **Sync** on the List page imports additions, updates references, and removes entries that have left the collection. For a checkable Zotero Collection list, it also sends waiting checkmark changes to Zotero and reads which references have the checkmark tag. The List page shows the last successful sync time.

### Checkmark tag

The Zotero tag the quest owner specifies when they make a Zotero Collection list **Checkable**. A synced reference is checked when it has that tag and unchecked when it lacks it. The quest owner and quest members can check or uncheck references. They share the resulting changes, which wait until the quest owner's next **Sync** sends them as tag additions or removals. The tag belongs to the Zotero item and follows it across collections. Checking a reference earns no task experience.

## Days and streaks

### Quest day

A day in a quest, from one midnight to the next in the quest owner's time zone. Everyone in the quest shares the owner's days. A quest's weeks start on Monday and its months on the 1st, each at that midnight. Nothing runs at midnight: each read of a task works out whether it is still checked off in its current day, week or month. [Recurring task use case](../apps/web/use-cases/tasks.md#use_case_recurring_tasks)

### Time zone

The time zone whose midnight starts a new quest day in each quest the user owns. The user chooses it on sign-up, starting at the browser's own, and can change it in Settings. An account made before time zones has UTC. [Set time zone use case](../apps/web/use-cases/accounts.md#use_case_set_time_zone)

### Recurring task

A task marked to do again in every period of its **cadence**: daily, weekly or monthly, in any quest. When its next period starts (the next midnight, Monday or 1st of the month) it reads as unchecked again if it is checked off, keeping its task number and place in its list. A **one-off task** stays checked off. [Recurring task use case](../apps/web/use-cases/tasks.md#use_case_recurring_tasks)

### Streak

A run of consecutive periods of a recurring task's cadence (days, weeks or months) in each of which someone checked it off. A period without a check-off breaks the run. [Daily streak use case](../apps/web/use-cases/tasks.md#use_case_daily_streaks)

### Home

The signed-in landing page at the site's root, above Quests, the Grimoire and the Timer in the breadcrumbs. It shows links to Quests, the Grimoire and the Timer, then the user's experience, then **Streaks**: a grid for each cadence, Every day, Every week and Every month, with every recurring task of that cadence in the Active quests open to them over its last seven periods, which they can check off in place in any of those periods since the task was added. Then **Tallies**: every tally of those quests with its day totals over the same dates, each of which they can change, and an Increment for today. Then **Tasks**: every open one-off task of those quests, which they can check off in place; a checked-off task leaves Tasks, and Undo brings it back. [Home streaks use case](../apps/web/use-cases/home.md#use_case_home_streaks), [Home tallies use case](../apps/web/use-cases/home.md#use_case_home_tallies), [Home tasks use case](../apps/web/use-cases/home.md#use_case_home_tasks)

## Rites and performances

### Rite

A named way to add list items to a list and reply to the user. A **rite definition** supplies the name, a first message, a list of replies and a **reply order**. The order is **in order**, **random, with repeats** or **random, without repeats**. Without repeats, the rite uses each reply once before it uses any again. A rite either **loops**, starting its replies again after the last, or **concludes** with a **final reply** that ends the performance. The site writes the messages for stopping a performance, and for a message the list can't hold, from the rite's name and the list's type. The built-in rites are **Capture**, which confirms each message, and **Brainstorm**, which replies with brainstorming cues without repeats. Both loop. Either can be performed on any list. [Customize rite use case](../apps/web/use-cases/grimoire.md#use_case_customize_rite)

### First message

The rite's opening line in a performance, shown before anyone sends a message. It tells the user what the rite does and what to send. It can use the rite's name and the list's name.

### Reply

The rite's answer to a message in a performance, chosen from the rite's reply list in the rite's reply order. The browser chooses and shows the reply at once. The server checks that the rite could give that reply, and chooses again if not. A reply can prompt the user with a brainstorming or planning cue that helps them think of more, based on their goals or what they just wrote. Replies can use the rite's name, the list's name, the message's text and its author's name.

### Performance

A rite performed on one list of a quest, from start to stop. Starting a performance saves a **rite snapshot**, a copy of the definition, so editing or forgetting the rite leaves the performance unchanged. The **active performance** is the one in effect for everyone in the quest, and a quest has at most one. **Stop** ends it.

During the active performance, users in the quest send messages. Each message adds one list item to the performance's list, and the rite replies. A message keeps its author's name. [Performance use cases](../apps/web/use-cases/performances.md) and [send a message use case](../apps/web/use-cases/performances.md#use_case_send_message)

### Construct

The character shown with a performance's replies. The built-in constructs are Vellum and Lumen. A new quest gets Vellum, and keeps it. [Construct use cases](../apps/web/use-cases/constructs.md)

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

The user's level determined by experience. Progress starts at Circle 1, titled Initiate. The **experience ring** shows progress from the current circle's threshold toward the next one. [Experience use case](../apps/web/use-cases/experience.md#use_case_experience)

### Days signed in

The private Profile count of distinct dates with a qualifying signed-in visit. Dates use Coordinated Universal Time (UTC), and each date counts once per account across sessions and devices. This count is independent of the user's time zone, streaks and experience. [Days signed in use case](../apps/web/use-cases/profile.md#use_case_days_signed_in)

## Timer

### Timer schedule

A repeating work and break cycle defined by a fixed start time and the two period lengths. Anyone with its link sees the current period and time remaining. The same schedule can run on the **Timer** page or in a quest's **quest panel**. Sharing the link shares only the schedule. [Timer use cases](../apps/web/use-cases/timer.md)

### Global timer

A shared schedule with a common fixed start at the Unix epoch. Signed-in users who choose **Join global timer** with the same work and break lengths join the same schedule at its current period. [Global timer use case](../apps/web/use-cases/timer.md#use_case_timer_join_global)

### Timer presence

The count of other signed-in accounts recently following the same schedule. The count treats multiple tabs or devices on one account as one and displays no names. [Timer presence use case](../apps/web/use-cases/timer.md#use_case_timer_see_others)
