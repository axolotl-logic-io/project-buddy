import type { CopyField, CopySheetField } from "./copy-sheet.ts";

// Writer briefs describe intent without revealing the existing wording.
const COPY_BRIEFS = new Map<string, string>([
  [
    "ACCOUNT_COPY.nameBraces",
    "On Profile, where a person changes their name. Explain why the name cannot be saved: the name saved in Profile cannot contain the { or } symbols.",
  ],
  [
    "ACCOUNT_COPY.nameHint",
    "On Profile, where a person changes their name. Explain where the name saved in Profile appears: spell replies, shared quest messages and Members.",
  ],
  [
    "ACCOUNT_COPY.nameMultiLine",
    "On Profile, where a person changes their name. Explain why the name cannot be saved: the name saved in Profile must fit on one line.",
  ],
  [
    "ACCOUNT_COPY.nameTooLong",
    "On Profile, where a person changes their name. When a name is too long to save in Profile, state the largest allowed number of characters.",
  ],
  [
    "ACCOUNT_COPY.signOutEverywhereDescription",
    "In Settings, where a person changes their appearance or signs out. Before the person signs out on every browser and device, explain that they will also leave this browser and that previously emailed sign-in and invitation links will stop working. Invitations remain pending. A new sign-in link lets them return.",
  ],
  [
    "CHAT_COMMANDS_COPY.description.variant1",
    "Beside the message box in a quest conversation, where typed commands change Tasks. In the list shown when someone types / in the message box, describe the command for starting Tasks and saving messages sent afterward as tasks.",
  ],
  [
    "CHAT_COMMANDS_COPY.description.variant2",
    "Beside the message box in a quest conversation, where typed commands change Tasks. In the list shown when someone types / in the message box, describe the command for adding a task at the end.",
  ],
  [
    "CHAT_COMMANDS_COPY.description.variant3",
    "Beside the message box in a quest conversation, where typed commands change Tasks. In the list shown when someone types / in the message box, describe the command for completing a named task or the next task.",
  ],
  [
    "CHAT_COMMANDS_COPY.description.variant4",
    "Beside the message box in a quest conversation, where typed commands change Tasks. In the list shown when someone types / in the message box, describe the command for reopening a completed task.",
  ],
  [
    "CHAT_COMMANDS_COPY.description.variant5",
    "Beside the message box in a quest conversation, where typed commands change Tasks. In the list shown when someone types / in the message box, describe the command for changing a task's text.",
  ],
  [
    "CHAT_COMMANDS_COPY.description.variant6",
    "Beside the message box in a quest conversation, where typed commands change Tasks. In the list shown when someone types / in the message box, describe the command for moving an open task to a numbered position, starting at one.",
  ],
  [
    "CHAT_COMMANDS_COPY.description.variant8",
    "Beside the message box in a quest conversation, where typed commands change Tasks. In the list shown when someone types / in the message box, describe the command for undoing the user's last change to Tasks in this conversation.",
  ],
  [
    "CHAT_COMMANDS_COPY.failed",
    "Beside the message box in a quest conversation, where typed commands change Tasks. Report that a command failed and suggest trying again.",
  ],
  [
    "CHAT_COMMANDS_COPY.hint",
    "Beside the message box in a quest conversation, where typed commands change Tasks. Explain that commands run as soon as they are sent and a task is chosen by its number.",
  ],
  [
    "CHAT_COMMANDS_COPY.problem.variant1",
    "Beside the message box in a quest conversation, where typed commands change Tasks. When a typed command is not recognized, ask the user to type a slash to see available commands.",
  ],
  [
    "CHAT_COMMANDS_COPY.problem.variant2",
    "Beside the message box in a quest conversation, where typed commands change Tasks. When someone types an incomplete or incorrect command in the message box, ask for task text after the command name.",
  ],
  [
    "CHAT_COMMANDS_COPY.problem.variant3",
    "Beside the message box in a quest conversation, where typed commands change Tasks. When someone types an incomplete or incorrect command in the message box, state the largest allowed number of characters and that the task must fit on one line.",
  ],
  [
    "CHAT_COMMANDS_COPY.problem.variant4",
    "Beside the message box in a quest conversation, where typed commands change Tasks. When someone types an incomplete or incorrect command in the message box, explain how to supply a task number, with a done-command example.",
  ],
  [
    "CHAT_COMMANDS_COPY.problem.variant5",
    "Beside the message box in a quest conversation, where typed commands change Tasks. When someone types an incomplete or incorrect command in the message box, the numbered task does not exist; suggest listing Tasks.",
  ],
  [
    "CHAT_COMMANDS_COPY.problem.variant6",
    "Beside the message box in a quest conversation, where typed commands change Tasks. When someone types an incomplete or incorrect command in the message box, explain the move command's task number and lowest and highest positions the task can move to.",
  ],
  [
    "CHAT_COPY.cancelledReply",
    "In a quest conversation, where a person exchanges messages with its construct. Confirm that the reply was stopped. Explain that changes already started, such as changing Tasks, may still finish.",
  ],
  [
    "CHAT_COPY.keyHint",
    "In a quest conversation, where a person exchanges messages with its construct. Help beside the message box explaining the keyboard controls: Enter sends; Shift+Enter inserts a line break.",
  ],
  [
    "CHAT_COPY.replyingElsewhere",
    "In a quest conversation, where a person exchanges messages with its construct. Explain that the construct is replying in another browser or device and this conversation will update afterward.",
  ],
  [
    "CHAT_COPY.replyStopped",
    "In a quest conversation, where a person exchanges messages with its construct. Explain that the construct did not answer the last message; offer retrying or sending another.",
  ],
  [
    "CHAT_COPY.stopCompleted",
    "In a quest conversation, where a person exchanges messages with its construct. Explain that the reply finished before the stop request took effect.",
  ],
  [
    "CHAT_COPY.stopFailed",
    "In a quest conversation, where a person exchanges messages with its construct. Explain that stopping could not be confirmed; the reply may continue. Suggest retrying or reloading.",
  ],
  [
    "CHAT_COPY.stopping",
    "In a quest conversation, where a person exchanges messages with its construct. Short waiting message while the site confirms that it has stopped writing the reply.",
  ],
  [
    "CONSTRUCT_COPY.builtInIntro",
    "On the page for viewing or editing one construct in Workshop. Explain that built-in constructs cannot be edited; users can make an editable copy.",
  ],
  [
    "CONSTRUCT_COPY.ownIntro",
    "On the page for viewing or editing one construct in Workshop. Explain editing a construct's name and Visual description; existing quests keep the name and appearance saved when they started.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.lumen.approach",
    "In the information shown about a construct before someone chooses it for a quest. Describe Lumen's approach: connecting possibilities and helping choose an idea to begin.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.lumen.sample",
    "In the information shown about a construct before someone chooses it for a quest. A short sample greeting in Lumen's eager, curious voice.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.lumen.temperament",
    "In the information shown about a construct before someone chooses it for a quest. Describe Lumen as bright and enthusiastic, with patience for slower-developing ideas.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.own.approach",
    "In the information shown about a construct before someone chooses it for a quest. Describe how a construct the person has made helps explore ideas and choose a next step.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.own.sample",
    "In the information shown about a construct before someone chooses it for a quest. An inviting sample opening question for a construct the person has made.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.own.temperament",
    "In the information shown about a construct before someone chooses it for a quest. Explain that a construct the person has made uses its owner's saved name and appearance.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.vellum.approach",
    "In the information shown about a construct before someone chooses it for a quest. Describe how Vellum helps: work out what is known, what is uncertain and what to do next. Use Vellum’s calm style and mapmaking imagery.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.vellum.sample",
    "In the information shown about a construct before someone chooses it for a quest. A short sample greeting in Vellum's calm, mapmaking voice, asking about the user's goal.",
  ],
  [
    "CONSTRUCT_DISCOVERY_COPY.vellum.temperament",
    "In the information shown about a construct before someone chooses it for a quest. Describe Vellum as calm, patient, precise and warmly curious.",
  ],
  [
    "CONSTRUCTS_COPY.cloneLabel",
    "In Workshop, on the list of available constructs. Text read aloud by screen-reading software on the button that makes a separate editable copy of the named construct.",
  ],
  [
    "CONSTRUCTS_COPY.customizeLabel",
    "In Workshop, on the list of available constructs. Text read aloud by screen-reading software on the button that makes a separate editable copy of the named construct.",
  ],
  [
    "CONSTRUCTS_COPY.intro",
    "In Workshop, on the list of available constructs. Explain creating or copying a construct and changing its name and Visual description.",
  ],
  [
    "CONSTRUCTS_COPY.noOwn",
    "In Workshop, on the list of available constructs. When Workshop has no constructs the person has made, explain copying a built-in construct or creating one from scratch.",
  ],
  [
    "CREDITS_COPY.iconCredit",
    "On the Credits page, which names the people and resources used to make the site. Write one sentence crediting the source of the site’s small pictures used on buttons and links, and the rules allowing their use. The sentence must include the supplied links to the source and those rules.",
  ],
  [
    "EDITABLE_LIST_COPY.dragHint",
    "Beside a list whose entries the person can move into a different order. Explain dragging with a mouse or finger and using the keyboard arrow keys to change the order.",
  ],
  [
    "EDITABLE_LIST_COPY.failed",
    "Beside a list whose entries the person can move into a different order. Report a failure to save the new order of a list and suggest retrying.",
  ],
  [
    "GENERATION_COPY.failed",
    "In image messages kept from an older version of the site. The site no longer creates images. Report failure to generate or save an image; suggest retrying later.",
  ],
  [
    "GENERATION_COPY.outOfGold",
    "In image messages kept from an older version of the site. The site no longer creates images. State that image generation is unavailable. This is a message kept from an older version of the site; do not mention balances.",
  ],
  [
    "GENERATION_COPY.pending",
    "In image messages kept from an older version of the site. The site no longer creates images. Explain that interrupted image generation does not restart automatically; check the conversation before requesting again.",
  ],
  [
    "GENERATION_COPY.quotaUsedUp",
    "In image messages kept from an older version of the site. The site no longer creates images. State that image generation is unavailable. This is a message kept from an older version of the site; do not mention quotas.",
  ],
  [
    "GENERATION_COPY.unavailable",
    "In image messages kept from an older version of the site. The site no longer creates images. Explain that creating an image is unavailable because the person running the site has not set up the image service. This message is kept from an older version of the site.",
  ],
  [
    "GENERATION_COPY.working",
    "In image messages kept from an older version of the site. The site no longer creates images. Image-generation progress message with an approximate two-minute wait; message kept from an older version of the site.",
  ],
  [
    "EXPERIENCE_COPY.circle",
    "On Profile's Experience card and Abilities, and in the construct's reply to the exp command in a quest conversation, which show the person's experience, circle and points in each ability. Name the person's circle and the title it gives them.",
  ],
  [
    "EXPERIENCE_COPY.standing",
    "On Profile's Experience card and Abilities, and in the construct's reply to the exp command in a quest conversation, which show the person's experience, circle and points in each ability. State the person's experience and how much more they need to reach their next circle.",
  ],
  [
    "EXPERIENCE_COPY.progress",
    "In the site header on every page, as the accessible name of a small ring that fills as the person nears their next circle and links to the Experience card on Profile. Name their circle and its title, say how much more experience the next circle needs, and say the link opens their experience.",
  ],
  [
    "EXPERIENCE_COPY.points",
    "On Profile's Experience card and Abilities, and in the construct's reply to the exp command in a quest conversation, which show the person's experience, circle and points in each ability. State how many points the person has in one ability.",
  ],
  [
    "EXPERIENCE_COPY.toNext",
    "On Profile's Experience card, which shows the person's circle in a ring, their name, title and a bar filling toward the next circle. Beside their experience, state how much more experience the next circle needs.",
  ],
  [
    "EXPERIENCE_COPY.progressLabel",
    "On Profile's Experience card, which shows the person's circle in a ring, their name, title and a bar filling toward the next circle. As the accessible name of the bar, say it shows progress toward the next circle.",
  ],
  [
    "EXPERIENCE_COPY.nextTitle",
    "On Profile's Experience card, which shows the person's circle in a ring, their name, title and a bar filling toward the next circle. Name the next title the person can reach and the circle that gives it, as something to look forward to.",
  ],
  [
    "EXPERIENCE_COPY.firstSteps.adding-tasks",
    "On Profile, under Abilities, where each ability is a tile with its points and the experience they're worth. For an ability with no points yet, invite the person to add their first task.",
  ],
  [
    "EXPERIENCE_COPY.firstSteps.ideating",
    "On Profile, under Abilities, where each ability is a tile with its points and the experience they're worth. For an ability with no points yet, invite the person to add their first idea.",
  ],
  [
    "EXPERIENCE_COPY.firstSteps.noting",
    "On Profile, under Abilities, where each ability is a tile with its points and the experience they're worth. For an ability with no points yet, invite the person to save their first Quick Note.",
  ],
  [
    "EXPERIENCE_COPY.firstSteps.completing-tasks",
    "On Profile, under Abilities, where each ability is a tile with its points and the experience they're worth. For an ability with no points yet, invite the person to complete their first task.",
  ],
  [
    "EXPERIENCE_COPY.firstSteps.completing-quests",
    "On Profile, under Abilities, where each ability is a tile with its points and the experience they're worth. For an ability with no points yet, invite the person to complete their first quest.",
  ],
  [
    "EXPERIENCE_COPY.untried",
    "On Profile, under Abilities, where each ability is a tile with its points and the experience they're worth. For an ability with no points yet, say it hasn't been tried, give its first step and say how much experience that first point is worth.",
  ],
  [
    "EXPERIENCE_COPY.abilities.adding-tasks",
    "On Profile's Experience card and Abilities, and in the construct's reply to the exp command in a quest conversation, which show the person's experience, circle and points in each ability. Name the ability that gains a point for each task the person adds.",
  ],
  [
    "EXPERIENCE_COPY.abilities.ideating",
    "On Profile's Experience card and Abilities, and in the construct's reply to the exp command in a quest conversation, which show the person's experience, circle and points in each ability. Name the ability that gains a point for each idea the person adds.",
  ],
  [
    "EXPERIENCE_COPY.abilities.noting",
    "On Profile's Experience card and Abilities, and in the construct's reply to the exp command in a quest conversation, which show the person's experience, circle and points in each ability. Name the ability that gains a point for each Quick Note the person saves.",
  ],
  [
    "EXPERIENCE_COPY.abilities.completing-tasks",
    "On Profile's Experience card and Abilities, and in the construct's reply to the exp command in a quest conversation, which show the person's experience, circle and points in each ability. Name the ability that gains a point for each task the person completes.",
  ],
  [
    "EXPERIENCE_COPY.abilities.completing-quests",
    "On Profile's Experience card and Abilities, and in the construct's reply to the exp command in a quest conversation, which show the person's experience, circle and points in each ability. Name the ability that gains a point for each quest the person completes.",
  ],
  [
    "IDEAS_COPY.empty",
    "In the Ideas section of a quest, for possibilities the person may want to pursue later. When the Ideas list has nothing in it, write a message inviting the user to add a possibility to explore.",
  ],
  [
    "IDEAS_COPY.failed",
    "In the Ideas section of a quest, for possibilities the person may want to pursue later. Report failure to save an idea and suggest retrying.",
  ],
  [
    "IDEAS_COPY.intro",
    "In the Ideas section of a quest, for possibilities the person may want to pursue later. Explain that Ideas holds possibilities until the user moves them into Tasks.",
  ],
  [
    "IDEAS_COPY.invalid",
    "In the Ideas section of a quest, for possibilities the person may want to pursue later. When an idea cannot be saved, explain that it needs between one and 200 characters.",
  ],
  [
    "IDEAS_COPY.moved",
    "In the Ideas section of a quest, for possibilities the person may want to pursue later. Confirm that an idea was moved into Tasks.",
  ],
  [
    "IDEAS_COPY.notFound",
    "In the Ideas section of a quest, for possibilities the person may want to pursue later. Explain that the quest or idea is no longer available to this person.",
  ],
  [
    "IDEAS_COPY.tasksFull",
    "In the Ideas section of a quest, for possibilities the person may want to pursue later. Explain that an idea cannot move into Tasks until space is made there.",
  ],
  [
    "INVITATION_LINK_COPY.intro.variant1",
    "On the page reached from a quest invitation email, before the person joins. Introduction on the page opened from an emailed quest invitation when the inviter is unknown; explain continuing joins the named quest in this browser.",
  ],
  [
    "INVITATION_LINK_COPY.intro.variant2",
    "On the page reached from a quest invitation email, before the person joins. Introduction on the page opened from an emailed quest invitation naming the inviter and quest; explain continuing joins in this browser.",
  ],
  [
    "INVITATION_LINK_COPY.needsName",
    "On the page reached from a quest invitation email, before the person joins. Ask an invited account to provide a name to complete sign-up.",
  ],
  [
    "INVITATION_LINK_COPY.otherAccount",
    "On the page reached from a quest invitation email, before the person joins. Explain that the invitation belongs to the specified email and continuing switches this browser to that account.",
  ],
  [
    "LINK_PAGE_COPY.expired",
    "On the page reached from an emailed link to sign in or finish creating an account. Explain that an emailed access link has expired or is invalid.",
  ],
  [
    "LINK_PAGE_COPY.expiredNext",
    "On the page reached from an emailed link to sign in or finish creating an account. Explain sign-in links last 30 minutes and invitation links work once for the set up days; pending invitations remain under Quests.",
  ],
  [
    "LINK_PAGE_COPY.intro",
    "On the page reached from an emailed link to sign in or finish creating an account. Explain that continuing verifies the email and signs in or creates an account in this browser.",
  ],
  [
    "LINK_PAGE_COPY.loading",
    "On the page reached from an emailed link to sign in or finish creating an account. Short waiting message shown while checking a sign-in link.",
  ],
  [
    "LINK_PAGE_COPY.nameInvalid",
    "On the page reached from an emailed link to sign in or finish creating an account. When the name entered on the sign-in page cannot be saved, explain that it needs one to 60 characters on one line, with no braces.",
  ],
  [
    "LINK_PAGE_COPY.signupIntro",
    "On the page reached from an emailed link to sign in or finish creating an account. Ask for a name to complete creating an account.",
  ],
  [
    "LINK_PAGE_COPY.title",
    "On the page reached from an emailed link to sign in or finish creating an account. Title shown in the browser tab for continuing sign-in, including the supplied site name.",
  ],
  [
    "LOCAL_CONSTRUCT_COPY.cast",
    "In the construct’s replies to typed commands in a quest conversation. Confirm that the named spell is now on and explain that typing stop turns it off. The reply can use ** around a name to make it bold.",
  ],
  [
    "LOCAL_CONSTRUCT_COPY.castFailed",
    "In the construct’s replies to typed commands in a quest conversation. Report failure to cast a spell and suggest retrying the command.",
  ],
  [
    "LOCAL_CONSTRUCT_COPY.castUsage",
    "In the construct’s replies to typed commands in a quest conversation. Explain the cast command using Tasks, Brainstorm or an owned spell name.",
  ],
  [
    "LOCAL_CONSTRUCT_COPY.help",
    "In the construct’s replies to typed commands in a quest conversation. Write help for the commands brainstorm, tasks, stop, help, look, exp and cast. Explain what each does, that a / at the beginning is optional, and that Tasks and Brainstorm remain on until stopped. Explain where to manage Tasks, Ideas and Progress.",
  ],
  [
    "LOCAL_CONSTRUCT_COPY.look.variant1",
    "In the construct’s replies to typed commands in a quest conversation. Explain that the construct has no Visual description, followed by supplied command help.",
  ],
  [
    "LOCAL_CONSTRUCT_COPY.look.variant2",
    "In the construct’s replies to typed commands in a quest conversation. Introduce the saved Visual description, followed by supplied command help.",
  ],
  [
    "LOCAL_CONSTRUCT_COPY.unknownCommand",
    "In the construct’s replies to typed commands in a quest conversation. Acknowledge saving a message, explain command-based responses and include supplied command help.",
  ],
  [
    "LOCAL_CONSTRUCT_COPY.welcome",
    "In the construct’s replies to typed commands in a quest conversation. Welcome the user to the ready construct, invite a command and include supplied command help.",
  ],
  [
    "LOGIN_COPY.checkEmail",
    "On the page where someone enters an email to sign in or create an account. Tell the user to check their email for a sign-in or sign-up link valid for 30 minutes.",
  ],
  [
    "LOGIN_COPY.intro",
    "On the page where someone enters an email to sign in or create an account. Explain entering an email to receive a link for signing in or signing up.",
  ],
  [
    "LOGIN_COPY.needsEmail",
    "On the page where someone enters an email to sign in or create an account. When the email address is missing or looks incorrect, ask for an address and give an example of how to write it.",
  ],
  [
    "LOGIN_COPY.send",
    "On the page where someone enters an email to sign in or create an account. Button label requesting an emailed sign-in or sign-up link.",
  ],
  [
    "LOGIN_COPY.title",
    "On the page where someone enters an email to sign in or create an account. Title shown in the browser tab for the page where someone enters an email to sign in or create an account, including the site name.",
  ],
  [
    "LOGIN_EMAIL_COPY.expiry",
    "In the email containing the link to sign in or create an account, written in Vellum’s voice. Explain that the emailed link lasts 30 minutes, works on any device and requires continuing to verify and sign in or create an account.",
  ],
  [
    "LOGIN_EMAIL_COPY.intro",
    "In the email containing the link to sign in or create an account, written in Vellum’s voice. Introduce the access link for new and returning users in Vellum's welcoming voice.",
  ],
  [
    "LOGIN_EMAIL_COPY.notRequested",
    "In the email containing the link to sign in or create an account, written in Vellum’s voice. Reassure someone who did not request the email that ignoring it changes nothing.",
  ],
  [
    "LOGIN_EMAIL_COPY.subject",
    "In the email containing the link to sign in or create an account, written in Vellum’s voice. Email subject identifying the site's sign-in or sign-up link.",
  ],
  [
    "MILESTONE_COPY.recorded",
    "In the conversation after the construct records something the person has finished. Confirm that a milestone was added to the progress timeline.",
  ],
  [
    "MILESTONE_COPY.timelineLink",
    "In the conversation after the construct records something the person has finished. Link label taking the user to the progress timeline.",
  ],
  [
    "OPENING_COPY.claudeUnavailable",
    "When the site cannot prepare the first reply for a quest conversation. Explain that the reply is unavailable and suggest trying again later.",
  ],
  [
    "PENDING_COPY.accepted",
    "On the Quests page, in the Pending tab showing invitations the person has not accepted. Confirm joining the named quest and identify the status tab where it now appears.",
  ],
  [
    "PENDING_COPY.acceptLabel",
    "On the Quests page, in the Pending tab showing invitations the person has not accepted. Text read aloud by screen-reading software on the button accepting the invitation to a named quest.",
  ],
  [
    "PENDING_COPY.declined",
    "On the Quests page, in the Pending tab showing invitations the person has not accepted. Confirm declining the invitation to a named quest.",
  ],
  [
    "PENDING_COPY.declineLabel",
    "On the Quests page, in the Pending tab showing invitations the person has not accepted. Text read aloud by screen-reading software on the button declining the invitation to a named quest.",
  ],
  [
    "PENDING_COPY.failed",
    "On the Quests page, in the Pending tab showing invitations the person has not accepted. Explain that an invitation is unavailable because it may have been withdrawn or answered elsewhere.",
  ],
  [
    "PENDING_COPY.invitedBy",
    "On the Quests page, in the Pending tab showing invitations the person has not accepted. Beside a pending quest invitation, show the inviter's name with a relative time.",
  ],
  [
    "PROBLEMS_COPY.pageNotFound",
    "On a page explaining that something went wrong or could not be found. Explain that a page is missing and its link may be wrong or the page deleted.",
  ],
  [
    "PROBLEMS_COPY.unknownError",
    "On a page explaining that something went wrong or could not be found. Under the page heading saying something went wrong, suggest trying again later.",
  ],
  [
    "PROGRESS_TIMELINE_COPY.deleteDescription",
    "In the Progress section of a quest, where finished work is recorded as milestones. Confirm deleting the supplied milestone text from the timeline while keeping the conversation.",
  ],
  [
    "PROGRESS_TIMELINE_COPY.deleteLabel",
    "In the Progress section of a quest, where finished work is recorded as milestones. Text read aloud by screen-reading software on the delete button identifying a milestone by its text.",
  ],
  [
    "PROGRESS_TIMELINE_COPY.editLabel",
    "In the Progress section of a quest, where finished work is recorded as milestones. Text read aloud by screen-reading software on the edit button identifying a milestone by its text.",
  ],
  [
    "PROGRESS_TIMELINE_COPY.needsText",
    "In the Progress section of a quest, where finished work is recorded as milestones. When someone tries to save a blank milestone in Progress, ask them to write what they did.",
  ],
  [
    "PROGRESS_TIMELINE_COPY.none",
    "In the Progress section of a quest, where finished work is recorded as milestones. When the Progress list has nothing in it, explain that completed work can be recorded by the construct.",
  ],
  [
    "PROGRESS_TIMELINE_COPY.tooLong",
    "In the Progress section of a quest, where finished work is recorded as milestones. When a milestone cannot be saved in Progress, explain that it needs a line without a line break within the supplied character limit.",
  ],
  [
    "PROMPT_COPY.limit",
    "Beside a box for changing a construct’s name and appearance or writing a spell’s replies. Short help beside an editing box, stating the largest allowed number of characters.",
  ],
  [
    "PROMPT_COPY.namePlaceholderHint",
    "Beside a box for changing a construct’s name and appearance or writing a spell’s replies. Explain that the marker for the person’s name is replaced by the name in Profile, or a general reference to the person when no name is saved. Show the marker exactly as supplied.",
  ],
  [
    "PROMPT_COPY.needsName",
    "Beside a box for changing a construct’s name and appearance or writing a spell’s replies. When an edited construct or spell cannot be saved without a name, ask for a name for the supplied kind of item.",
  ],
  [
    "PROMPT_COPY.restored",
    "Beside a box for changing a construct’s name and appearance or writing a spell’s replies. Explain that earlier unsaved edits were restored and must be saved to be kept.",
  ],
  [
    "QUEST_CONVERSATION_COPY.confirmReset",
    "On a quest’s conversation page, beside the controls for starting or resetting it. Confirm permanent conversation reset: clear messages and the spell currently turned on.",
  ],
  [
    "QUEST_CONVERSATION_COPY.keepTasks",
    "On a quest’s conversation page, beside the controls for starting or resetting it. Explain that conversation reset keeps existing tasks but unchecks them by default.",
  ],
  [
    "QUEST_CONVERSATION_COPY.notStarted",
    "On a quest’s conversation page, beside the controls for starting or resetting it. Explain that the quest conversation has not begun and invite the user to start it.",
  ],
  [
    "QUEST_INVITATION_EMAIL_COPY.expiry",
    "In an email inviting someone to join a quest, written in Vellum’s voice. Explain that the invitation link works once for the supplied number of days, on any device, and signs in and joins only this quest.",
  ],
  [
    "QUEST_INVITATION_EMAIL_COPY.intro",
    "In an email inviting someone to join a quest, written in Vellum’s voice. Invitation email naming the inviter, quest and site; explain the shared conversation, Tasks, Ideas, Progress and Quick Notes and introduce the join link.",
  ],
  [
    "QUEST_INVITATION_EMAIL_COPY.notExpected",
    "In an email inviting someone to join a quest, written in Vellum’s voice. For a newly invited account, explain ignoring the email leaves the reserved account unused and does not join the quest.",
  ],
  [
    "QUEST_INVITATION_EMAIL_COPY.notExpectedMember",
    "In an email inviting someone to join a quest, written in Vellum’s voice. For an existing account, explain ignoring the email leaves them outside the quest.",
  ],
  [
    "QUEST_INVITATION_EMAIL_COPY.pending",
    "In an email inviting someone to join a quest, written in Vellum’s voice. Explain that the invitation remains in the Quests Pending tab until accepted.",
  ],
  [
    "QUEST_INVITATION_EMAIL_COPY.subject",
    "In an email inviting someone to join a quest, written in Vellum’s voice. Invitation email subject identifying the quest and site.",
  ],
  [
    "QUEST_MEMBERS_COPY.dailies",
    "In a quest’s Members section, where people invite others, remove them or leave. Explain that Dailies is personal and cannot have members.",
  ],
  [
    "QUEST_MEMBERS_COPY.emailHint",
    "In a quest’s Members section, where people invite others, remove them or leave. Explain that invitations arrive by email and inviting a new address creates an invited account.",
  ],
  [
    "QUEST_MEMBERS_COPY.failed",
    "In a quest’s Members section, where people invite others, remove them or leave. Report that a membership change failed and suggest refreshing and retrying.",
  ],
  [
    "QUEST_MEMBERS_COPY.inQuest",
    "In a quest’s Members section, where people invite others, remove them or leave. Explain that the supplied email already belongs to someone in this quest.",
  ],
  [
    "QUEST_MEMBERS_COPY.intro",
    "In a quest’s Members section, where people invite others, remove them or leave. Explain shared quest access and equal member powers, except removing the owner.",
  ],
  [
    "QUEST_MEMBERS_COPY.invited",
    "In a quest’s Members section, where people invite others, remove them or leave. Short text beside a person who has been invited but has not yet joined, so they are not mistaken for someone who already belongs to the quest.",
  ],
  [
    "QUEST_MEMBERS_COPY.invitedNotice",
    "In a quest’s Members section, where people invite others, remove them or leave. Confirm emailing an invitation and explain that the quest appears in the recipient's Pending tab until accepted.",
  ],
  [
    "QUEST_MEMBERS_COPY.leaveConfirm",
    "In a quest’s Members section, where people invite others, remove them or leave. Confirm leaving a quest: access ends, contributions stay and another member can invite the user again.",
  ],
  [
    "QUEST_MEMBERS_COPY.left",
    "In a quest’s Members section, where people invite others, remove them or leave. Confirm leaving the named quest.",
  ],
  [
    "QUEST_MEMBERS_COPY.limited",
    "In a quest’s Members section, where people invite others, remove them or leave. Explain that the hourly invitation limit was reached and suggest retrying later.",
  ],
  [
    "QUEST_MEMBERS_COPY.listLabel",
    "In a quest’s Members section, where people invite others, remove them or leave. Text read aloud by screen-reading software to identify the list of people associated with this quest.",
  ],
  [
    "QUEST_MEMBERS_COPY.needsEmail",
    "In a quest’s Members section, where people invite others, remove them or leave. When the email address is missing or looks incorrect, ask for an address and give an example of how to write it.",
  ],
  [
    "QUEST_MEMBERS_COPY.notFound",
    "In a quest’s Members section, where people invite others, remove them or leave. Explain that the quest is no longer available to the person trying to open it.",
  ],
  [
    "QUEST_MEMBERS_COPY.removeConfirm",
    "In a quest’s Members section, where people invite others, remove them or leave. Confirm removing the named member: access ends, contributions remain and members can invite them again.",
  ],
  [
    "QUEST_MEMBERS_COPY.removed",
    "In a quest’s Members section, where people invite others, remove them or leave. Confirm removing the named person from this quest.",
  ],
  [
    "QUEST_MEMBERS_COPY.removeLabel",
    "In a quest’s Members section, where people invite others, remove them or leave. Text read aloud by screen-reading software on the button for removing the named person from this quest.",
  ],
  [
    "QUEST_MEMBERS_COPY.unsent",
    "In a quest’s Members section, where people invite others, remove them or leave. Explain that an invitation was saved but its email failed; invite the same address again to resend.",
  ],
  [
    "QUEST_MEMBERS_COPY.withdrawn",
    "In a quest’s Members section, where people invite others, remove them or leave. Confirm withdrawing the named person's invitation.",
  ],
  [
    "QUEST_NOTES_COPY.deleteLabel",
    "In a quest’s Quick Notes section, where saved Quick Notes are read and deleted. Text read aloud by screen-reading software on the button for deleting a Quick Note identified by its text.",
  ],
  [
    "QUEST_NOTES_COPY.failed",
    "In a quest’s Quick Notes section, where saved Quick Notes are read and deleted. Report failure to delete a Quick Note and suggest retrying.",
  ],
  [
    "QUEST_NOTES_COPY.none",
    "In a quest’s Quick Notes section, where saved Quick Notes are read and deleted. When the quest has no Quick Notes, explain the site panel item used to add one.",
  ],
  [
    "QUEST_SHARING_COPY.option.variant3",
    "In a list where someone chooses between their own quests and quests they have joined. Text in the list where someone chooses a quest identifying a quest joined from another owner, using quest and owner names.",
  ],
  [
    "QUEST_START_COPY.back",
    "In the form used to start a quest by choosing a starting point and entering its details. Text on the button that takes the person back to the choice of quest starting points.",
  ],
  [
    "QUEST_START_COPY.invalid",
    "In the form used to start a quest by choosing a starting point and entering its details. When a quest cannot be started, ask the user to check quest details and select an available construct.",
  ],
  [
    "QUEST_STATUS_COPY.approvalHeading",
    "Beside controls for marking a quest Active, Completed or Abandoned, or approving such a change. Heading asking for approval of a proposed quest status change.",
  ],
  [
    "QUEST_STATUS_COPY.decisions.declined",
    "Beside controls for marking a quest Active, Completed or Abandoned, or approving such a change. Confirm declining a status-change request and keeping the quest's current status.",
  ],
  [
    "QUEST_STATUS_COPY.decisions.outdated",
    "Beside controls for marking a quest Active, Completed or Abandoned, or approving such a change. Explain that a status-change request is too old to use and ask for a fresh request from the construct.",
  ],
  [
    "QUEST_STATUS_COPY.effects",
    "Beside controls for marking a quest Active, Completed or Abandoned, or approving such a change. Explain that changing quest status keeps its conversation, Tasks and Progress and allows making it Active again later.",
  ],
  [
    "QUEST_STATUS_COPY.empty",
    "Beside controls for marking a quest Active, Completed or Abandoned, or approving such a change. On the Quests page, explain that there are no quests under the selected Active, Completed or Abandoned tab.",
  ],
  [
    "QUEST_STATUS_COPY.failed",
    "Beside controls for marking a quest Active, Completed or Abandoned, or approving such a change. Explain that a status-change request is unavailable or the quest changed; suggest refreshing and retrying.",
  ],
  [
    "QUEST_STATUS_COPY.noQuest",
    "Beside controls for marking a quest Active, Completed or Abandoned, or approving such a change. Explain that the command requires an open quest.",
  ],
  [
    "QUEST_STATUS_COPY.unavailable",
    "Beside controls for marking a quest Active, Completed or Abandoned, or approving such a change. Explain that a status-change request is not available to this person, removed or belongs to a quest the user has left.",
  ],
  [
    "QUESTS_COPY.motivationHint",
    "On the Quests page or in the form for naming a quest and saying why it matters. Explain that quest motivation is optional and helps the construct understand why the goal matters.",
  ],
  [
    "QUESTS_COPY.motivationLabel",
    "On the Quests page or in the form for naming a quest and saying why it matters. Form question asking why the user wants to complete this quest.",
  ],
  [
    "QUESTS_COPY.nameTooLong",
    "On the Quests page or in the form for naming a quest and saying why it matters. When a quest name is too long, state the largest allowed number of characters.",
  ],
  [
    "QUESTS_COPY.needsName",
    "On the Quests page or in the form for naming a quest and saying why it matters. When someone tries to save a quest without a name, ask them to enter one.",
  ],
  [
    "QUESTS_COPY.none",
    "On the Quests page or in the form for naming a quest and saying why it matters. When the Quests page has no quests, direct the user to the starting-point options above.",
  ],
  [
    "QUICK_NOTE_COPY.failed",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. Report failure to save a Quick Note and suggest retrying.",
  ],
  [
    "QUICK_NOTE_COPY.intro",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. Explain saving a short note to a quest without opening it and finding it later in that quest's Quick Notes tab.",
  ],
  [
    "QUICK_NOTE_COPY.invalid",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. When someone tries to save a Quick Note without choosing a quest or writing text, explain that both are needed.",
  ],
  [
    "QUICK_NOTE_COPY.noQuests",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. Explain that Quick Notes require an Active quest; suggest starting or restoring one from Quests.",
  ],
  [
    "QUICK_NOTE_COPY.notFound",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. Explain that the selected quest is no longer Active, the note was not saved and another quest must be chosen.",
  ],
  [
    "QUICK_NOTE_COPY.problem.variant1",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. When someone tries to save a blank Quick Note, ask them to write something first.",
  ],
  [
    "QUICK_NOTE_COPY.problem.variant2",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. When a Quick Note is too long, state the character limit and ask the user to shorten it.",
  ],
  [
    "QUICK_NOTE_COPY.saved",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. Confirm saving a Quick Note to the named quest.",
  ],
  [
    "QUICK_NOTE_COPY.saving",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. Short waiting message shown while a Quick Note is being saved.",
  ],
  [
    "QUICK_NOTE_COPY.textHint",
    "In the Quick Note window opened from the site panel, for saving text to an Active quest without opening it. Quick Note help stating the largest allowed number of characters.",
  ],
  [
    "RETIREMENT_COPY.deleted",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Confirm permanent deletion while explaining that existing conversations keep their saved settings.",
  ],
  [
    "RETIREMENT_COPY.deleteDescription",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Confirm permanent deletion of the retired construct or spell and its settings; existing conversations remain unchanged.",
  ],
  [
    "RETIREMENT_COPY.empty",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. When Graveyard has no retired constructs or spells, explain that retired items will appear here.",
  ],
  [
    "RETIREMENT_COPY.fallback",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Explain that existing quests keep the construct saved when they started. For a new quest, the chosen starting point determines which construct it uses.",
  ],
  [
    "RETIREMENT_COPY.fields.invalidReply",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Label beside saved text that can be read but not changed here for a spell's reply to an invalid message.",
  ],
  [
    "RETIREMENT_COPY.fields.savedReply",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Label beside saved text that can be read but not changed here for a spell's reply when a message is saved.",
  ],
  [
    "RETIREMENT_COPY.help",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Explain that retired constructs and spells cannot be chosen for new quests or new spell casts. Conversations already started keep their saved settings.",
  ],
  [
    "RETIREMENT_COPY.intro",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Introduce the Graveyard as storage for retired constructs and spells until restored or permanently deleted.",
  ],
  [
    "RETIREMENT_COPY.noMatches",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. When a search in Graveyard finds nothing, suggest a different retired-item name.",
  ],
  [
    "RETIREMENT_COPY.restored",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Confirm restoring an item and making it available again.",
  ],
  [
    "RETIREMENT_COPY.retired",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Confirm that the construct or spell has been put aside. Explain that Graveyard lets the person bring it back, and conversations already started keep their saved settings.",
  ],
  [
    "RETIREMENT_COPY.sort",
    "In Graveyard, where a person can restore or permanently delete their retired constructs and spells. Label explaining that retired items are ordered newest retirement first.",
  ],
  [
    "SIGNUP_COPY.intro",
    "On the page for creating an account using an emailed link. Explain creating an account through an emailed link and ask for an email address.",
  ],
  [
    "SIGNUP_COPY.signInPrompt",
    "On the page for creating an account using an emailed link. Prompt existing account holders to use the adjacent sign-in link.",
  ],
  [
    "SIGNUP_COPY.title",
    "On the page for creating an account using an emailed link. Title shown in the browser tab for sign-up, including the supplied site name.",
  ],
  [
    "SITE_COPY.tagline",
    "In the site’s introduction to Project Buddy. Short product tagline describing working on personal quests and ideas with constructs.",
  ],
  [
    "SPELL_MODE_COPY.ambiguous",
    "Beside the controls or replies for turning a spell on or off in a conversation. Explain that multiple spells have the requested name and must be renamed in Workshop before casting.",
  ],
  [
    "SPELL_MODE_COPY.castUsage",
    "Beside the controls or replies for turning a spell on or off in a conversation. Explain the how to type a cast command with Tasks and Brainstorm as examples.",
  ],
  [
    "SPELLBOOK_COPY.builtIn",
    "In Workshop’s Spells tab, where a person creates or edits spells and their replies. Explain that built-in spells cannot be edited and must be copied before someone can change them.",
  ],
  [
    "SPELLBOOK_COPY.command",
    "In Workshop’s Spells tab, where a person creates or edits spells and their replies. Instruction showing how to cast the named spell using a command.",
  ],
  [
    "SPELLBOOK_COPY.destinationHelp",
    "In Workshop’s Spells tab, where a person creates or edits spells and their replies. Explain that messages sent while this spell is on will be saved to the selected place: Tasks or Ideas.",
  ],
  [
    "SPELLBOOK_COPY.intro",
    "In Workshop’s Spells tab, where a person creates or edits spells and their replies. Explain that people can create a spell or copy an existing one, then change its replies and whether it saves messages to Tasks or Ideas. Explain that Stop beside the message box turns the spell off.",
  ],
  [
    "SPELLBOOK_COPY.responseRequired",
    "In Workshop’s Spells tab, where a person creates or edits spells and their replies. When a spell has no replies, ask the person to write at least one reply before saving it.",
  ],
  [
    "SPELLBOOK_COPY.responses.invalidReply",
    "In Workshop’s Spells tab, where a person creates or edits spells and their replies. Label beside the box where someone writes text for the spell's reply when a message is invalid.",
  ],
  [
    "SPELLBOOK_COPY.responses.savedReply",
    "In Workshop’s Spells tab, where a person creates or edits spells and their replies. Label beside the box where someone writes text for the spell's reply when a message is saved.",
  ],
  [
    "SPELLBOOK_COPY.responsesHelp",
    "In Workshop’s Spells tab, where a person creates or edits spells and their replies. Explain that a spell can have several written replies and the site picks one at random each time. Explain the four markers for the spell’s name, where messages are saved (Tasks or Ideas), the message sent and the person’s name.",
  ],
  [
    "TASKS_CHANGE_COPY.notChanged",
    "In a conversation note showing a change to Tasks and a button to undo it. Explain that an attempted operation made no change to Tasks.",
  ],
  [
    "TASKS_CHANGE_COPY.sideMenu",
    "In a conversation note showing a change to Tasks and a button to undo it. Direct the user to the Tasks controls in the quest side menu.",
  ],
  [
    "TASKS_CHANGE_COPY.undid",
    "In a conversation note showing a change to Tasks and a button to undo it. Confirm undoing a change to Tasks.",
  ],
  [
    "TASKS_CHANGE_COPY.undoLabel",
    "In a conversation note showing a change to Tasks and a button to undo it. Text read aloud by screen-reading software on the button undoing the particular change to Tasks shown in a card.",
  ],
  [
    "TASKS_COPY.failed.already-undone",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. Explain that this change to Tasks has already been undone.",
  ],
  [
    "TASKS_COPY.failed.awaiting-reply",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. Explain that Tasks editing is blocked while a message awaits a reply; offer waiting or editing from the quest page.",
  ],
  [
    "TASKS_COPY.failed.missing-task",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. Explain that a task is no longer in Tasks and the latest list is now displayed.",
  ],
  [
    "TASKS_COPY.failed.no-such-change",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. Explain that the requested change cannot be found for undo.",
  ],
  [
    "TASKS_COPY.failed.not-found",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. Explain that the quest is no longer available to this person.",
  ],
  [
    "TASKS_COPY.failed.not-saved",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. Report that Tasks could not be saved and suggest retrying.",
  ],
  [
    "TASKS_COPY.failed.nothing-to-undo",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. Explain that changes made afterward have already replaced or removed everything this change did, so there is nothing left for Undo to reverse.",
  ],
  [
    "TASKS_COPY.needsText",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. When someone tries to save a blank Tasks task, ask them to write what needs doing.",
  ],
  [
    "TASKS_COPY.tooLong",
    "In the Tasks section of a quest, where the person adds, changes and checks off tasks. When a Tasks task cannot be saved, explain that it needs a line without a line break within the supplied character limit.",
  ],
  [
    "TASKS_PANEL_COPY.busy",
    "In the Tasks list beside a quest conversation. Explain that Tasks editing is unavailable until the named construct finishes replying.",
  ],
  [
    "TASKS_PANEL_COPY.notFound",
    "In the Tasks list beside a quest conversation. Explain that Tasks cannot be edited here because the quest is missing or not available to this person.",
  ],
  [
    "TASKS_PANEL_COPY.unanswered",
    "In the Tasks list beside a quest conversation. Explain that the last message has no reply; retry or send a message before editing here, or edit from the quest page now.",
  ],
  [
    "TEXT_LIST_COPY.invalid",
    "Beside the list of replies a person writes for a spell in Workshop. When a reply written for a spell cannot be saved, explain that it needs at least one character and no more than the supplied maximum.",
  ],
  [
    "TOOL_FAILURES_COPY.castSpell",
    "In a quest conversation after the construct fails to make a requested change. Report that the construct could not cast a spell.",
  ],
  [
    "TOOL_FAILURES_COPY.changeTasks",
    "In a quest conversation after the construct fails to make a requested change. Report that the construct could not change the quest's Tasks.",
  ],
  [
    "TOOL_FAILURES_COPY.questStatus",
    "In a quest conversation after the construct fails to make a requested change. Report that the construct could not request a quest status change.",
  ],
  [
    "TOOL_FAILURES_COPY.recordMilestone",
    "In a quest conversation after the construct fails to make a requested change. Report that the construct could not add a milestone to the progress timeline.",
  ],
  [
    "VISUAL_COPY.descriptionHelp",
    "In Workshop, beside the box describing a construct’s appearance. Ask the person to describe what the construct looks like. Explain that the look command displays this saved description, saving it does not replace existing pictures, the limit is 4,000 characters, and markers such as {{name}} stay as written here.",
  ],
  [
    "VISUAL_COPY.requiredDescription",
    "In Workshop, beside the box describing a construct’s appearance. When a construct cannot be saved without a description of its appearance, ask for one.",
  ],
  [
    "PROFILE_COPY.loading",
    "On the Profile page, while it loads. Say the person's name and experience are loading.",
  ],
  [
    "WORKSPACES_COPY.settingsIntro",
    "On the Settings page. Introduce Settings as the place for appearance and security preferences.",
  ],
  [
    "TIMER_COPY.runningTitle",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Title shown in the browser tab while a timer is running, including the site name.",
  ],
  [
    "TIMER_COPY.intro",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Explain that work and break periods repeat and that sharing the link lets other people follow the same schedule.",
  ],
  [
    "TIMER_COPY.minutes.variant1",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. A choice in the work or break length list showing the number of minutes and that this is one hour.",
  ],
  [
    "TIMER_COPY.minutes.variant2",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. A choice in the work or break length list showing the number of minutes and the matching whole number of hours.",
  ],
  [
    "TIMER_COPY.startHint",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Help beside Start explaining that it begins a new schedule now, starting with work.",
  ],
  [
    "TIMER_COPY.joinGlobalHint",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Help beside Join global timer explaining that everyone choosing these lengths follows the same already-running schedule, so they may join partway through work or a break.",
  ],
  [
    "TIMER_COPY.scheduleName",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Name the timer schedule using the number of minutes of work and of break.",
  ],
  [
    "TIMER_COPY.others",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. State how many other people had this exact timer schedule open within the supplied number of minutes. It is a recent count, not a promise that they are watching now.",
  ],
  [
    "TIMER_COPY.noOthers",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Explain that no other person had this timer schedule open within the supplied number of minutes.",
  ],
  [
    "TIMER_COPY.othersLoading",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Short waiting message while the site checks how many other people recently opened this timer schedule.",
  ],
  [
    "TIMER_COPY.othersUnavailable",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Explain that the count of other people cannot be shown right now, but the timer continues.",
  ],
  [
    "TIMER_COPY.shareHint",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Explain that sharing this page’s link shares only the timer schedule and gives no access to the person’s quests or account.",
  ],
  [
    "TIMER_COPY.copyFailed",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Explain that copying the timer link failed and suggest copying it from the browser’s address bar instead.",
  ],
  [
    "TIMER_COPY.invalidHeading",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Heading on the error page explaining that this address cannot be opened as a timer.",
  ],
  [
    "TIMER_COPY.invalid",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Explain that the timer link is not valid. A valid link specifies allowed lengths for work and break and a start time that has already passed.",
  ],
  [
    "TIMER_COPY.invalidAction",
    "On the Timer page, which repeats a work period followed by a break and is separate from any quest. Button label taking the person from an invalid timer link to the form for choosing timer lengths.",
  ],
]);

