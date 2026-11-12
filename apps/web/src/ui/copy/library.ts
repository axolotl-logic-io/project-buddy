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

const LOCAL_COMMANDS_CHAPTER: LibraryChapter = {
  id: "local-commands",
  title: "Local construct commands",
  links: [],
  paragraphs: [
    "Constructs currently use local commands inspired by multi-user dungeons. Type help to see commands, look to read the construct’s visual description, search <query> to search the Blender manual, or cast <spell id> to record a spell cast. Commands can also begin with /. The app sends nothing to AI model companies.",
    "The following chapters describe the retained definitions and harness. Automatic planning, activity changes, instruction interpretation, image understanding and image generation are unavailable in this first command engine. Spell casts are saved, but do not execute their instructions. Existing definitions, conversations, images, Plan controls and progress controls remain available. Local replies spend no batteries; the balance gate still applies.",
  ],
};

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
        "Project Buddy keeps your quests and conversations with constructs. Constructs currently respond to local commands: help, look, search <query> and cast <spell id>. The app makes no requests to AI model companies.",
      chapters: [
        LOCAL_COMMANDS_CHAPTER,
        {
          id: "first-adventure",
          title: "Start talking or start a quest",
          links: [
            { href: "/chat", label: "Open Chat" },
            { href: "/quests", label: "Open Quests" },
          ],
          paragraphs: [
            "Chat is your private conversation with a construct, for talking without a goal. A quest is something you want to learn, make or do. Each quest has one continuing conversation, with its plan and progress beside it.",
            "To explore an idea, open Chat and tell the construct what you are thinking about and one limit, for example: “Help me plan a balcony herb garden. I have one sunny shelf and twenty minutes today.” When the idea becomes a goal, choose Turn Chat into a quest, or ask the construct to suggest one. Choose a construct, optionally say why it matters, then start the quest. Its conversation begins with the summary from Chat, and your Chat stays private.",
            "Each part has its own job. The construct brings a voice and habits, the activity brings an approach, and spells add focused instructions when they fit.",
            "To work toward a goal over time, open Quests and, under Start a quest, choose Learn a thing, Make a thing or Do a thing. Each opens a dialog where you choose a construct and optionally say why the quest matters to you. Each begins in an activity that suits it, and you can start each again for another goal. Dailies is your one ongoing quest for starting the day: open it and choose Start the day whenever you begin. A quest keeps its construct; ask it to change activity when you want a different kind of help.",
            "The construct’s first message is its opening. Reply with what you need now, and ask for a smaller step or a clearer explanation if an answer is too broad. AI answers can be wrong, so check advice that matters.",
          ],
        },
        {
          id: "continue",
          title: "Continue and find your work",
          links: [{ href: "/quests", label: "Find your quests" }],
          paragraphs: [
            "The header shows where you are. Its links lead back through the pages that contain this one, up to Quests.",
            "Chat is always one conversation, so open Chat to carry on where you left off. A quest’s conversation opens with the quest.",
            "Quests opens after sign-in. At the top, Current quest shows the Active quest you worked on most recently, with its next step; choose Continue to pick it up. Below it, Start a quest offers Dailies, Learn a thing, Make a thing and Do a thing: choose one to open its start dialog. Choose a construct, optionally say why it matters, then choose Start quest. Cancel closes the dialog without creating anything. Last, tabs show your Active, Completed and Abandoned quests. A quest opens on its conversation, with Plan, Ideas and Progress in its accordion side menu. The portrait beside Conversation opens the construct’s profile. Rename the quest with the pencil beside its name. Open the three-dot Quest actions menu beside the section tabs to choose Finish Quest, Abandon Quest or Restore quest.",
            "Plan holds the tasks you agree on. You and the construct can add, edit, move, check off or remove steps. The first open step is the next step.",
            "Keep agreed tasks in Plan and possibilities in Ideas. Type brainstorm to enter Brainstorm or plan to enter Plan; subsequent messages go into that bucket. Stop the Activity beside the composer to return to Chat. The side menu can be minimized, shown at medium size or opened full screen. Add, edit or remove an idea in the Ideas accordion. Move to Plan turns its saved text into an open step and removes the idea; if the move fails, the idea stays. These controls spend no batteries. Discuss context and choices in the conversation.",
            "For example, add “Choose plants for the morning sun” to Plan. Ask the construct to help with that step, then check it off when it is done.",
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
            "Local commands spend no batteries. Earlier model use spent the balance of the person who asked. Saved images and prepared openings require no new model call. Canceling an earlier request may not return batteries for work already done.",
            "Under each reply, the conversation shows what it cost you, to one decimal place. That cost includes any retries and images the reply needed. Your balance shows whole batteries.",
            "Settings holds your name, appearance, new quest construct, Batteries balance and purchases, and sign-out controls.",
          ],
        },
      ],
      action: {
        href: "/quests",
        label: "Start a quest",
      },
    },
    {
      id: "constructs",
      title: "Constructs",
      intro:
        "A construct is the character you work with: its voice, habits and way of explaining. Choose one when you start a quest; an activity guides what you do.",
      chapters: [
        LOCAL_COMMANDS_CHAPTER,
        {
          id: "plan",
          title: "Plan",
          links: [{ href: "/quests", label: "Open your quests" }],
          paragraphs: [
            "Plan is the quest’s todo list. Add a step, edit it, check it off, move it or remove it. Done steps stay under Done. The first open step is what comes next.",
            "Use the Plan section, the panel beside the conversation, or /add TEXT, /done, /edit, /move, /drop and /undo in the composer. Changes you make directly spend no batteries. The construct uses change_plan for tasks you agree on.",
          ],
        },
        {
          id: "character",
          title: "Character Sheet and appearance",
          links: [],
          paragraphs: [
            "A construct has a name, instructions and an appearance. In the editor, its instructions are the Prompt field under Instructions, and they start with a Character Sheet heading. Headings inside the sheet organize one text; they aren’t separate settings.",
            "The construct sets the voice. An activity guides what you do in the current session, and a spell adds focused instructions when the construct casts it.",
            "The look command shows the Visual description saved with the conversation’s construct. Editing it saves text without generating artwork or spending batteries. The artwork doesn’t teach the construct its personality. Write how it talks and works in the Character Sheet, even when the artwork suggests it.",
            "A quest keeps its construct as it was when the quest started. A saved change to the name or instructions affects new quests only. Chat uses the default construct.",
          ],
        },
        {
          id: "craft",
          title: "Create and make copies",
          links: [],
          paragraphs: [
            "To start from a built-in construct, open Workshop and choose Make a copy. Edit changes one of your own, and Make a copy copies it so you can compare two versions. To start from nothing, choose Create construct. New copies of built-in constructs use their current instructions; copying one of your own keeps your edits.",
            "Give the construct a name you’ll recognize. In its Character Sheet, describe habits you can see in a reply, such as: “Explain one practical step at a time. Give a concrete example before an abstract idea. When unsure, say what needs checking.” Don’t ask it to invent facts or ignore permissions; instructions can’t change what the site allows.",
            "For example, name a construct “Moss” and give it these instructions: “Use calm, plain language. Help the user choose a small experiment. Ask at most one question per reply. Keep plant names and care steps exact.” Set its Visual description to “A small leafy guide with round glasses.” The leaves shape Moss’s picture; only the Character Sheet shapes its replies.",
            "To start the instructions over, choose Reset prompt to default. The editor shows the built-in construct’s instructions, or the default construct’s when yours didn’t come from a built-in one, and offers Undo reset. Nothing changes until you choose Save, and the Visual description and artwork stay.",
            "Save keeps your Visual description for future conversations. Existing conversations keep their saved description and artwork. Image generation and the Image gallery have been removed.",
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
        LOCAL_COMMANDS_CHAPTER,
        {
          id: "selection",
          title: "Selection and casts",
          links: [],
          paragraphs: [
            "Before it casts a spell, the construct sees each spell’s name and When to use line, not its instructions. It uses them to decide whether a spell fits your request. It can miss a spell that fits, or cast one that doesn’t.",
            "When the construct casts a spell, it receives the spell’s instructions, the Spell Sheet in its Instructions field. The conversation shows the cast by the spell’s name and keeps the instructions private. A spell adds instructions only: it grants no tools or permissions.",
            "A cast keeps the instructions as they were then. Editing or deleting the spell later doesn’t change past casts, which keep guiding later replies in that conversation.",
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
        "An activity is a set of instructions that shapes what happens in a conversation: planning, exploring or working through a task. It isn’t a place to go or something to pick before you start. It combines with the construct’s voice and any spells the construct casts.",
      chapters: [
        LOCAL_COMMANDS_CHAPTER,
        {
          id: "sessions",
          title: "Activity sessions",
          links: [],
          paragraphs: [
            "Each starting point begins in its own activity: Dailies in Dailies, Learn a thing in Learn a thing, Make a thing in Find something to make, and Do a thing in Break Down a Project. Chat starts in Chat. To switch, ask the construct: it can change to any activity you have, including your own. Each change starts a new activity session, and the session’s Activity Sheet guides the replies that follow.",
            "A session keeps the activity as it was when the session started, so later edits to the activity don’t change it. The conversation shows which activity it changed to, not the activity’s instructions.",
            "The Activity Sheet heading starts the Instructions field. The separate Opening request asks the construct for its first message when a new quest needs one written. It isn’t repeated with every reply, and changing activity during a conversation doesn’t replay it.",
          ],
        },
        {
          id: "craft",
          title: "Create an activity",
          links: [],
          paragraphs: [
            "To make an activity, open Workshop’s Activities tab, then choose Make a copy or Create activity. To use it, ask the construct to change to it in a conversation. Write one way of working in the Activity Sheet. Keep the construct’s personality in its Character Sheet, and reusable procedures in spells.",
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
        "The app runs a local command engine. This book describes the retained context and tool protocol. Sheets and snapshots remain saved, but their prose does not control command behavior. Image generation and vision calls are disabled.",
      chapters: [
        LOCAL_COMMANDS_CHAPTER,
        {
          id: "inventory",
          title: "Model calls and their inputs",
          links: [],
          paragraphs: [
            "Conversation reply: the model receives the assembled instructions, the newest sixty messages of the conversation, your new message among them, and the tools it may use. Images you attached are included in a form the model can read. A tool’s result can lead to another step of the same reply, up to eight steps. If the reply would end on a tool result with no answer written, one more step asks the model to answer and call no tools.",
            "Generated opening: the model receives the same instructions, built for the chosen construct and activity, with your name, your activities and spells, and the quest’s context if there is one. Its only message is the activity’s Opening request, or a special request for some quest starts. It gets no conversation and no tools. A prepared opening makes no call.",
            "Plan commands and the Plan controls make no model call. They change the plan and add a short plan change to the conversation, which the next reply reads as a note marked [Plan change], not as a request. In a conversation they wait while your last message has no reply yet, so Retry or sending again still answers it.",
            "Image in a conversation: the construct’s image tool sends the image model only the image’s description, at most 1,000 characters, not the conversation or the Plan. Conversation images use no reference pictures, and their size and quality are fixed.",
            "Construct appearance: look reads the Visual description from the conversation’s saved construct. No image generation or avatar framing call is made.",
            "Manual searches and citations, spell casts, plan changes, milestones, activity changes and quest-status cards aren’t separate model calls. The site runs them and returns their results, which can become input to the reply’s next step. A manual search looks through a local index of the manual’s text.",
          ],
        },
        {
          id: "assembly",
          title: "Prompt assembly and instruction scope",
          links: [],
          paragraphs: [
            "Every reply starts with two system messages. The first holds the construct’s role, the shared rules, and the rules for new quests, milestones, the Plan. Then it lists your activities, by id, name and description, and your spells, by id, name and When to use line. A spell’s full instructions arrive only when it is cast.",
            "The second places the conversation in its quest, with the quest’s status and any recent decision on a status card, or says that it is your private Chat. Then come the quest’s Plan with each step’s number and the done steps marked, the ten newest milestones with their dates, the current activity’s name and Activity Sheet, and the construct’s Character Sheet. When several people write in a quest’s conversation, rules about authors are added. Chat has no Plan, milestones or quest status.",
            "The shared rules say a construct’s voice never changes facts, technical steps or citations, and that clear instructions win over unclear character speech. They ask for at most one question per reply and forbid guessing pronouns from names. They tell the construct to answer an unrelated request without pulling you back to the quest. They ask it to keep agreed remaining work in the Plan and invent nothing.",
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
            "Tools are actions the model can ask the site to take. In an ordinary reply it can search and cite the Blender manual, change activity and cast spells. In Chat it can also suggest a quest, which only fills in Turn Chat into a quest for you to confirm. A quest reply can also change the Plan, record milestones and propose a status change. A plan change applies all or none, names steps by their numbers, and shows in the conversation with Undo. The construct is asked to name steps by those numbers too, rather than restate the plan as a numbered list of its own. Openings have no tools.",
            "Each tool checks your access when it runs. Your own constructs, activities and spells stay private to you, and only you can open your quests and their data.",
            "A manual search returns up to five sections, each with its link and an excerpt of at most 1,500 characters. Citations keep only links that a search in the same conversation returned, and the site shows them apart from the reply’s text. These results are what the model reads; it has no access to the whole web.",
            "The model decides which tools to ask for; the site checks and runs them. A cast returns the spell’s instructions, an activity change returns the new activity’s instructions, and edits return whether they worked. A reply that says the Plan changed isn’t the same as a tool result that says so.",
          ],
        },
        {
          id: "history",
          title: "History, storage and edits",
          links: [],
          paragraphs: [
            "A quest keeps one conversation for its whole life. A reply reads its newest sixty messages, with their spell casts and the images you attached; older messages stay in the conversation for you to read, but the model doesn’t receive them. The site doesn’t summarize them, so keep what matters in the Plan, which every reply reads.",
            "Each reply reads the current Plan and recent conversation. Tasks stay in Plan until you change or remove them. Other quests’ conversations and your Chat aren’t included.",
            "A conversation’s construct, chosen when it starts, and each activity it enters keep their text after you edit the originals. A new cast reads the spell’s current instructions, while a past cast keeps the text it used. Renaming, resetting, retiring or deleting a definition changes neither.",
            "The site may mark the unchanged start of the instructions so the model provider can reuse it. That makes calls faster, but changes neither what is sent nor who can see it.",
          ],
        },
        {
          id: "example",
          title: "An annotated fictional reply",
          links: [],
          paragraphs: [
            "Imagine Alex’s quest “Balcony garden”, with the Plan step “Choose plants for morning sun” and the current activity “Small experiment”. Alex asks Moss “Basil or mint?”",
            "System message 1: the shared role and rules, including the rules for keeping agreed tasks in Plan. Then Alex’s activities and spells, such as “Compare options: when choosing between approaches with trade-offs”. That line helps the construct choose the spell; it isn’t the spell’s instructions.",
            "System message 2: the quest’s name and status, the current Plan, the newest milestones, Small experiment’s Activity Sheet and Moss’s Character Sheet. In Chat the quest parts would be missing. Moss’s leafy Visual description is never there.",
            "Then the conversation: the opening, earlier messages, Alex’s “Basil or mint?” and any images Alex attached, with the tools alongside. The model may cast Compare options, and its instructions then join the next step. It may answer directly instead, so check the casts when you try a spell.",
            "An image request would see only its own description, not the Plan. That’s why each kind of call has its own entry in this book’s first chapter.",
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
