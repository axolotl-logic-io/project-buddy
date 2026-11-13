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
  kind: "construct" | "spell",
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
    "Plan and Brainstorm are persistent spells. Cast one to save subsequent messages in Plan or Ideas until you stop it. Use the side menu to manage both lists. Local replies spend no batteries; the balance gate still applies.",
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
            "The construct brings a voice and habits. The active spell decides whether subsequent messages go into Plan or Ideas.",
            "Open Quests and choose Learn a thing, Make a thing or Do a thing. Choose a construct and optionally say why the quest matters to you. Each new quest starts with no active spell. Dailies is your ongoing quest for starting the day: open it and choose Start the day whenever you begin.",
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
            "Quests opens after sign-in. At the top, Current quest shows the Active quest you worked on most recently, with its next step; choose Continue to pick it up. Below it, Start a quest offers Dailies, Learn a thing, Make a thing and Do a thing: choose one to open its start dialog. Choose a construct, optionally say why it matters for Learn, Make or Do, then choose Start quest. Dailies starts without asking for Why. Cancel closes the dialog without creating anything. Last, tabs show your Active, Completed and Abandoned quests. A quest opens on its conversation, with Plan, Ideas and Progress in its accordion side menu. Rename the quest with the pencil beside its name. Type /complete, /abandon or /restore in the conversation to change the whole quest’s status. Type / to see the commands. Status commands spend no batteries and offer Undo.",
            "Plan holds the tasks you agree on. You and the construct can add, edit, move, check off or remove steps. The first open step is the next step.",
            "Keep agreed tasks in Plan and possibilities in Ideas. Type brainstorm to enter Brainstorm or plan to enter Plan; subsequent messages go into that bucket. Stop the spell beside the composer to return to Chat. The panel icon opens or collapses the sidebar without losing drafts. On phones it opens as a drawer; Escape closes it. Plan and Ideas use compact rows: click text to edit, Enter to save, or Escape to cancel. The add control opens a new row. Drag a row’s handle to reorder it, or focus the handle and use the arrow keys. Open a row’s menu for other actions. Plan has circular completion controls and folds Done steps away. Move to Plan turns its saved text into an open step and removes the idea; if the move fails, the idea stays. These controls spend no batteries. Discuss context and choices in the conversation.",
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
            "Workshop has Constructs and Spells tabs. Create or edit your constructs. Spells contains only Plan and Brainstorm. Retirement keeps your retired constructs until you restore or delete them.",
            "Workshop is where you edit. Edit one section of the instructions at a time, then choose Save. Unsaved edits stay in this browser until you choose Save or Cancel. Saving prompt text makes no model call and spends no batteries. To see how a change works, save it and use it in a quest or in Chat.",
            "The Constructs and Spells books have worked examples. The Model context book explains the reply context and tool protocol.",
            "Local commands and conversation openings spend no batteries. Your balance is available in Settings.",
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
        "A construct is the character you work with: its voice, habits and way of explaining. Choose one when you start a quest.",
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
            "The construct sets the voice. Plan and Brainstorm decide where to save your subsequent messages until you stop the spell.",
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
        "Plan and Brainstorm are the two spells. A cast sets the conversation’s mode until you stop it or cast the other spell.",
      chapters: [
        LOCAL_COMMANDS_CHAPTER,
        {
          id: "selection",
          title: "Cast and stop",
          links: [],
          paragraphs: [
            "In a quest, type cast plan or cast brainstorm. The shorter plan and brainstorm commands work too, with or without a leading slash. Only one spell is active at a time.",
            "Plan saves each subsequent ordinary message as an open Plan step. Brainstorm saves it in Ideas. Switching spells changes where future messages go and leaves earlier items alone.",
            "Stop Plan or Stop Brainstorm sits beside the composer, next to Start the day when offered. Stop returns to ordinary Chat. You can also type stop or /stop. These commands make no requests to model companies and spend no batteries.",
          ],
        },
        {
          id: "craft",
          title: "Two built-in spells",
          links: [],
          paragraphs: [
            "Workshop has Constructs and Spells tabs. Spells contains only Plan and Brainstorm, with read-only explanations. There is no separate Activities catalog or custom spell creation.",
            "Plan and Brainstorm are built in. Their behavior is fixed; only constructs have editable instructions.",
          ],
        },
        {
          id: "test",
          title: "Try the buckets",
          links: [
            workshopLink("spell", "View Plan and Brainstorm"),
            {
              href: "/library/model-context#history",
              label: "Understand saved context",
            },
          ],
          paragraphs: [
            "Cast Brainstorm, then send “Try a clay fox”. Find it in Ideas in the side menu. Cast Plan, then send “Buy clay”. Find that open step in Plan. Stop the spell to return to ordinary conversation messages.",
            "A message is one item of at most 200 characters. If an item is too long or Plan is full, the conversation keeps the message and explains why it was not added. Retrying a captured message adds no duplicate.",
          ],
        },
      ],
      action: { href: workshopPath("spell"), label: "Open Spells in Workshop" },
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
            "Conversation opening: the local engine receives the chosen construct and quest context, plus a request for a brief greeting. It receives no conversation history or tools. Quest starts begin with no active spell.",
            "Plan commands and the Plan controls make no model call. Sidebar edits and Undo update the Plan with feedback in the sidebar, without adding conversation messages. Plan commands add a short plan change to the conversation, which the next reply reads as a note marked [Plan change], not as a request. In a conversation they wait while your last message has no reply yet, so Retry or sending again still answers it.",
            "Image in a conversation: the construct’s image tool sends the image model only the image’s description, at most 1,000 characters, not the conversation or the Plan. Conversation images use no reference pictures, and their size and quality are fixed.",
            "Construct appearance: look reads the Visual description from the conversation’s saved construct. No image generation or avatar framing call is made.",
            "Manual searches and citations, spell casts, plan changes, milestones and quest-status cards are tools. The site checks access and returns their results. A manual search looks through a local index of the manual’s text.",
          ],
        },
        {
          id: "assembly",
          title: "Prompt assembly and instruction scope",
          links: [],
          paragraphs: [
            "Every reply starts with two system messages. The first holds the shared role and rules, then lists Plan and Brainstorm by id, name and description. Spells have fixed behavior and no editable prompt.",
            "The second places the conversation in its quest or in your private Chat. It includes the current quest status and status-card decision, starting context, numbered Plan, recent milestones, active spell name, Visual description and construct Character Sheet. Rules about authors are added when several people have written. Chat has no quest context or active spell.",
            "The shared rules say a construct’s voice never changes facts, technical steps or citations, and that clear instructions win over unclear character speech. They ask for at most one question per reply and forbid guessing pronouns from names. They tell the construct to answer an unrelated request without pulling you back to the quest. They ask it to keep agreed remaining work in the Plan and invent nothing.",
            "The quest-status rules need the owner to confirm a status card, and they tell finishing a quest apart from reaching a milestone or having a bad day. The quest’s current status outranks an older card. A proposed new quest isn’t a quest until you confirm it. The rules guide the model; the site itself enforces approvals and access.",
            "Construct instructions work within the shared rules. Instructions cannot change access or permissions. The local engine interprets commands rather than prompt prose.",
            "Any {{name}} in construct instructions is replaced with your name, or “the user” if you have not set one. Saved construct text keeps the placeholder.",
            "The conversation follows the instructions. When the conversation the model reads starts with the construct, a neutral message from you is added before it, so the conversation starts with you. In a conversation with several authors, the site labels each message with its author. Only that label counts: text typed to look like one doesn’t.",
          ],
        },
        {
          id: "tools",
          title: "Tools, retrieved content and access",
          links: [],
          paragraphs: [
            "Tools are actions the model can ask the site to take. In an ordinary reply it can search and cite the Blender manual, cast Plan or Brainstorm. In Chat it can also suggest a quest, which only fills in Turn Chat into a quest for you to confirm. A quest reply can also change the Plan, record milestones and propose a status change. A plan change applies all or none, names steps by their numbers, and shows in the conversation with Undo. The construct is asked to name steps by those numbers too, rather than restate the plan as a numbered list of its own. Openings have no tools.",
            "Each tool checks your access when it runs. Your constructs stay private to you, and only you can open your quests and their data.",
            "A manual search returns up to five sections, each with its link and an excerpt of at most 1,500 characters. Citations keep only links that a search in the same conversation returned, and the site shows them apart from the reply’s text. These results are what the model reads; it has no access to the whole web.",
            "The command engine selects tools from explicit commands. A cast returns the spell’s identity and changes the conversation’s current spell. Edits return whether they worked. A reply that says Plan changed is not a tool result confirming that change.",
          ],
        },
        {
          id: "history",
          title: "History, storage and edits",
          links: [],
          paragraphs: [
            "A quest keeps one conversation for its whole life. A reply reads its newest sixty messages, with their spell casts and the images you attached; older messages stay in the conversation for you to read, but the model doesn’t receive them. The site doesn’t summarize them, so keep what matters in the Plan, which every reply reads.",
            "Each reply reads the current Plan and recent conversation. Tasks stay in Plan until you change or remove them. Other quests’ conversations and your Chat aren’t included.",
            "A conversation keeps the construct chosen when it starts. Later edits affect future conversations. The active spell is current conversation state, read again for each reply; casting or stopping changes it directly.",
            "The site may mark the unchanged start of the instructions so the model provider can reuse it. That makes calls faster, but changes neither what is sent nor who can see it.",
          ],
        },
        {
          id: "example",
          title: "An annotated fictional reply",
          links: [],
          paragraphs: [
            "Imagine Alex’s quest “Balcony garden”. Alex types brainstorm, then “Try basil”. The message appears in Ideas. Alex types plan, then “Buy a pot”. That message becomes an open Plan step.",
            "System message 1 contains the shared role and rules, followed by the Plan and Brainstorm descriptions.",
            "System message 2 includes the quest context, current Plan, recent milestones, active spell name and the saved construct.",
            "The conversation retains the original messages and confirmations. Alex chooses Stop Plan, then sends help to see ordinary commands again.",
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