const MARKER_HELP = new Map<string, string>([
  [
    "firstStep",
    "the first thing to do in the ability, such as adding a first task",
  ],
  ["worth", "the experience the ability's first point is worth"],
  ["HELP", "the command help text"],
  ["help", "the help text supplied for this box"],
  [
    "INVITATIONS_PER_HOUR",
    "the largest number of invitations allowed per hour",
  ],
  [
    "INVITATION_LINK_LIFETIME_DAYS",
    "the number of days an invitation link works",
  ],
  [
    "NOTE_MAX_LENGTH",
    "the largest number of characters allowed in a Quick Note",
  ],
  ["SITE_COPY.name", "the site name"],
  ["SITE_NAME", "the site name"],
  [
    "TASK_TEXT_MAX_LENGTH",
    "the largest number of characters allowed in a task",
  ],
  ["bucket", "Tasks or Ideas, where messages are saved"],
  ["constructName", "the construct’s name"],
  ["description", "the construct’s saved appearance description"],
  ["email", "the invited person’s email address"],
  ["found.most", "the highest position a task can move to"],
  ["found.name", "the command name"],
  ["found.task", "the task number"],
  ["invitedBy", "the name of the person who sent the invitation"],
  ["kind", "whether this is a construct or a spell"],
  ["libraryLink", "a link to the source of the small pictures used on buttons"],
  ["licenseLink", "a link to the rules allowing those pictures to be used"],
  ["max", "the largest allowed number of characters"],
  [
    'max.toLocaleString("en-US")',
    "the largest allowed number of characters, written with commas between thousands",
  ],
  ["maxLength", "the largest allowed number of characters"],
  ["message", "the message the person sent"],
  [
    "name",
    "the name of the person, construct or spell this description refers to",
  ],
  ["quest", "the quest name, possibly including its owner’s name"],
  ["questName", "the quest’s name"],
  ["circle", "the person's circle number"],
  ["title", "the title of the person's circle, such as Apprentice"],
  ["experience", "the person's total experience"],
  ["needed", "how much more experience the person needs for their next circle"],
  ["next", "the number of the person's next circle"],
  [
    "points",
    "the number of points, with the appropriate singular or plural wording",
  ],
  ["sharing.owner", "the name of the person who owns the quest"],
  ["spell", "the spell’s name"],
  [
    "status",
    "Active, Completed or Abandoned, where the quest can now be found",
  ],
  ["text", "the saved text of the milestone or Quick Note"],
  ["time", "when the invitation was sent"],
  ["minutes", "the number of minutes of work or break"],
  ["hours", "the same duration expressed in hours"],
  ["workMinutes", "the number of minutes of work"],
  ["breakMinutes", "the number of minutes of break"],
  [
    "othersCount(others)",
    "the number of other people, with the appropriate singular or plural wording",
  ],
  [
    "TIMER_PRESENCE_EXPIRY_MINUTES",
    "how many minutes back the count of other people looks",
  ],
]);

// Only included fields need briefs. Fail rather than silently give the writer
// an identifier with no explanation when new copy passes the length filter.
function withCopyBrief(field: CopyField): CopySheetField {
  const brief = COPY_BRIEFS.get(field.identifier);
  if (brief === undefined || brief === "") {
    throw new Error(
      `Add a writer brief for ${field.identifier} in scripts/copy-briefs.ts`,
    );
  }
  let description = brief;
  if (field.placeholders.length > 0) {
    description += ` Template: text with markers for changing information. Keep these markers exactly as shown: ${field.placeholders
      .map((marker: string): string => {
        const help = MARKER_HELP.get(marker.slice(2, -2));
        if (help === undefined) {
          throw new Error(
            `Explain the template marker ${marker} in scripts/copy-briefs.ts`,
          );
        }
        return `${marker} (${help})`;
      })
      .join("; ")}.`;
  }
  return { ...field, description };
}

export { withCopyBrief };
