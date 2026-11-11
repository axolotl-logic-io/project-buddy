import type { PromptKind } from "@/prompts/prompt.ts";
import { workshopPath } from "@/routes.ts";
import { pageTitle } from "@/ui/copy/site.ts";

interface LibraryChapter {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly links: readonly { readonly href: string; readonly label: string }[];
}
interface LibraryBook {
  readonly id: string;
  readonly title: string;
  readonly intro: string;
  readonly chapters: readonly LibraryChapter[];
  readonly action: { readonly href: string; readonly label: string };
}
function workshopLink(
  kind: PromptKind,
  label: string,
): { readonly href: string; readonly label: string } {
  return { href: `/workshop?kind=${kind}`, label };
}

const LIBRARY_COPY: {
  readonly title: string;
  readonly heading: string;
  readonly intro: string;
  readonly contents: string;
  readonly related: string;
  readonly books: readonly LibraryBook[];
} = {
  title: pageTitle("Library"),
  heading: "Library",
  intro:
    "Learn your way around Project Buddy, then create the help you need. Start with Getting Started or choose a book.",
  contents: "Chapters",
  related: "Related books",
  books: [
    {
      id: "getting-started",
      title: "Getting Started",
      intro:
        "Project Buddy helps you think, learn and make things with AI characters called constructs. Start with one small thing you want to do.",
      chapters: [
        {
          id: "first-adventure",
          title: "Start talking or start a quest",
          links: [
            { href: "/chat", label: "Open Chat" },
            { href: "/projects", label: "Open Quests" },
          ],
          paragraphs: [
            "Chat is your private conversation with a construct, for talking without a goal. A quest is something you want to learn, make or do. Each quest has one continuing conversation, with its Journal, plan and progress beside it.",
            "To explore an idea, open Chat and tell the construct what you are thinking about and one limit, for example: “Help me plan a balcony herb garden. I have one sunny shelf and twenty minutes today.” When the idea becomes a goal, choose Start a quest from this. You edit the new quest’s name and Journal before anything is made, and your Chat stays private.",
            "Each part has its own job. The construct brings a voice and habits, the activity brings an approach, and spells add focused instructions when they fit.",
            "To work toward a goal over time, open Quests and, under Start a quest, choose Learn a thing, Make a thing or Do a thing. Each fills in a name, a starting Journal and an approach; change any of them and the construct before you start, and start each again for another goal. Dailies is your one ongoing quest for starting the day: open it and choose Start the day whenever you begin. A quest keeps its construct; ask it to change activity when you want a different kind of help.",
            "The construct’s first message is its opening. Reply with what you need now, and ask for a smaller step or a clearer explanation if an answer is too broad. AI answers can be wrong, so check advice that matters.",
          ],
        },
        {
          id: "continue",
          title: "Continue and find your work",
          links: [{ href: "/projects", label: "Find your quests" }],
          paragraphs: [
            "The header shows where you are. Its links lead back through the pages that contain this one, up to Home.",
            "Chat is always one conversation, so open Chat to carry on where you left off. A quest’s conversation opens with the quest.",
            "To find a quest, open Quests, or follow Continue on Home. Its tabs show Active, Completed and Abandoned quests. A quest opens on its conversation, with its Journal, plan, progress, Quick Notes, Journal versions and members one tap away. If you own the quest, rename it with the pencil, or choose Complete, Abandon or Restore quest to change its status.",
            "The Journal holds what a quest needs to remember: its goals, preferences, limits and agreed plans. The construct is asked to save useful information there, and you can read and edit it yourself. If a reply misunderstands your goal, check the Journal first.",
            "To note something without a conversation, save a Quick Note. Quick Notes become part of the Journal, so the quest’s replies can use them. Replies read the Journal and the newest part of the conversation, so keep lasting information in the Journal.",
            "For example, save “The shelf gets sun only in the morning” as a Quick Note. Later in the quest’s conversation, ask which plants would suit it. Chat has no Journal.",
            "A quest’s plan holds its remaining steps, in order, and its first open step is the quest’s next step. Your construct keeps it with you in the quest’s conversation. You can change it yourself in the quest’s Plan section, in the Plan panel beside the conversation, or with commands in the message box: type / to see them. Commands such as /done, /add and /move run at once and spend no batteries.",
          ],
        },
        {
          id: "craft",
          title: "Create your own",
          links: [
            { href: "/workshop", label: "Create in Workshop" },
            {
              href: "/library/model-context#inventory",
              label: "Explore model inputs",
            },
          ],
          paragraphs: [
            "Workshop shows built-in constructs, activities and spells alongside your private copies, one kind at a time. Choose Create to make your own, or Make a copy on a built-in one to start from a copy. Retirement keeps retired definitions available to restore or delete.",
            "Workshop is where you edit. Edit one section of the instructions at a time, then choose Save. Unsaved edits stay in this browser until you choose Save or Cancel. Saving prompt text makes no model call and spends no batteries. To see how a change works, save it and use it in a quest or in Chat.",
            "The Constructs, Spells and Activities books have worked examples. The Model context book explains exactly what a reply sends to the model.",
            "Batteries pay for model use: replies, generated openings and images. Each uses the balance of the person who asked. A prepared opening needs no model call. Canceling a request may not return batteries for work already done.",
            "Under each reply, the conversation shows what it cost you, to one decimal place. That cost includes any retries and images the reply needed. Your balance shows whole batteries.",
            "Account shows your name under Profile, your balance and whether you can buy more batteries under Batteries, and the sign-out controls under Security. Settings holds General and Appearance.",
          ],
        },
      ],
      action: {
        href: "/projects",
        label: "Start a quest",
      },
    },
    {
      id: "constructs",
      title: "Constructs",
      intro:
        "A construct is the character you work with: its voice, habits and way of explaining. Choose one when you start a quest; an activity guides what you do.",
      chapters: [
        {
          id: "character",
          title: "Character Sheet and appearance",
          links: [],
          paragraphs: [
            "A construct has a name, instructions and an appearance. In the editor, its instructions are the Prompt field under Instructions, and they start with a Character Sheet heading. Headings inside the sheet organize one text; they aren’t separate settings.",
            "The construct sets the voice. An activity guides what you do in the current session, and a spell adds focused instructions when the construct casts it.",
            "The Visual description shapes the construct’s artwork only. It never reaches the conversation, and the artwork doesn’t teach the construct its personality. Write how it talks and works in the Character Sheet, even when the artwork suggests it.",
            "A quest keeps its construct as it was when the quest started. A saved change to the name or instructions affects new quests only. Chat uses the default construct.",
          ],
        },
        {
          id: "craft",
          title: "Create and make copies",
          links: [],
          paragraphs: [
            "To start from a built-in construct, open Workshop and choose Make a copy. Edit changes one of your own, and Make a copy copies it so you can compare two versions. To start from nothing, choose Create construct.",
            "Give the construct a name you’ll recognize. In its Character Sheet, describe habits you can see in a reply, such as: “Explain one practical step at a time. Give a concrete example before an abstract idea. When unsure, say what needs checking.” Don’t ask it to invent facts or ignore permissions; instructions can’t change what the site allows.",
            "For example, name a construct “Moss” and give it these instructions: “Use calm, plain language. Help the user choose a small experiment. Ask at most one question per reply. Keep plant names and care steps exact.” Set its Visual description to “A small leafy guide with round glasses.” The leaves shape Moss’s picture; only the Character Sheet shapes its replies.",
            "To start the instructions over, choose Reset prompt to default. The editor shows the built-in construct’s instructions, or the default construct’s when yours didn’t come from a built-in one, and offers Undo reset. Nothing changes until you choose Save, and the Visual description and artwork stay.",
            "To give the construct artwork, write a Visual description and choose Generate Images. It uses the description as it is in the editor, spends batteries, and saves nothing else. The site makes one picture and frames it for each place it appears; the small round avatar centres on the character’s head. Save then attaches the new artwork without charging again.",
          ],
        },
        {
          id: "test",
          title: "Try and refine",
          links: [
            workshopLink("construct", "Edit a construct in Workshop"),
            {
              href: "/library/model-context#inventory",
              label: "Understand construct inputs",
            },
          ],
          paragraphs: [
            "Save Moss, then start a quest with it. Try “I have one sunny shelf. What should I do first?” and check that Moss offers a small, concrete experiment. Then try an unrelated request, to check that Moss doesn’t steer every answer back to gardening.",
            "Change one habit at a time, save, and start a new quest to compare. A quest that has started keeps the instructions it began with, so an edit shows only in quests started after it.",
            "A friendly greeting alone doesn’t prove that the construct gives reliable help. Try several realistic requests before you rely on it.",
          ],
        },
      ],
      action: {
        href: "/workshop",
        label: "Edit constructs in Workshop",
      },
    },
    {
      id: "spells",
      title: "Spells",
      intro:
        "A spell is a focused set of instructions the construct loads when it fits your request. Workshop’s Spells tab holds built-in spells and your own spells.",
      chapters: [
        {
          id: "selection",
          title: "Selection and casts",
          links: [],
          paragraphs: [
            "Before it casts a spell, the construct sees each spell’s name and When to use line, not its instructions. It uses them to decide whether a spell fits your request. It can miss a spell that fits, or cast one that doesn’t.",
            "When the construct casts a spell, it receives the spell’s instructions, the Spell Sheet in its Instructions field. The conversation shows the cast by the spell’s name and keeps the instructions private. A spell adds instructions only: it grants no tools or permissions.",
            "A cast keeps the instructions as they were then. Editing or deleting the spell later doesn’t change past casts, which keep guiding later replies in that conversation. In a team quest, those can be replies to other members, though your spell itself stays private.",
          ],
        },
        {
          id: "craft",
          title: "Create focused instructions",
          links: [],
          paragraphs: [
            "To make a spell, open Workshop’s Spells tab, then choose Make a copy on a built-in or private spell, or Create spell. Give each spell one job. Write its When to use line around a need you can recognize, not “always use this” or a description of the spell.",
            "For example, name a spell “Compare options”, with the When to use line “When the user needs to choose between two or more approaches with trade-offs.” Its Spell Sheet says: “List the options and the user’s stated constraints. Compare effort, reversibility and likely benefit. Separate known facts from assumptions. Recommend one small experiment. Ask at most one question if a missing constraint changes the choice.”",
            "Keep the When to use line short: every conversation’s instructions carry it, and a procedure there doesn’t replace the Spell Sheet. Reset puts back the built-in instructions and keeps the name and When to use line; Save keeps the reset.",
          ],
        },
        {
          id: "test",
          title: "Try selection and execution",
          links: [
            workshopLink("spell", "Edit a spell in Workshop"),
            {
              href: "/library/model-context#history",
              label: "Compare spell history and snapshots",
            },
          ],
          paragraphs: [
            "Save the spell, then open Chat or a quest and ask “Should I plant basil or mint on my sunny shelf?” Check that the construct casts the spell, then judge the comparison. Also try a request that shouldn’t need it, such as “Say hello.”",
            "If the construct doesn’t cast the spell when it should, improve the When to use line and save again. Every new cast reads the spell’s saved instructions, while a past cast keeps the text it used.",
            "Try several realistic requests: one good example can’t promise how the construct will choose next time.",
          ],
        },
      ],
      action: {
        href: workshopPath("spell"),
        label: "Open Workshop’s Spells tab",
      },
    },
    {
      id: "activities",
      title: "Activities",
      intro:
        "An activity shapes what happens in a conversation: planning, exploring or working through a task. It combines with the construct’s voice and any spells the construct casts.",
      chapters: [
        {
          id: "sessions",
          title: "Activity sessions",
          links: [],
          paragraphs: [
            "Choose an activity when you start a quest, or start one from its card on Activities. To switch, ask the construct: it can change to any activity you have. Each change starts a new activity session, and the session’s Activity Sheet guides the replies that follow.",
            "A session keeps the activity as it was when the session started, so later edits to the activity don’t change it. The conversation shows which activity it changed to, not the activity’s instructions.",
            "The Activity Sheet heading starts the Instructions field. The separate Opening request asks the construct for its first message when a new quest needs one written. It isn’t repeated with every reply, and changing activity during a conversation doesn’t replay it.",
          ],
        },
        {
          id: "craft",
          title: "Create an activity",
          links: [],
          paragraphs: [
            "To make an activity, open Workshop’s Activities tab, then choose Make a copy or Create activity. Write one way of working in the Activity Sheet. Keep the construct’s personality in its Character Sheet, and reusable procedures in spells.",
            "For example, a “Small experiment” activity might say: “Help the user define one experiment they can finish today. Identify a clear observation that would make it useful. Keep plans provisional until the user agrees. Respect their current request if they change subject.” Its Opening request: “Greet the user briefly and ask what they want to try today.”",
            "An opening should start the conversation, not ask for a life story. Don’t ask the construct to repeat the same questions every turn, or to say a tool worked before its result arrives. Reset puts back the built-in instructions and keeps the Opening request; Save keeps the change.",
          ],
        },
        {
          id: "test",
          title: "Try openings and follow-ups",
          links: [
            workshopLink("activity", "Edit an activity in Workshop"),
            {
              href: "/library/model-context#inventory",
              label: "Understand activity inputs",
            },
          ],
          paragraphs: [
            "Save the activity, then start a quest with it and read its opening. Next, send “I have ten minutes and a sunny shelf.” Check that the reply helps define a small experiment. Then ask something unrelated, and check that the activity doesn’t get in the way of a useful answer.",
            "A built-in construct in a built-in activity, or an unchanged copy of either, can have a prepared opening, which appears without a model call. Some quest starts always have their opening written, even with built-in ones. An edited activity’s opening is written from its Opening request.",
            "A quest that has started keeps the activity text it entered with, so start a new quest after each edit. Read the Model context book to see what each reply receives.",
          ],
        },
      ],
      action: {
        href: workshopPath("activity"),
        label: "Edit activities in Workshop",
      },
    },
    {
      id: "model-context",
      title: "Model context",
      intro:
        "Each kind of model call receives different information. This book lists what each one receives, what depends on the situation, and what is saved or read afresh. Its examples are made up.",
      chapters: [
        {
          id: "inventory",
          title: "Model calls and their inputs",
          links: [],
          paragraphs: [
            "Conversation reply: the model receives the assembled instructions, the newest sixty messages of the conversation, your new message among them, and the tools it may use. Images you attached are included in a form the model can read. A tool’s result can lead to another step of the same reply, up to eight steps. If the reply would end on a tool result with no answer written, one more step asks the model to answer and call no tools.",
            "Generated opening: the model receives the same instructions, built for the chosen construct and activity, with your name, your activities and spells, and the quest’s context if there is one. Its only message is the activity’s Opening request, or a special request for some quest starts. It gets no conversation and no tools. A prepared opening makes no call.",
            "Plan commands and the Plan controls make no model call. They change the plan and add a short plan change to the conversation, which the next reply reads as a note marked [Plan change], not as a request. In a conversation they wait while your last message has no reply yet, so Retry or sending again still answers it.",
            "Image in a conversation: the construct’s image tool sends the image model only the image’s description, at most 1,000 characters, not the conversation or the Journal. Conversation images use no reference pictures, and their size and quality are fixed.",
            "Construct artwork: the image model receives only the Visual description you submitted, which can be an unsaved draft. It receives no name, instructions, old artwork or conversation. One picture serves every place the construct appears. To frame the avatar, a separate small model call receives only that picture, scaled down, and returns where the character’s face and head are; it receives no name, description or instructions, and its cost joins the image’s.",
            "Manual searches and citations, spell casts, Journal edits, plan changes, milestones, activity changes and quest-status cards aren’t separate model calls. The site runs them and returns their results, which can become input to the reply’s next step. A manual search looks through a local index of the manual’s text.",
          ],
        },
        {
          id: "assembly",
          title: "Prompt assembly and instruction scope",
          links: [],
          paragraphs: [
            "Every reply starts with two system messages. The first holds the construct’s role, the shared rules, and the rules for new quests, milestones, the plan and the Journal. Then it lists your activities, by id, name and description, and your spells, by id, name and When to use line. A spell’s full instructions arrive only when it is cast.",
            "The second places the conversation in its quest, with the quest’s status and any recent decision on a status card, or says that it is your private Chat. Then come the Journal, or a note that it’s empty, the quest’s plan with each step’s number and the done steps marked, the ten newest milestones with their dates, the current activity’s name and Activity Sheet, and the construct’s Character Sheet. When several people write in a quest’s conversation, rules about authors are added. Chat has no Journal, plan, milestones or quest status.",
            "The shared rules say a construct’s voice never changes facts, technical steps or citations, and that clear instructions win over unclear character speech. They ask for at most one question per reply and forbid guessing pronouns from names. They tell the construct to answer an unrelated request without pulling you back to the quest. They ask it to save useful goals, limits, preferences and plans in the Journal, keep the Journal’s other text, and invent nothing.",
            "The quest-status rules need the owner to confirm a status card, and they tell finishing a quest apart from reaching a milestone or having a bad day. The quest’s current status outranks an older card. A proposed new quest isn’t a quest until you confirm it. The rules guide the model; the site itself enforces approvals and access.",
            "The order of the instructions isn’t a promise that later text wins: construct and activity instructions must work within the shared rules. The model can fail to follow instructions, and instructions that say “ignore permissions” change no permission.",
            "Any {{name}} in construct and activity instructions, Opening requests and When to use lines is replaced with your name, or with “the user” if you haven’t set one. A cast spell’s instructions are replaced the same way when they load. Saved definitions keep {{name}}. When the construct changes activity, that change’s own result shows the instructions as saved, with {{name}} in them; later replies show your name.",
            "The conversation follows the instructions. When the conversation the model reads starts with the construct, a neutral message from you is added before it, so the conversation starts with you. In a conversation with several authors, the site labels each message with its author. Only that label counts: text typed to look like one doesn’t.",
          ],
        },
        {
          id: "tools",
          title: "Tools, retrieved content and access",
          links: [],
          paragraphs: [
            "Tools are actions the model can ask the site to take. In an ordinary reply it can generate images, search and cite the Blender manual, change activity, cast spells and propose a new quest. A quest reply can also edit the Journal, change the plan, record milestones and propose a status change. A plan change applies all or none, names steps by their numbers, and shows in the conversation with Undo. The construct is asked to name steps by those numbers too, rather than restate the plan as a numbered list of its own. Openings have no tools.",
            "Each tool checks your access when it runs. Your own constructs, activities and spells stay private to you. A quest’s owner and current members share the quest’s data, and removal ends a member’s access. Only the owner approves status changes, and buying someone’s spell gives no access to their data.",
            "A manual search returns up to five sections, each with its link and an excerpt of at most 1,500 characters. Citations keep only links that a search in the same conversation returned, and the site shows them apart from the reply’s text. These results are what the model reads; it has no access to the whole web.",
            "The model decides which tools to ask for; the site checks and runs them. A cast returns the spell’s instructions, an activity change returns the new activity’s instructions, and edits return whether they worked. A reply that says the Journal changed isn’t the same as a tool result that says so.",
            "In a team quest, the construct and activity can guide replies to every member. Past spell casts stay with the conversation for later replies, though members never see their instructions. Don’t put secrets in definitions you use in a team quest.",
          ],
        },
        {
          id: "history",
          title: "History, storage and edits",
          links: [],
          paragraphs: [
            "A quest keeps one conversation for its whole life. A reply reads its newest sixty messages, with their spell casts and the images you attached; older messages stay in the conversation for you to read, but the model doesn’t receive them. The site doesn’t summarize them, so keep what matters in the Journal and the plan, which every reply reads.",
            "The Journal is saved text, not a summary written on every turn. Each reply reads it, the plan and the ten newest milestones when the reply starts; other quests’ conversations and your Chat aren’t included. A change made during a reply reaches the model through the tool’s result.",
            "A conversation’s construct, chosen when it starts, and each activity it enters keep their text after you edit the originals. A new cast reads the spell’s current instructions, while a past cast keeps the text it used. Renaming, resetting, retiring or deleting a definition changes neither.",
            "The site may mark the unchanged start of the instructions so the model provider can reuse it. That makes calls faster, but changes neither what is sent nor who can see it.",
          ],
        },
        {
          id: "example",
          title: "An annotated fictional reply",
          links: [],
          paragraphs: [
            "Imagine Alex’s quest “Balcony garden”, with the Journal “One shelf; morning sun” and the current activity “Small experiment”. Alex asks Moss “Basil or mint?”",
            "System message 1: the shared role and rules, including the request to save useful information in the Journal. Then Alex’s activities and spells, such as “Compare options: when choosing between approaches with trade-offs”. That line helps the construct choose the spell; it isn’t the spell’s instructions.",
            "System message 2: the quest’s name and status, the Journal “One shelf; morning sun”, the newest milestones, Small experiment’s Activity Sheet and Moss’s Character Sheet. In Chat the quest parts would be missing. Moss’s leafy Visual description is never there.",
            "Then the conversation: the opening, earlier messages, Alex’s “Basil or mint?” and any images Alex attached, with the tools alongside. The model may cast Compare options, and its instructions then join the next step. It may answer directly instead, so check the casts when you try a spell.",
            "An image request would see only its own description, not the Journal. That’s why each kind of call has its own entry in this book’s first chapter.",
          ],
        },
      ],
      action: {
        href: "/workshop",
        label: "Open Workshop",
      },
    },
  ] satisfies readonly LibraryBook[],
};

export type { LibraryBook };
export { LIBRARY_COPY };
