import type { PromptKind } from "@/prompts/prompt.ts";
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
function workshopTestLink(
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
    "Learn your way around Project Buddy, then craft the help you need. Start with Getting Started or choose a book.",
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
          title: "Start your first adventure",
          links: [
            { href: "/chat", label: "Start an adventure" },
            { href: "/projects", label: "Open Quests" },
          ],
          paragraphs: [
            "An adventure is a conversation. A quest groups ongoing work: its adventures share a Journal and progress timeline. You can also have a standalone adventure to explore an idea before making it a quest.",
            "Open Adventures and choose a construct. Choose an activity for the kind of help you want, then tell the construct your goal and one constraint. For example: “Help me plan a balcony herb garden. I have one sunny shelf and twenty minutes today.” A construct supplies voice and habits; an activity supplies the approach; spells load focused instructions when useful.",
            "To keep working toward a goal, open Quests and start a quest. Review any proposed summary before confirming it. Choose a construct and first activity for the first adventure. This choice does not lock the quest: later adventures can use another construct.",
            "An opening may be prepared text or generated for your context. Reply with what you need now. Ask for a smaller step or clearer explanation if the answer is too broad. AI answers can be wrong; check consequential advice.",
          ],
        },
        {
          id: "continue",
          title: "Continue and find your work",
          links: [{ href: "/projects", label: "Find your quests" }],
          paragraphs: [
            "Open Adventures to find and continue a conversation. Open a quest to find its adventures, Journal and progress timeline. Rename an adventure to make it easier to recognize; a manual name stops automatic renaming.",
            "The Journal holds persistent quest context such as goals, preferences, constraints and agreed plans. The construct is instructed to save useful information there, but you can read and edit it yourself. Check it when a reply seems to misunderstand your goal.",
            "Quick Notes let you capture information without a conversation. They become part of the quest Journal, so later quest adventures can use them. Another adventure’s entire conversation is not automatically supplied: put lasting information in the Journal.",
            "For example, save “The shelf gets sun only in the morning” as a Quick Note. In a later quest adventure, ask for plants that fit that constraint. A standalone adventure has no quest Journal.",
          ],
        },
        {
          id: "craft",
          title: "Craft, test and share",
          links: [
            { href: "/workshop", label: "Craft in Workshop" },
            { href: "/marketplace", label: "Browse Marketplace" },
            {
              href: "/library/model-context#inventory",
              label: "Explore model inputs",
            },
          ],
          paragraphs: [
            "Open Workshop to craft a construct, activity or spell. Choose a built-in definition to customize, or create your own. Edit one instruction section at a time, then choose Try your draft to test it in a drawer before saving. The drawer covers the editor on phones. Back to editing or Escape closes it; reopening keeps the conversation, settings and unsent message. Tests disappear when you leave or reload the page. Expand Test limits for unavailable actions. Read the relevant book for worked examples and the shared Model context book for exactly what a test receives.",
            "Batteries power model use: replies, generated openings, automatic names, Workshop tests and images. They belong to the acting user; automatic check-ins use the quest owner’s balance. Prepared openings need no model call. Canceling a request does not promise a refund for work already done.",
            "Marketplace sharing and buying gives you copies of constructs, activities and spells. Its orbs are separate from model-use Batteries. Historically, before the orb migration, trades used the shared balance called gold. That historical behavior is not a way to earn Batteries after the migration.",
            "The orb migration pauses all new buys atomically, including old forms and free listings. With the purchase gate disabled, all buys stay paused. Held copies still open; each user can receive the one-time 100-orb starting balance and sellers can reprice listings. Public browsing shows only listings explicitly priced in orbs. Merging the implementation does not enable buying or continue legacy trades.",
            "Only after separate authorized enablement will buys move orbs; sales never earn model-use Batteries after migration. Check the Marketplace’s availability message for its current purchase gate. Battery purchase packages appear in Account only with valid configured Stripe test credentials and prices, an isolated local database and a nonproduction environment. Production and hosted preview purchases are unavailable. Live purchases remain unavailable pending launch validation and approved purchase terms. A test receipt is not a live purchase. If Battery purchases are unavailable, there is no Marketplace earning fallback.",
          ],
        },
      ],
      action: {
        href: "/chat",
        label: "Open Adventures",
      },
    },
    {
      id: "constructs",
      title: "Constructs",
      intro:
        "A construct is the character you work with: its voice, habits and way of explaining. Choose one when you start an adventure; choose an activity for what you want to do.",
      chapters: [
        {
          id: "character",
          title: "Character Sheet and appearance",
          links: [],
          paragraphs: [
            "The name helps you recognize the construct. The Character Sheet is the heading inside the conversational instruction text, edited in the field labelled Prompt. Headings inside it organize one instruction text; they are not independent permission settings. Activities guide the current session; spells supply focused instructions on a cast.",
            "The Visual description guides artwork only. It is not sent in conversation prompts. Images and crop framing do not teach the construct its personality. Write conversational traits in the Character Sheet, even if the artwork suggests them.",
            "Each adventure keeps the construct as it was when the adventure started. Saving a new name or Character Sheet affects new adventures, not existing ones. A quest’s first construct is a starting choice, not a permanent restriction.",
          ],
        },
        {
          id: "craft",
          title: "Craft and customize",
          links: [],
          paragraphs: [
            "Open Constructs or Workshop. Customize a built-in construct to make an editable copy. Edit (also called Tweak) changes your own definition; Clone makes another copy so you can compare alternatives. Choose Craft construct to start from scratch.",
            "Give the construct a recognizable name and a short purpose. In the Character Sheet, describe observable habits: “Explain one practical step at a time. Give a concrete example before an abstraction. When uncertain, say what needs checking.” Avoid instructions to invent facts or override access controls.",
            "Worked example: name a construct “Moss”, with instructions “Use calm, plain language. Help the user choose a small experiment. Ask at most one question per reply. Keep plant names and care instructions exact.” Set the Visual description to “A small leafy guide with round glasses.” The leafy artwork affects appearance; only the Character Sheet guides the reply.",
            "Reset prompt changes the editor draft and offers Undo reset; Save commits it. It restores built-in instructions when there is a source, otherwise the default construct instructions. It preserves the Visual description and artwork. Bought copies and their clones cannot reset to a built-in source.",
          ],
        },
        {
          id: "test",
          title: "Test and refine",
          links: [
            workshopTestLink("construct", "Test a construct in Workshop"),
            {
              href: "/library/model-context#inventory",
              label: "Understand construct test inputs",
            },
          ],
          paragraphs: [
            "Choose Try your draft to open the drawer, then choose a companion under Test activity. Test “I have one sunny shelf. What should I do first?” Check whether Moss offers a concrete, manageable experiment. Then test an unrelated request to ensure the voice does not force every answer back to gardening.",
            "Change one habit at a time and start a fresh test. Follow-ups keep the test version; editing the draft or companion marks results out of date and the next test starts fresh. Save when the behavior is useful, then start a new adventure to use the saved construct.",
            "Tests use real model calls and Batteries, but save no adventure or quest changes. They cannot prove Journal edits, manual searches, image generation or other unavailable tools work. A pleasant greeting alone does not demonstrate reliable technical help. Generate Images is a separate paid action: it uses the current draft Visual description without saving the name, Prompt or description. Generated draft art can be previewed and recovered. Save attaches matching draft art without another charge; a changed saved description with no matching draft art can request replacement artwork.",
          ],
        },
      ],
      action: {
        href: "/constructs",
        label: "Choose or craft a construct",
      },
    },
    {
      id: "spells",
      title: "Spells",
      intro:
        "A spell is a focused set of instructions the construct loads when it fits your request. The Spellbook holds built-in spells and your own spells.",
      chapters: [
        {
          id: "selection",
          title: "Selection and casts",
          links: [],
          paragraphs: [
            "The construct first sees each available spell’s id, name and when-to-use guidance, not its full Spell Sheet, whose text is edited in the Instructions field. This selection metadata helps it decide whether to call the casting tool. The model may miss a relevant spell or choose poorly; selection is not guaranteed.",
            "A successful cast returns the Spell Sheet instructions to the model in a tool result. The adventure shows a cast by name; it does not show the private instructions. A spell adds instructions, not tools or permissions. A failed or unknown selection loads no instructions.",
            "Past casts retain their instruction text for later model replies in that adventure. Editing or deleting the source spell does not rewrite the cast. In team quests, those saved instructions can guide later replies to other members, while the original own spell stays private.",
          ],
        },
        {
          id: "craft",
          title: "Craft focused instructions",
          links: [],
          paragraphs: [
            "Open Spellbook or Workshop and customize a spell, clone your own or craft a new one. Choose Craft spell to start from scratch. The selection field is When to use. Give it one job. Write when-to-use guidance around a recognizable user need, rather than “always use this” or a description of its personality.",
            "Worked example: name “Compare options”; when-to-use guidance “When the user needs to choose between two or more approaches with trade-offs.” Spell Sheet: “List the options and the user’s stated constraints. Compare effort, reversibility and likely benefit. Separate known facts from assumptions. Recommend one small experiment. Ask at most one question if a missing constraint changes the choice.”",
            "Keep the selection guidance distinct from execution instructions. A long procedure in the when-to-use field wastes selection context and does not replace the Spell Sheet. Reset restores instructions while preserving the name and when-to-use guidance; Save commits the reset. Bought copies cannot reset to built-in instructions.",
          ],
        },
        {
          id: "test",
          title: "Test selection and execution",
          links: [
            { href: "/workshop?kind=spell", label: "Test a spell in Workshop" },
            {
              href: "/library/model-context#history",
              label: "Compare spell history and snapshots",
            },
          ],
          paragraphs: [
            "Choose Try your draft to open the drawer, then choose Test construct and Test activity. First choose Let the construct decide and ask “Should I plant basil or mint on my sunny shelf?” Look for the spell cast and then assess the comparison. Also test a request that should not need it, such as “Say hello.”",
            "Choose Cast before replying to load the draft before the reply when you want to isolate the Spell Sheet. A good forced reply proves nothing about automatic selection. If forced behavior is good but automatic casting fails, refine the when-to-use guidance and try a fresh test.",
            "Follow-ups retain loaded spell ids and the test conversation, but resolve those ids against the current draft or accessible source on each request. Unlike adventure casts, Workshop does not preserve old cast instruction text. Tests have only spell casting, not real quest tools or manual search. Review behavior across several realistic requests; one successful example cannot guarantee future selection or compliance.",
          ],
        },
      ],
      action: {
        href: "/spellbook",
        label: "Open Spellbook",
      },
    },
    {
      id: "activities",
      title: "Activities",
      intro:
        "An activity shapes what happens in an adventure: planning, exploring or working through a task. It combines with the construct’s voice and any spells the construct casts.",
      chapters: [
        {
          id: "sessions",
          title: "Activity sessions",
          links: [],
          paragraphs: [
            "Choose an activity when you start an adventure. During a conversation, ask to change activity; the construct can select an available activity using a tool. A new activity session saves a snapshot. The current session’s Activity Sheet guides subsequent replies, rather than every past activity remaining a system instruction.",
            "Changing the source activity later does not rewrite a saved session. On a successful change, the tool supplies the new instructions for that reply. Later replies read the current session. The stored visible selection result keeps the activity’s identity rather than exposing its instructions.",
            "The Activity Sheet is the heading inside the session instructions, edited in the Instructions field. The separate opening request asks for the first reply when a new adventure needs a generated opening. The opening request is not a persistent instruction repeated with every reply, and changing activity during an adventure does not automatically replay a new-adventure opening.",
          ],
        },
        {
          id: "craft",
          title: "Craft an activity",
          links: [],
          paragraphs: [
            "Open Activities or Workshop to customize, clone or craft. Choose Craft activity to start from scratch. Opening request is a separate field. Write one useful way of working in the Activity Sheet. Keep the construct’s personality in its Character Sheet and reusable procedures in spells.",
            "Worked example: “Small experiment”. Activity Sheet: “Help the user define one experiment they can finish today. Identify a clear observation that would make it useful. Keep plans provisional until the user agrees. Respect their current request if they change subject.” Opening request: “Greet the user briefly and ask what they want to try today.”",
            "The opening should start the conversation, not demand a complete life history. Avoid repeating an interview every turn or claiming tools succeeded without results. Reset restores activity instructions but preserves the opening request; Save commits changes. Bought copies cannot reset to a built-in source.",
          ],
        },
        {
          id: "test",
          title: "Test openings and follow-ups",
          links: [
            workshopTestLink("activity", "Test an activity in Workshop"),
            {
              href: "/library/model-context#inventory",
              label: "Understand activity test inputs",
            },
          ],
          paragraphs: [
            "Choose Try your draft to open the drawer, then choose Test construct and use Test opening request. Then send “I have ten minutes and a sunny shelf.” Check that the reply helps define a small experiment. Follow up with an unrelated question and check that the activity does not prevent a useful answer.",
            "Built-in construct/activity combinations, and unchanged copies, may have a prepared opening. It is displayed without a model call. Special quest motivation and interview kickoffs always generate an opening, even for built-in combinations. Modified combinations normally generate an opening from the opening request and assembled context. Workshop opening tests exercise generation, not prepared-opening selection.",
            "Test a fresh conversation after editing. Workshop has no real quest Journal and cannot switch activities or save milestones. Use the model context book to understand these limits before interpreting a test as evidence for a real quest workflow.",
          ],
        },
      ],
      action: {
        href: "/activities",
        label: "Choose or craft an activity",
      },
    },
    {
      id: "model-context",
      title: "Model context",
      intro:
        "Different operations send different information. This book describes the implemented model paths and what is conditional, saved or supplied afresh. Examples are fictional.",
      chapters: [
        {
          id: "inventory",
          title: "Model calls and their inputs",
          links: [],
          paragraphs: [
            "Adventure reply: the reply model receives assembled system instructions, saved conversation history, the new user message and active tool definitions. Uploaded supported images are hydrated into model-readable image parts. Tool calls and results can cause further calls in the same reply. After at most eight steps, an additional answer-now call requests an answer if no visible text follows the last non-citation tool result, or if all steps are textless when no tools ran. It includes accumulated results and a note saying “Call no tools”. Tool definitions remain attached, with a one-step limit; this differs from the Workshop fallback, which omits tools.",
            "Generated opening: the reply model receives the same system renderer with the chosen construct, activity, acting user’s name and available activity/spell metadata, plus quest context if applicable. Its only user message is the activity opening request or special kickoff. No conversation history or executable tools are attached. A prepared opening makes no model call.",
            "Automatic adventure naming: a separate naming model receives only text from the conversation, up to 2,000 characters per message, omitting system messages and tool-only messages, plus naming instructions and “Name this adventure.” No Character Sheet, Journal, image bytes or tool definitions are separately added. It asks for at most six words and allows 40 output tokens. Naming runs after user messages 1, 3, 5, 7 and 14, unless you renamed the adventure by hand.",
            "Automatic check-in: a new quest adventure uses the generated-opening path with the owner as acting user. A special hidden request asks for two or three sentences about where the Journal left off and a small ten-minute next step. It explicitly forbids technical manual steps because no lookup tools are attached. It does not receive all earlier quest adventures.",
            "Workshop test: the reply model receives the selected construct/activity, latest draft replacement, acting user’s name, available spell metadata, temporary text history and the test message. It has no quest context; its Activities section contains an empty activity list. An extra system message explains test restrictions and includes forced or previously loaded spell instructions. Only casting executes. Opening tests substitute the draft opening request for the test message. At most six steps and 3,000 output tokens per call are allowed; a textless result can trigger one extra answer call without tools.",
            "Adventure image generation: a tool invokes the image model with the generated image prompt (at most 1,000 characters), not the whole conversation or Journal. The current adventure tool sends no reference images. The shared provider supports reference bytes for callers that explicitly supply them; do not assume all images or attachments are references. Fixed square output settings are provider parameters.",
            "Construct artwork: the same image provider receives exactly the normalized submitted Visual description. Generate Images can use an unsaved draft, including a recovered browser draft, without changing the saved name, Prompt or description. Save attaches matching draft art without another generation charge; otherwise a changed description can request replacement art. It receives no construct name, Character Sheet, voice, old art or conversation. One canonical image supplies the appearance roles through framing metadata. Saving an unchanged description does not request generation; Generate Images explicitly regenerates.",
            "Manual search and citation, spell resolution, Journal edits, milestone records, activity changes and approval cards are application/tool operations, not separate language-model inference calls. Manual keyword search uses the local indexed text, not a model embedding call. Their results may become inputs to a subsequent reply call.",
          ],
        },
        {
          id: "assembly",
          title: "Prompt assembly and instruction scope",
          links: [],
          paragraphs: [
            "The first system message contains the construct role, global rules, new-quest rules, milestone rules and Journal-saving rules, then lists of the acting user’s available activities and spells. Lists identify activities by id/name/description and spells by id/name/when-to-use. Full spell instructions arrive only on casting.",
            "The second system message places the adventure in its named quest or explains that it stands alone. For a quest it includes current status and the latest status-proposal decision when present. Rules for several authors appear only when several people have written. Then come the Journal (or an empty-Journal notice), up to ten newest milestones with dates, current activity’s snapshot name and Activity Sheet, then saved Character Sheet. Standalone adventures omit Journal, milestones and quest status.",
            "Global instructions say voice must not alter facts, technical steps or citations; unclear character speech should give way to clear instructions. They ask at most one question per reply and prohibit guessing pronouns from names. They tell the construct to answer unrelated current requests without forcing a return to the quest, overriding activity guidance to advance a plan. They ask it to save useful goals, constraints, preferences and agreed plans in the Journal, preserve unrelated text and avoid inventing facts.",
            "Quest-status instructions require an owner confirmation card and distinguish whole-quest completion from a milestone or frustration. Current status and live proposal decisions explicitly supersede stale cards. New-quest tool results are proposals to review, not proof a quest already exists. Instructions guide the model; application checks enforce the actual approval and access rules.",
            "Ordering is assembly order, not a promise that later text wins. Construct and activity instructions must work within global rules. The model can fail to follow instructions. A prompt that says “ignore permissions” does not change server permissions.",
            "The renderer replaces {{name}} in construct and activity instructions, opening requests and spell when-to-use guidance with the acting user’s name; cast instructions are substituted when loaded. Stored definitions retain the placeholder. For a user with no saved name the substitution is “the user”. In the activity-change tool result itself, the instructions are returned exactly as stored, so {{name}} remains literal there. Later replies render the saved session into system instructions and replace the placeholder with the acting user’s name.",
            "Conversation messages follow the system instructions. A neutral user kickoff is inserted before an assistant opening when needed to keep the model conversation user-first. In adventures with several authors, application-generated headers identify user-message authors, with disambiguating labels for duplicate or missing names. The instructions say only the real header establishes authorship; text typed to imitate a header does not.",
          ],
        },
        {
          id: "tools",
          title: "Tools, retrieved content and access",
          links: [],
          paragraphs: [
            "The tool definitions describe names, input shapes and when to use them. Ordinary replies can generate images, search and cite the Blender manual, change activity, cast spells and propose a new quest. Quest replies additionally have Journal editing, milestone recording and quest-status proposal tools. Openings and names have no tools; Workshop has only casting.",
            "Tool execution checks the acting user’s current access. Own definitions stay private to their owner. Quest owners and current members share accessible quest data; removal ends access. Only owners can approve quest-status changes or manage check-ins. Writing instructions or buying someone else’s spell never grants their data or credentials to a tool.",
            "Manual search returns up to five labeled sections with source URLs and excerpts capped at 1,500 characters each. These retrieved excerpts, later citation results and other tool results enter the model conversation. Citation results keep only URLs returned by a search in this adventure and add a model-facing reminder to write the answer if it has not already done so; the app displays the links separately from prose. They are relevant retrieved content, not access to all repository documentation or the whole web.",
            "A cast returns resolved instructions, an activity change returns current activity instructions for that reply, and mutations return success/refusal information. The model decides which tools to request; the app validates and executes them. A claim in prose that the Journal changed is not equivalent to a successful tool result.",
            "In team adventures, construct and activity snapshots can guide replies to all members. Past private spell casts also remain model context for later participants, though the browser-facing history strips their instructions. Do not put secrets in definitions you use in a shared adventure.",
          ],
        },
        {
          id: "history",
          title: "History, storage and edits",
          links: [],
          paragraphs: [
            "Adventure replies read saved model history, including past spell instruction results, and hydrate accessible image attachments. There is no application summarizer or general rolling-history truncation in this reply path. Provider context limits still apply: a long adventure can exceed them. Start another quest adventure and keep durable context in the Journal rather than assuming unlimited recall.",
            "The Journal is stored persistent text, not a transcript summary automatically generated on every turn. Replies read it and the ten newest milestones afresh at turn start. Other adventures’ messages are not added. Context read at the beginning of a reply does not continuously refresh during that call; tool results can convey changes made during it.",
            "Construct snapshots and activity-session snapshots survive source edits. Current spell selection metadata is read for the acting user; a new cast resolves accessible current instructions, while past casts retain the text used then. Renaming, resetting, retiring or deleting a source does not rewrite old snapshots or cast results.",
            "Workshop results live in the open page and disappear on reload. The request accepts at most forty history messages; it bounds draft text to 20,000 characters, the new message to 10,000 and individual history text to 30,000. The UI asks for a new test when full. These limits differ from real adventure history. Draft edits or companion changes start fresh on the next test.",
            "Prompt-cache markers may let a provider reuse an unchanged prefix; they do not remove the categories of information sent or add access. Saved messages and artwork are app data; supplying a current Journal, tool schemas and user-name substitution is fresh assembly for the operation.",
          ],
        },
        {
          id: "example",
          title: "An annotated fictional reply",
          links: [],
          paragraphs: [
            "Imagine Alex’s quest “Balcony garden”, Journal “One shelf; morning sun”, and a current activity “Small experiment”. Alex asks “Basil or mint?” using Moss.",
            "System message 1: shared role and factuality rules; instructions to save useful Journal information; available activity metadata; spell metadata including “Compare options: when choosing approaches with trade-offs”. This is selection guidance, not that spell’s procedure.",
            "System message 2: quest name and current status; Journal text “One shelf; morning sun”; newest recorded milestones; Small experiment’s Activity Sheet; Moss’s saved Character Sheet. If this were standalone, quest sections would be absent. Moss’s leafy Visual description is absent in either case.",
            "Conversation: the saved opening, earlier messages and Alex’s new “Basil or mint?” message, plus any accessible attachments. Tool definitions are supplied alongside. The model may request the comparison spell; a successful result then adds its Spell Sheet instructions to the next model step. It may instead answer directly, so inspect actual casts when testing selection.",
            "The naming call afterward sees bounded conversation text and a naming request, not this entire assembled system context. An image call would see its own image prompt, not automatically inherit the Journal. This distinction is why each model path has its own inventory.",
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
