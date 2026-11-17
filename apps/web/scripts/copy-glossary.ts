import { type CopySheetField, csvRows } from "./copy-sheet.ts";

interface WriterTerm {
  readonly term: string;
  readonly heading: string;
  readonly aliases: readonly string[];
  readonly definition: string;
}

// Plain-language explanations based on the named sections of GLOSSARY.md.
const WRITER_TERMS: readonly WriterTerm[] = [
  {
    term: "Project Buddy",
    heading: "Project Buddy",
    aliases: ["Project Buddy"],
    definition:
      "The website these descriptions are for. People use it to work toward things they want to do, make or learn. Each goal is worked on in a quest, with a construct, a conversation and places to save work and ideas.",
  },
  {
    term: "Workshop",
    heading: "Workshop",
    aliases: ["Workshop"],
    definition:
      "The page where people find constructs and spells, make their own copies and change the copies they own.",
  },
  {
    term: "Site panel",
    heading: "Site panel",
    aliases: ["site panel"],
    definition:
      "The panel on the left of every page, opened from the button at the start of the header. It holds links to the site's places, the person's own pages, the Light, Dark and System choices and Credits. On a wide screen it can stay open beside the page.",
  },
  {
    term: "Prompt",
    heading: "Prompt",
    aliases: ["prompt", "prompts"],
    definition:
      "Instructions once used to guide how a construct replied. Some descriptions refer to editing these instructions in an older version of the site. The current site follows typed commands instead and does not offer this instruction editor.",
  },
  {
    term: "Character Sheet",
    heading: "Character Sheet",
    aliases: ["Character Sheet"],
    definition:
      "A heading in older saved instructions for a built-in construct. It is not a form the person can fill in.",
  },
  {
    term: "Built-in construct or spell",
    heading: "Built-in construct or spell",
    aliases: ["built-in spell", "built-in spells"],
    definition:
      "A construct or spell supplied with the website. People can use it or make a separate copy, but cannot change the supplied original. The supplied spells are Tasks and Brainstorm.",
  },
  {
    term: "Own construct",
    heading: "Own construct",
    aliases: [
      "own construct",
      "own constructs",
      "custom construct",
      "custom constructs",
    ],
    definition:
      "A construct someone has made or copied and can change. Sharing a quest using it does not let others change the original construct.",
  },
  {
    term: "Retire",
    heading: "Retire, Graveyard, restore, delete forever",
    aliases: ["retire", "retired", "retiring", "retirement"],
    definition:
      "Put aside a construct or spell the person owns without losing its settings. It cannot be chosen for new use until restored. Existing conversations keep what they already saved.",
  },
  {
    term: "Graveyard",
    heading: "Retire, Graveyard, restore, delete forever",
    aliases: ["Graveyard"],
    definition:
      "The page listing a person's retired constructs and spells. They can bring one back for use or permanently delete it here.",
  },
  {
    term: "Restore",
    heading: "Retire, Graveyard, restore, delete forever",
    aliases: ["restore", "restoring", "restored", "restoration"],
    definition:
      "Make a retired construct or spell available again, keeping its saved settings. For a Completed or Abandoned quest, restore means change its status back to Active.",
  },
  {
    term: "Delete forever",
    heading: "Retire, Graveyard, restore, delete forever",
    aliases: [
      "delete forever",
      "permanently delete",
      "permanent deletion",
      "permanently deleted",
    ],
    definition:
      "Remove a retired construct or spell for good after asking the person to confirm. It cannot be brought back. Conversations already started keep their saved copies.",
  },
  {
    term: "Create construct",
    heading: "Create, make a copy, edit, save, cancel",
    aliases: [
      "create construct",
      "creating a construct",
      "creating or copying a construct",
    ],
    definition:
      "Make a private construct that the person can name and change. This does not start a quest.",
  },
  {
    term: "Make a copy",
    heading: "Create, make a copy, edit, save, cancel",
    aliases: [
      "make a copy",
      "copying",
      "copies",
      "editable copy",
      "editable copies",
    ],
    definition:
      "Make a separate construct or spell that the person can change without changing the original. The new copy opens for editing and initially adds (copy) to its name.",
  },
  {
    term: "Edit",
    heading: "Create, make a copy, edit, save, cancel",
    aliases: ["edit", "editing", "edited"],
    definition:
      "Open something the person owns so they can change its saved name or settings.",
  },
  {
    term: "Save",
    heading: "Create, make a copy, edit, save, cancel",
    aliases: ["save", "saved", "saving"],
    definition:
      "Keep the person's changes. When editing a construct or spell, leaving without saving may keep unfinished changes in the browser, but does not change the saved version.",
  },
  {
    term: "Cancel",
    heading: "Create, make a copy, edit, save, cancel",
    aliases: ["cancel", "cancelling", "canceled", "cancelled"],
    definition:
      "Abandon changes in an editing form and return to the last saved version.",
  },
  {
    term: "Message",
    heading: "Message",
    aliases: ["message", "messages"],
    definition:
      "Something written in a quest conversation: either text sent by a person or a reply from its construct.",
  },
  {
    term: "Context",
    heading: "Context",
    aliases: ["context"],
    definition:
      "Information available when a reply is prepared, such as recent messages and current Tasks. Older descriptions also refer to instructions supplied to a reply-writing service. A person's private information is not automatically included.",
  },
  {
    term: "Placeholder",
    heading: "Placeholder",
    aliases: ["placeholder", "placeholders", "marker", "markers"],
    definition:
      "A marker such as {{name}} that stands for information to be filled in, such as a person's name. In a template, keep the marker exactly as shown. Some instructions show markers as examples rather than replacing them immediately.",
  },
  {
    term: "Snapshot",
    heading: "Snapshot",
    aliases: ["snapshot", "snapshots", "saved copy", "saved copies"],
    definition:
      "A copy of a construct's name and settings kept when a conversation starts. Editing the original afterward does not change that conversation's copy. A spell also keeps its settings when it is cast.",
  },
  {
    term: "Harness",
    heading: "Harness",
    aliases: ["harness"],
    definition:
      "The site's behind-the-scenes code for preparing replies, carrying out actions and checking what the person may access. This term belongs to older technical descriptions, not text for the site's users.",
  },
  {
    term: "Global prompt",
    heading: "Global prompt",
    aliases: ["global prompt"],
    definition:
      "Shared instructions once supplied to every conversation. People cannot edit these rules. References to them concern an older reply-writing system.",
  },
  {
    term: "Construct",
    heading: "Construct",
    aliases: ["construct", "constructs"],
    definition:
      "The named presence a person works with in a quest conversation. It has a name, an appearance and pictures. Each conversation keeps one construct. In the current site it responds to commands; it does not send requests to an outside AI service.",
  },
  {
    term: "Construct code names",
    heading: "Construct code names",
    aliases: ["construct code names"],
    definition:
      "Names used by programmers to store and refer to constructs. They are not labels the writer needs to explain to site users.",
  },
  {
    term: "Built-in construct",
    heading: "Built-in construct",
    aliases: ["built-in construct", "built-in constructs"],
    definition:
      "A construct supplied with the site, such as Vellum or Lumen. A person can use it or make an editable copy, but cannot change the supplied original.",
  },
  {
    term: "Default construct",
    heading: "Default construct",
    aliases: ["default construct"],
    definition:
      "Vellum, used when a starting point or other choice does not specify a different construct.",
  },
  {
    term: "Vellum",
    heading: "Default construct",
    aliases: ["Vellum"],
    definition:
      "The site's calm, patient construct, associated with maps and finding a next step. It is used for Dailies and Learn a thing, and its voice is also used in sign-in and invitation emails.",
  },
  {
    term: "Lumen",
    heading: "Premade quest",
    aliases: ["Lumen"],
    definition:
      "The site's bright, eager construct, associated with sparks and exploring possibilities. It is used for Make a thing and Do a thing.",
  },
  {
    term: "Visual description",
    heading: "Construct",
    aliases: ["Visual description", "appearance description"],
    definition:
      "Saved text describing what a construct looks like. The look command displays it. Changing the text does not replace existing pictures.",
  },
  {
    term: "Voice",
    heading: "Voice",
    aliases: ["voice"],
    definition:
      "The way a construct speaks, such as Vellum's calm, patient style or Lumen's enthusiasm. These descriptions guide the writing about the construct; the current command system does not read old voice instructions.",
  },
  {
    term: "Habits",
    heading: "Habits",
    aliases: ["habits"],
    definition:
      "The way a construct is described as helping, rather than how it speaks. The current command system does not read old instructions about these habits.",
  },
  {
    term: "Spell",
    heading: "Spell",
    aliases: ["spell", "spells"],
    definition:
      "A setting turned on in a quest conversation to choose where messages sent afterward are saved. Tasks saves them as tasks; Brainstorm saves them as Ideas. A person can also make spells with their own names and written replies.",
  },
  {
    term: "Cast",
    heading: "Cast",
    aliases: ["cast", "casting", "casts"],
    definition:
      "Turn on a spell in the current conversation. Turning on a different spell replaces the previous one. It does not move messages that were saved earlier.",
  },
  {
    term: "Stop spell",
    heading: "Stop spell",
    aliases: [
      "stop spell",
      "stop tasks",
      "stop brainstorm",
      "turns the spell off",
      "turning a spell",
    ],
    definition:
      "Turn off the current spell so new messages are no longer saved by it. Use the Stop control beside the message box or type stop. This is different from stopping a reply while it is being written.",
  },
  {
    term: "Conversation",
    heading: "Conversation",
    aliases: ["conversation", "conversations"],
    definition:
      "The continuing exchange of messages between people working on a quest and its one construct. Each quest has one conversation, shared with everyone who has joined that quest.",
  },
  {
    term: "Quest status",
    heading: "Quest status",
    aliases: ["quest status", "status", "active", "completed", "abandoned"],
    definition:
      "The state of a quest: Active means still being worked on; Completed means the goal was finished; Abandoned means the person chose to move on. Changing status keeps its contents. A Completed or Abandoned quest can become Active again.",
  },
  {
    term: "Opening",
    heading: "Opening",
    aliases: ["opening", "first reply", "first message"],
    definition:
      "The construct's first message when a quest conversation begins. Starting a conversation does not turn on a spell.",
  },
  {
    term: "Current quest",
    heading: "Current quest",
    aliases: ["current quest"],
    definition:
      "The Active quest offered in the Continue card on the Quests page, based on the most recently used conversation the person can access.",
  },
  {
    term: "Conversation image",
    heading: "Conversation image",
    aliases: ["conversation image", "attached image", "image attached"],
    definition:
      "A picture already saved in a conversation message. People who can open the quest can view it. New messages now accept text only.",
  },
  {
    term: "Author",
    heading: "Author",
    aliases: ["author", "authors"],
    definition:
      "The person who wrote a message. Their name stays with the message even if they leave the quest or someone else views it.",
  },
  {
    term: "Reply",
    heading: "Reply",
    aliases: ["reply", "replies"],
    definition:
      "The construct's response to a message. It may include text and actions such as saving a task. In the current site, replies follow the commands and spell settings rather than being written by an outside AI service.",
  },
  {
    term: "Quest",
    heading: "Quest",
    aliases: ["quest", "quests"],
    definition:
      "Something a person wants to do, make or learn. Each quest has one conversation, a construct, Tasks, Ideas, Progress and Quick Notes. It can be private or shared with people who accept invitations.",
  },
  {
    term: "Start a quest",
    heading: "Start a quest",
    aliases: ["start a quest", "starting a quest", "start quest"],
    definition:
      "Open the form for choosing a starting point and entering a quest's details. The quest is created only when the person confirms. Browsing choices or closing the form creates nothing.",
  },
  {
    term: "Premade quest",
    heading: "Premade quest",
    aliases: [
      "premade quest",
      "premade quests",
      "starting point",
      "starting points",
    ],
    definition:
      "One of four choices for beginning a quest: Dailies, Learn a thing, Make a thing or Do a thing. Each supplies a suggested name and construct. Once started, quests work the same way regardless of this choice.",
  },
  {
    term: "Dailies",
    heading: "Dailies",
    aliases: ["Dailies"],
    definition:
      "A person's one ongoing private quest for starting the day. Opening it again returns to the same conversation. A new day begins only when the person chooses Start Day. Some of its steps can repeat every day, and each of those counts a streak.",
  },
  {
    term: "Start Day",
    heading: "Start Day",
    aliases: ["Start Day", "Undo Start Day", "starting the day"],
    definition:
      "A control in Dailies for beginning a new day, after confirmation. It sets the old conversation aside, opens an empty one and marks finished daily tasks open again. Other tasks, Ideas and Progress stay as they are, unless the person chooses to remove tasks or Ideas. A line under it says how long ago the last day started. Until someone sends a message, Undo Start Day brings everything back.",
  },
  {
    term: "Recurring task",
    heading: "Recurring task",
    aliases: ["recurring task", "recurring tasks", "Make recurring"],
    definition:
      "A task in Dailies that the person means to do every day. Each new day marks it open again and remembers whether it was done.",
  },
  {
    term: "Streak",
    heading: "Streak",
    aliases: ["streak", "streaks"],
    definition:
      "How many days in a row the person has done a recurring task in Dailies. A day the task wasn't done ends it, and so does a day with no Start Day.",
  },
  {
    term: "Milestone",
    heading: "Milestone",
    aliases: ["milestone", "milestones", "Milestone reached"],
    definition:
      "A length a streak can reach: 3, 7, 14 or 30 days, then every 30 days after that. A milestone in the Progress list is a different thing.",
  },
  {
    term: "Streak chain",
    heading: "Streak chain",
    aliases: ["streak chain", "streak chains"],
    definition:
      "A row of links under a recurring task in Dailies. Each day of the streak fills one, and today's stays dashed until the task is done. The chain ends at the next milestone, and a line under it says what checking the task off does.",
  },
  {
    term: "Gap",
    heading: "Gap",
    aliases: ["gap", "no day started"],
    definition:
      "A date on which the person didn't start a day in Dailies. It ends every streak, and the Progress section shows it with a dashed square.",
  },
  {
    term: "Quest code names",
    heading: "Quest code names",
    aliases: ["quest code names"],
    definition:
      "Names used by programmers to refer to quests in the code and saved data. For site users, the name is Quest.",
  },
  {
    term: "Personal quest",
    heading: "Personal quest",
    aliases: ["personal quest", "private quest"],
    definition:
      "A quest only its creator can open. It becomes a multi-user quest when someone accepts an invitation. Dailies always stays private.",
  },
  {
    term: "Goal",
    heading: "Goal",
    aliases: ["goal", "goals"],
    definition:
      "What the person wants to achieve through a quest. It is discussed in the conversation; there is no separate Goal box to fill in.",
  },
  {
    term: "Recorded milestone",
    heading: "Milestone (recorded)",
    aliases: ["recorded milestone", "recorded milestones"],
    definition:
      "A short, dated description of something the person has finished in a quest. The construct records it in Progress; people with access can edit or delete it.",
  },
  {
    term: "Progress timeline",
    heading: "Progress timeline",
    aliases: [
      "progress timeline",
      "progress list",
      "progress section",
      "progress",
    ],
    definition:
      "The quest's list of recorded milestones, shown under Progress. It celebrates finished work. In Dailies, a grid above it shows the last week of each daily step.",
  },
  {
    term: "Next task",
    heading: "Next task",
    aliases: ["next task"],
    definition:
      "The first unfinished task in a quest's Tasks list: the small piece of work the person plans to do next.",
  },
  {
    term: "Active spell",
    heading: "Active spell",
    aliases: ["active spell", "current spell", "spell currently turned on"],
    definition:
      "The spell currently turned on in a conversation, if any. It decides whether later messages go into Tasks or Ideas. It stays on until stopped or replaced by another spell.",
  },
  {
    term: "Ideas",
    heading: "Ideas",
    aliases: ["idea", "ideas"],
    definition:
      "A quest's saved possibilities that the person has not yet decided to do. They can add, change, delete or move an idea into Tasks. Ideas are not checked off as done.",
  },
  {
    term: "Quick Note",
    heading: "Quick Note",
    aliases: ["Quick Note", "Quick Notes"],
    definition:
      "A short piece of text saved to an Active quest from the site panel, without opening that quest. Quick Notes are listed newest first in the quest's Quick Notes section. The construct does not read them.",
  },
  {
    term: "Experience",
    heading: "Experience",
    aliases: ["experience"],
    definition:
      "One number for everything a person has done across their quests: the points from each of their abilities added together, with some abilities worth more than others. It counts only finished actions, never open work, days or streaks. It decides their circle, and their Profile shows it.",
  },
  {
    term: "Ability",
    heading: "Ability",
    aliases: ["ability", "abilities"],
    definition:
      "One kind of action that earns a person a point each time: adding tasks, ideating (adding ideas), saving Quick Notes, completing tasks and completing quests. Adding a task, idea or Quick Note is worth 1 experience, completing a task 3 and completing a quest 9. Reopening a completed task or quest takes its point back.",
  },
  {
    term: "Circle",
    heading: "Circle",
    aliases: ["circle", "circles"],
    definition:
      "A person's level, set by their experience. Each circle needs a little more experience than the one before. Some circles bring a new title: Initiate, Apprentice, Practitioner, Expert, Master, Pathfinder, Grand Master, Legendary and Transcendent.",
  },
  {
    term: "Buckets",
    heading: "Buckets",
    aliases: ["Buckets", "bucket", "buckets"],
    definition:
      "The first tab beside a quest conversation. It opens a short menu of the quest's Tasks, Ideas, Quick Notes and Progress, and shows the one chosen, with its name as the heading.",
  },
  {
    term: "Quest sidebar actions",
    heading: "Quest sidebar actions",
    aliases: ["quest sidebar actions", "Actions tab", "side menu"],
    definition:
      "The Actions section of the area beside a quest conversation. It contains controls for choosing a spell and, for an Active Dailies quest, Start Day.",
  },
  {
    term: "Tasks",
    heading: "Tasks",
    aliases: ["Tasks"],
    definition:
      "A quest's ordered list of work still to do. People can add tasks, edit them, check them off, move them or remove them. Changes can be undone. Tasks does not set deadlines or count days.",
  },
  {
    term: "Task",
    heading: "Task",
    aliases: ["task", "tasks"],
    definition:
      "One short line of work in Tasks, marked unfinished or done. Its number, such as #3, identifies it within the quest. Finishing a task does not automatically add a milestone to Progress.",
  },
  {
    term: "Tasks change",
    heading: "Tasks change",
    aliases: ["Tasks change", "change to Tasks", "changes to Tasks"],
    definition:
      "A note in the conversation showing what changed in Tasks, with an Undo control. The change may have been made by a person or by the construct.",
  },
  {
    term: "Command",
    heading: "Command",
    aliases: ["command", "commands"],
    definition:
      "A short instruction typed in the message box, such as /done 3. The site runs it as soon as it is sent. Typing / shows the command list. Commands such as tasks and brainstorm also work without /. Each control in the quest sidebar sends one of these to the conversation, as if the user had typed it.",
  },
  {
    term: "Command note",
    heading: "Command note",
    aliases: ["command note", "command notes"],
    definition:
      "The line the conversation shows under a command that changed the quest, saying what it did. The construct reads it on its next reply but does not answer it.",
  },
  {
    term: "Brainstorm",
    heading: "Spell",
    aliases: ["Brainstorm"],
    definition:
      "The supplied spell that saves messages sent while it is on into the quest's Ideas list.",
  },
  {
    term: "Tool",
    heading: "Tool",
    aliases: ["tool", "tools"],
    definition:
      "An action the construct can carry out during a reply, such as changing Tasks or recording a milestone. The writer can usually call this an action instead of using the technical word tool.",
  },
  {
    term: "Tool part",
    heading: "Tool part",
    aliases: ["tool part", "tool parts"],
    definition:
      "The part of a conversation showing an action carried out during a reply. It may appear within the reply or below it.",
  },
  {
    term: "Working note",
    heading: "Working note",
    aliases: ["working note"],
    definition:
      "A short explanation from the construct shown just above a spell being turned on.",
  },
  {
    term: "Installed app",
    heading: "Installed app",
    aliases: ["installed app", "Home Screen"],
    definition:
      "Project Buddy added to a phone's Home Screen so it opens in its own window. It remains the same website and does not keep an offline copy.",
  },
  {
    term: "Profile",
    heading: "Profile",
    aliases: ["Profile"],
    definition:
      "A person's own page, where they change their saved name and see their experience, circle, points in each ability and days signed in.",
  },
  {
    term: "Days signed in",
    heading: "Days signed in",
    aliases: ["days signed in", "day signed in", "days total"],
    definition:
      "The private total of UTC calendar dates when a person visited while signed in. Each date counts once across tabs and devices, including returns without a fresh sign-in. Tracking starts with their first visit after release; earlier days are not included. It earns no experience and is separate from Dailies and streaks.",
  },
  {
    term: "Settings",
    heading: "Settings",
    aliases: ["Settings"],
    definition:
      "The page where a person changes their appearance choices and sign-in security.",
  },
  {
    term: "User",
    heading: "User",
    aliases: ["user", "users", "person", "people"],
    definition:
      "A person with a Project Buddy account, identified by their email address.",
  },
  {
    term: "Role",
    heading: "Role",
    aliases: ["role", "roles"],
    definition:
      "An account's ordinary-user or administrator setting. Neither setting gives access to someone else's private information.",
  },
  {
    term: "Acting user",
    heading: "Acting user",
    aliases: ["acting user"],
    definition:
      "The person carrying out an action now. What they can see or change depends on their own access, not on who wrote a message or owns the quest.",
  },
  {
    term: "Owner",
    heading: "Owner",
    aliases: ["owner", "owners"],
    definition:
      "The person who created a quest. They cannot be removed from it. A person also owns their private constructs and spells; sharing a quest does not share those originals. The site owner means the person running the website.",
  },
  {
    term: "Sign-up link",
    heading: "Sign-up link",
    aliases: ["sign-up link", "sign up link"],
    definition:
      "An emailed link for someone creating an account. It lasts 30 minutes. Opening it does not create the account; choosing Continue verifies the email, creates the account and signs that browser in.",
  },
  {
    term: "Sign-in link",
    heading: "Sign-in link",
    aliases: ["sign-in link", "sign in link", "signing in"],
    definition:
      "An emailed link that lets someone enter their existing account. An invited person also gives their name to finish setting up their account when they continue.",
  },
  {
    term: "Session",
    heading: "Session, sign out everywhere",
    aliases: ["session", "sessions"],
    definition:
      "A browser staying signed in to an account. Signing out ends that access in the browser; signing out everywhere ends it on every browser and device.",
  },
  {
    term: "Sign out everywhere",
    heading: "Session, sign out everywhere",
    aliases: ["sign out everywhere", "signs out on every browser"],
    definition:
      "An action that signs the person out on every browser and device, including the one they are using. Old sign-in and invitation links stop working, but pending invitations remain.",
  },
  {
    term: "Multi-user quest",
    heading: "Multi-user quest",
    aliases: [
      "multi-user quest",
      "multi-user quests",
      "shared quest",
      "shared quests",
    ],
    definition:
      "A quest shared by its creator and at least one person who accepted an invitation. They share its conversation, Tasks, Ideas, Progress and Quick Notes. Labels such as Shared or Shared by help distinguish it from a private quest.",
  },
  {
    term: "Member",
    heading: "Member",
    aliases: ["member", "members"],
    definition:
      "Someone who accepted an invitation to a quest. They can read and change it, invite others, remove other members or leave, but cannot remove its owner. Leaving does not remove what they wrote.",
  },
  {
    term: "Quest invitation",
    heading: "Quest invitation",
    aliases: [
      "quest invitation",
      "quest invitations",
      "invitation",
      "invitations",
    ],
    definition:
      "An email inviting someone to one quest. They must accept before they can open it. An invitation can be accepted, declined or withdrawn. Inviting an email with no account creates an invited account.",
  },
  {
    term: "Acceptance link",
    heading: "Acceptance link",
    aliases: ["acceptance link", "invitation link", "invitation links"],
    definition:
      "The link in a quest invitation email. Opening it does not join the quest; choosing Continue signs in as the invited person and accepts that one invitation. It works once, for seven days, unless replaced by a fresh invitation.",
  },
  {
    term: "Pending quest",
    heading: "Pending quest",
    aliases: ["pending quest", "pending quests", "Pending"],
    definition:
      "A quest someone has been invited to but has not joined. It appears under Pending on the Quests page. Pending describes the unanswered invitation, not whether the quest itself is Active, Completed or Abandoned.",
  },
  {
    term: "Invited account",
    heading: "Invited account",
    aliases: ["invited account", "invited accounts"],
    definition:
      "An account created when someone without an account is invited to a quest. They finish setting it up by following an emailed link and giving their name. Finishing account setup does not accept every invitation.",
  },
  {
    term: "Signed-up account",
    heading: "Signed-up account",
    aliases: ["signed-up account", "signed up account"],
    definition:
      "An account whose person has finished signing up. They keep the same account and any pending invitations.",
  },
  {
    term: "Client",
    heading: "Client",
    aliases: ["client", "clients"],
    definition:
      "Software that uses the site's planned connection feature to act for a person. This feature is planned and is not currently available.",
  },
  {
    term: "External agent",
    heading: "External agent",
    aliases: ["external agent", "external agents"],
    definition:
      "Software outside Project Buddy that could act for a person through the planned connection feature. It is not a construct or a separate person with an account.",
  },
  {
    term: "Connection",
    heading: "Connection",
    aliases: ["connection", "connections"],
    definition:
      "A person's permission for outside software to act for them within agreed limits. This feature is planned and is not currently available.",
  },
  {
    term: "Connection permission",
    heading: "Connection permission",
    aliases: ["connection permission", "connection permissions"],
    definition:
      "One action a person would allow outside software to carry out through a connection, such as reading or changing their information. It cannot give access the person does not already have. This feature is planned.",
  },
  {
    term: "Login command",
    heading: "Login command",
    aliases: ["login command"],
    definition:
      "A planned instruction for outside software to ask someone to sign in and approve a connection. It is not the wording for signing in on the website.",
  },
  {
    term: "Chat",
    heading: "Chat, adventure",
    aliases: ["Chat", "adventure"],
    definition:
      "Ordinary conversation when no spell is turned on. Older code sometimes uses chat or adventure to mean a quest's conversation. Use conversation in writing for the site.",
  },
  {
    term: "Generated image",
    heading: "Generated image",
    aliases: [
      "generated image",
      "generated images",
      "generating",
      "image generation",
    ],
    definition:
      "A picture created and saved by an older version of the site. The current site does not create new pictures, but people with access to a quest can still view its saved pictures.",
  },
  {
    term: "Gold, batteries, listings and purchases",
    heading: "Gold, batteries, listings and purchases",
    aliases: ["gold", "batteries", "listings", "purchases", "balances"],
    definition:
      "Names left over from an older version. The current site has no money balance, charges or purchases. Do not describe these as available features.",
  },
  {
    term: "Other inert storage",
    heading: "Other inert storage",
    aliases: ["other inert storage"],
    definition:
      "Old saved information the current site no longer uses. It is not a feature the writer needs to describe to site users.",
  },
  {
    term: "Timer",
    heading: "Timer",
    aliases: ["timer", "timers"],
    definition:
      "The page for a repeating work and break timer. A large ring shows progress through the current period, its name and the time left. It requires signing in, is separate from quests and can be shared by its link.",
  },
  {
    term: "Timer schedule",
    heading: "Timer schedule",
    aliases: ["timer schedule", "schedule", "schedules"],
    definition:
      "The length of work, the length of break and when they first began. Work and break repeat from that start time. The schedule cannot be changed; starting again creates a new schedule.",
  },
  {
    term: "Timer link",
    heading: "Timer link",
    aliases: ["timer link", "timer links"],
    definition:
      "The address of one timer schedule. Sharing it lets others follow the same work and break periods. It contains no quest or account information, and gives no access to either.",
  },
  {
    term: "Global timer",
    heading: "Global timer",
    aliases: ["global timer"],
    definition:
      "The shared timer schedule for everyone who chooses the same work and break lengths through Join global timer. It is already running, so someone may join partway through a period.",
  },
  {
    term: "Others following",
    heading: "Others following",
    aliases: ["others following", "other people", "no other person"],
    definition:
      "The count of other signed-in accounts that had the same timer schedule open within the last two minutes. Each account counts once, and no names are shown. It is not a live attendance list.",
  },
];

