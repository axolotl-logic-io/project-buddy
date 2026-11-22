# Project Buddy glossary

Use these terms in code, copy, prompts, docs and issues so the same words describe the same behavior. Use the full term on first mention and in standalone labels. Shorten it when the surrounding text makes the meaning clear. For workflows and examples, see the [web use cases](../apps/web/use-cases/README.md).

## Quests and sharing

### Quest

A workspace for something the user wants to learn, make or do, or for their daily work. A quest has an owner, a status and a continuing quest conversation. Tasks, Ideas, Quick Notes and milestones belong to the quest and persist across spell casts. [Quest use cases](../apps/web/use-cases/quests.md)

### Quest starting point

A reusable preset that supplies the initial quest name, starting context and construct. The four starting points are Dailies, Learn a thing, Make a thing and Do a thing. Dailies and Learn a thing assign Vellum. Make a thing and Do a thing assign Lumen. Starting Dailies again opens the account's existing Dailies quest. [Starting point use case](../apps/web/use-cases/quests.md#use_case_browse_premade_quests)

### Quest status

The state of a quest: **Active** for ongoing work, **Completed** for finished work and **Abandoned** for work the user has stopped pursuing. **Complete** and **Abandon** keep the quest's contents. **Restore quest** returns it to Active. Pending describes an invitation. [Quest status use cases](../apps/web/use-cases/quest-status.md)

### Current quest

The Active quest offered under **Continue** on Quests. Among quests open to the user, it is the one with the most recent conversation activity, using the conversation start time when it has no messages. Continue also shows its next task when one exists. [Continue use case](../apps/web/use-cases/quests.md#use_case_continue_quest)

### Quest owner

The account that started the quest. The owner can work in the quest and manage sharing. The owner always retains access, including when membership changes. [Quest member powers](../apps/web/use-cases/quest-members.md#use_case_quest_member_powers)

### Quest member

An account that has accepted an invitation to the quest. Members share the quest's records and conversation with the owner. They can rename the quest, change its status, cast or stop its spell, invite others and remove other members. A member's own spells and other quests keep their existing access rules. [Quest member access](../apps/web/use-cases/quest-members.md#use_case_quest_member_access)

### Quest invitation

An offer sent to an email address to join a specific quest. A **pending invitee** can see their invitation in **Pending**. Accepting grants quest access and declining closes the invitation. An invitation to an address without an account sets aside an invited account for that address. [Quest invitation use cases](../apps/web/use-cases/quest-members.md)

### Quest open to a user

A quest the user owns or has joined as a quest member. Use **open to** for access and **Active** for quest status. A quest that is closed to the user behaves like a missing quest. [Private data use case](../apps/web/use-cases/accounts.md#use_case_private_data)

## Quest work

### Task

A piece of work the user has committed to in a quest. **Tasks** is the quest's ordered collection of open and done tasks and the section where users work with them. A task number identifies a task within its quest and stays the same when the task moves. To **complete** a task is to mark it done. To **reopen** it is to make it open again. [Task use cases](../apps/web/use-cases/tasks.md)

### Next task

The first open task in the quest's saved Tasks order. A quest with no open tasks has no next task. [Next task use case](../apps/web/use-cases/tasks.md#use_case_ask_whats_next)

### Idea

A possibility the user is considering. **Ideas** is the quest's ordered collection of these possibilities. **Move to Tasks** turns an idea into one open task and removes the idea in the same change. [Ideas use cases](../apps/web/use-cases/ideas.md)

### Quick Note

A short, dated thought saved to a quest. **Quick Notes** lists the quest's notes newest first. An Active quest can receive new notes. Completed and Abandoned quests allow their existing notes to be read, edited and deleted. [Quick Note use case](../apps/web/use-cases/quick-notes.md)

### Milestone

A dated record of what the user did or achieved in a quest. **Progress** shows the quest's milestones newest first. Editing a milestone keeps its recorded date. Use **streak milestone** for a recurring task's streak threshold. [Progress timeline use case](../apps/web/use-cases/quests.md#use_case_view_progress_timeline)

## Dailies

### Dailies quest

The user's one ongoing, private quest for daily work, created from the Dailies starting point. Its identity survives a rename. Naming an ordinary quest Dailies leaves it an ordinary quest. [Dailies use case](../apps/web/use-cases/quests.md#use_case_dailies)

### Dailies day

A day the owner explicitly begins with **Start Day** in an Active Dailies quest. It takes the browser's calendar date under normal conditions. Start Day records the previous day's recurring task results, ends the active spell and reopens done recurring tasks. One-off tasks keep their state unless the owner chooses to remove all tasks. **Undo Start Day** is available until a message is sent in the new day's conversation. [Start Day use case](../apps/web/use-cases/quests.md#use_case_start_day) and [Undo Start Day use case](../apps/web/use-cases/quests.md#use_case_undo_start_day)

### Recurring task

A Dailies task marked to do every day. Start Day reopens it if it is done, keeping its task number and place in Tasks. A **one-off task** has no daily reset. [Recurring task use case](../apps/web/use-cases/tasks.md#use_case_recurring_tasks)

### Streak

A run of consecutive calendar dates on which a recurring task was done. A missed date or a **gap**, a date with no Dailies day started, breaks the run. Multiple starts on the same date count as one date. A **streak milestone** is reached at 3, 7, 14 or 30 days, then at each multiple of 30 days. **Day grid** shows each recurring task's marks for up to seven recent dates. [Daily streak use case](../apps/web/use-cases/tasks.md#use_case_daily_streaks)

## Conversations and spells

### Quest conversation

The continuing exchange between people in a quest and its saved construct. A user needs an active spell to send a message. User messages retain their authors. Use **quest conversation** in product language. Existing storage and protocol names such as `ChatId` refer to the conversation at those boundaries. [Conversation use cases](../apps/web/use-cases/chats.md)

### Reply

The construct's answer to a message. **Stop reply** cancels the in-progress answer and leaves the active spell available for the next message. Saved text and completed actions may remain. [Stop reply use case](../apps/web/use-cases/chats.md#use_case_stop_reply)

### Construct

The character that replies in a quest conversation. The built-in constructs are Vellum and Lumen. A conversation keeps a snapshot of its construct, including the character shown with replies. Constructs answer through local commands and spell replies. [Construct use cases](../apps/web/use-cases/constructs.md)

### Command

A supported instruction sent as a conversation message, such as `help`, `look` or `exp`. The construct handles recognized commands through local rules. Use **CLI command** for an invocation of the `project-buddy` terminal program. [Conversation use cases](../apps/web/use-cases/chats.md) and [command-line use cases](../apps/web/use-cases/command-line.md)

### Spell

A named way to capture messages in a quest and reply to the user. A **spell definition** supplies the name, message destination and reply text. The **message destination** is Tasks or Ideas. In spell reply templates, `{{bucket}}` inserts the destination name. The built-in **Tasks spell** creates open tasks, and **Brainstorm** adds ideas. Use **Tasks spell** when both the spell and its destination appear in the same sentence. [Spellbook use cases](../apps/web/use-cases/spellbook.md)

### Cast

To activate a spell in a quest conversation. A cast saves a **spell snapshot**, a copy of the definition used by that cast, and opens a fresh transcript. The **active spell** is the cast currently in effect for everyone in that quest. Editing or forgetting the original definition leaves the cast in effect. **Stop** ends the active spell and closes its conversation view. Captured tasks and ideas stay in the quest. [Cast a spell](../apps/web/use-cases/spellbook.md#use_case_construct_casts_spell) and [message capture](../apps/web/use-cases/ideas.md#use_case_spell_buckets)

### Spell transcript

The messages and replies shown for a particular cast. The transcript starts fresh with each cast. Use **quest conversation** for the continuing exchange and **spell transcript** when referring to the messages of one cast. [Continue a conversation](../apps/web/use-cases/chats.md#use_case_continue_chat)

### Spellbook

The collection where a user finds built-in spells and manages their own spells. A **built-in spell** is a read-only definition supplied by the site. An **own spell** is a private definition that its owner creates or copies and can edit. Quest members share the result of a cast according to quest access. They do not acquire access to the original private definition. [Spellbook use cases](../apps/web/use-cases/spellbook.md)

### Forgotten spell

An own spell put aside with **Forget**. It appears in Spellbook's **Forgotten** tab and is unavailable for new casts. **Restore** makes the same definition available again. **Delete forever** permanently removes the definition. Both actions preserve existing cast snapshots. [Forgotten spell use cases](../apps/web/use-cases/retirement.md)

## Accounts and personal progress

### Account

A user's identity and saved data, tied to their email address. Public sign-up creates the account when the user confirms their verification link and supplies a name. An **invited account** is set aside when a quest invitation goes to an address without an account. Its user supplies a name when completing sign-up. [Account use cases](../apps/web/use-cases/accounts.md) and [invitation acceptance](../apps/web/use-cases/quest-members.md#use_case_join_quest_by_link)

### Session

The signed-in state established when a user confirms an emailed link. Signing out ends the current browser's session. Signing out everywhere ends the account's sessions across browsers and devices. [Account use cases](../apps/web/use-cases/accounts.md)

### Ability

A category of action tracked for a user. Adding tasks, Ideating, Quick Notes, Completing tasks and Completing quests each award one **ability point** for a qualifying action. Points belong to the user who performed it, including in a shared quest. [Experience use cases](../apps/web/use-cases/experience.md)

### Experience

The weighted sum of a user's ability points. Adding a task, idea or Quick Note earns 1 experience. Completing a task earns 3, and completing a quest earns 9. Reopening a completed task or quest takes back its completion point. The recurring task reset on Start Day preserves points. [Experience use case](../apps/web/use-cases/experience.md#use_case_experience)

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