const CAMEL_WORD = /(?<lower>[a-z])(?<upper>[A-Z])/gu;
const NON_WORD = /[^a-z0-9]+/gu;
const HEADING = /^### .+$/gmu;

function searchable(text: string): string {
  return ` ${text.replace(CAMEL_WORD, "$<lower> $<upper>").toLowerCase().replace(NON_WORD, " ").trim()} `;
}

interface TermDefinition {
  readonly term: string;
  readonly definition: string;
}

// Match full words and phrases, including plurals and screen labels. Include
// terms used to explain other selected terms so no explanation needs the docs.
function copyDefinitions(
  fields: readonly CopySheetField[],
  glossary: string,
): TermDefinition[] {
  const headings = [...glossary.matchAll(HEADING)].map(
    (match: RegExpExecArray): string => match[0].slice("### ".length),
  );
  for (const heading of headings) {
    if (
      !WRITER_TERMS.some(
        (entry: WriterTerm): boolean => entry.heading === heading,
      )
    ) {
      throw new Error(
        `Add a plain-language definition for glossary section: ${heading}`,
      );
    }
  }
  const selected = new Set<WriterTerm>();
  let content = searchable(
    fields
      .map(
        (field: CopySheetField): string =>
          `${field.identifier} ${field.description}`,
      )
      .join("\n"),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of WRITER_TERMS) {
      const availableText = content;
      if (
        !selected.has(entry) &&
        entry.aliases.some((alias: string): boolean =>
          availableText.includes(searchable(alias)),
        )
      ) {
        if (
          !(
            glossary.includes(`### ${entry.heading}\n`) ||
            glossary.includes(`## ${entry.heading}\n`)
          )
        ) {
          throw new Error(`Glossary section not found: ${entry.heading}`);
        }
        selected.add(entry);
        content += searchable(entry.definition);
        changed = true;
      }
    }
  }
  return [...selected]
    .sort((left: WriterTerm, right: WriterTerm): number =>
      left.term.localeCompare(right.term),
    )
    .map(
      (entry: WriterTerm): TermDefinition => ({
        term: entry.term,
        definition: entry.definition,
      }),
    );
}

function definitionsCsv(definitions: readonly TermDefinition[]): string {
  return csvRows([
    ["Term", "Definition"],
    ...definitions.map((entry: TermDefinition): string[] => [
      entry.term,
      entry.definition,
    ]),
  ]);
}

export { copyDefinitions, definitionsCsv, type TermDefinition };
