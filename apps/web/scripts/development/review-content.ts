// What `mise run review-data` puts in the typical and crowded review
// accounts (review-accounts.ts): their quests, what is done in each, and
// their rites. review-data.ts makes it all through the site's API and
// stores; this module is only the words.
//
// The typical account looks like a few weeks of real use. The crowded
// account pushes every limit a layout has to survive: names and texts at
// their longest, words too long to wrap, Markdown in every form a
// construct writes, and long lists.

// One step in a quest, in order.
type QuestStep =
  | { readonly kind: "perform"; readonly name: string }
  | { readonly kind: "stop" }
  // A message made during a performance through the site's API.
  | { readonly kind: "send"; readonly text: string }
  | { readonly kind: "plain"; readonly text: string }
  | { readonly kind: "task"; readonly text: string }
  | { readonly kind: "check"; readonly number: number }
  // Tasks added from the Tasks panel, in one change, as a panel adds them.
  | { readonly kind: "tasks"; readonly texts: readonly string[] }
  // A note, added with Quick Add to the quest's notes list.
  | { readonly kind: "note"; readonly text: string }
  // A message and a construct reply written in Markdown.
  | { readonly kind: "reply"; readonly message: string; readonly reply: string }
  // The quest's new status, from its status control.
  | { readonly kind: "status"; readonly status: "completed" | "abandoned" };

// A quest: the starting point it starts from, its name and Why, and what
// happens in it.
interface ReviewQuest {
  readonly from: "learn" | "make" | "do";
  readonly name: string;
  readonly why: string;
  readonly steps: readonly QuestStep[];
}

// A rite of the account's own.
interface ReviewRite {
  readonly name: string;
  readonly replies: readonly string[];
}

// What one account holds.
interface ReviewContent {
  readonly rites: readonly ReviewRite[];
  readonly quests: readonly ReviewQuest[];
}

const LATIN_MAP_REPLY = `Good work. Reading a whole legend unaided is the step this quest was for, and you can keep it in the list at the end of your performance.

Next, try the cartouche on the **Blaeu** sheet: its abbreviations are harder than the legend's.`;

const TYPICAL: ReviewContent = {
  rites: [
    {
      name: "Workshop log",
      replies: ["Logged.", "On the list.", "Added to the bench list."],
    },
    {
      name: "Margin notes",
      replies: ["Noted in the margin.", "Kept in the margin."],
    },
    {
      name: "Morning bell",
      replies: ["On today's list.", "Got it.", "Rung and listed."],
    },
  ],
  quests: [
    {
      from: "do",
      name: "Run the autumn book swap",
      why: "The library corner needs a reason for people to visit.",
      steps: [
        {
          kind: "tasks",
          texts: [
            "Book the church hall for the second Saturday",
            "Print posters for the library and the bakery",
            "Borrow two trestle tables",
          ],
        },
        { kind: "check", number: 1 },
        { kind: "check", number: 2 },
        { kind: "check", number: 3 },
        { kind: "status", status: "completed" },
      ],
    },
    {
      from: "make",
      name: "Build a walnut bookshelf",
      why: "The books have been in boxes since the move.",
      steps: [
        {
          kind: "tasks",
          texts: [
            "Measure the alcove at the top and the bottom",
            "Choose between dados and shelf pins",
          ],
        },
        { kind: "perform", name: "Workshop log" },
        { kind: "send", text: "Rip the walnut boards to 250 mm" },
        { kind: "send", text: "Sand the sides to 180 grit" },
        { kind: "send", text: "Buy Danish oil" },
        { kind: "stop" },
        { kind: "check", number: 1 },
        {
          kind: "plain",
          text: "A small drawer under the bottom shelf",
        },
      ],
    },
    {
      from: "learn",
      name: "Read Latin on old maps",
      why: "I keep buying old maps and can't read half of them.",
      steps: [
        { kind: "task", text: "Learn the common map abbreviations" },
        {
          kind: "task",
          text: "Translate the legend of the 1648 Mercator sheet",
        },
        { kind: "task", text: "Make flashcards for compass terms" },
        {
          kind: "task",
          text: "Read the Ortelius cartouche aloud",
        },
        { kind: "check", number: 1 },
        { kind: "check", number: 3 },
        {
          kind: "plain",
          text: "Frame the Mercator sheet with my translation beside it",
        },
        { kind: "plain", text: "Ask the map shop about Blaeu atlases" },
        {
          kind: "note",
          text: "Septentrio is north, meridies is south. Oriens and occidens for east and west.",
        },
        {
          kind: "note",
          text: "Ins. is insula, fl. is flumen. Mons, montes for mountains.",
        },
        {
          kind: "note",
          text: "The library has Lewis and Short on the second floor.",
        },
        { kind: "perform", name: "Margin notes" },
        {
          kind: "reply",
          message: "I read the whole Mercator legend without the dictionary!",
          reply: LATIN_MAP_REPLY,
        },
      ],
    },
  ],
};

// The site's limits, which the crowded account fills to the last character.
// This module runs before the site's modules can be imported
// (app-modules.ts), so it repeats them.
const QUEST_NAME_MAX = 80;
const TASK_MAX = 200;
const PLAIN_MAX = 200;
const NOTE_MAX = 1000;
const RITE_NAME_MAX = 80;
const RITE_REPLIES_MAX = 50;

// How many of each the crowded account has.
const LISTED_QUESTS = 15;
const PANEL_TASKS = 26;
const COMMAND_TASKS = 4;
const PLAIN_ITEMS = 15;
const NOTES = 10;
const RITES = 14;

// The crowded main quest's tasks with long words and addresses, before the
// rest.
const CROWDED_SPECIAL_TASKS = 3;

// The crowded main quest's done tasks: every third, from the first.
const DONE_TASK_COUNT = 10;
const DONE_TASK_EVERY = 3;
const DONE_TASKS: readonly number[] = Array.from(
  { length: DONE_TASK_COUNT },
  (_, index) => index * DONE_TASK_EVERY + 1,
);

// Every fifth listed quest is completed, starting with the second, and
// every fifth abandoned, starting with the fourth.
const STATUS_CYCLE = 5;
const COMPLETED_IN_CYCLE = 1;
const ABANDONED_IN_CYCLE = 3;

// The list quest whose name is one long word.
const LONG_WORD_QUEST = 4;

// Text of exactly length characters, or one fewer where that would end in a
// space, from words, repeated.
function textOfLength(words: string, length: number): string {
  return words
    .repeat(Math.ceil(length / words.length))
    .slice(0, length)
    .trim();
}

// Text from words, as long as part parts of whole make of max, but never
// longer than max, so a list's items grow from a fraction of the limit to
// the whole of it.
function growingText(
  words: string,
  max: number,
  part: number,
  whole: number,
): string {
  return textOfLength(words, Math.min(max, Math.ceil((max * part) / whole)));
}

const LONG_WORD =
  "Antidisestablishmentarianismfloccinaucinihilipilificationpneumonoultramicroscopic";

const LONG_URL =
  "https://archive.example.org/collections/cartography/seventeenth-century/blaeu-atlas-maior/volume-04/plate-0127/high-resolution-scan.tiff";

const PROSE =
  "The question is less how to begin than how to keep going once the first enthusiasm wears off, which is where most quests quietly stall. ";

const MARKDOWN_REPLY = `## Plan for the archive move

Here is where things stand, and what I'd do next.

### Done so far

1. Catalogued the **first three shelves**, including the *oversized* folios.
2. Photographed every spine, with the shelf mark in frame.
   - Shelf A: 214 volumes
   - Shelf B: 187 volumes
     - Including twelve with loose boards, set aside in a labelled box.
3. Moved the card index into the spreadsheet.

### What's left

| Shelf | Volumes | Condition | Owner |
| --- | ---: | --- | --- |
| C | 203 | Good | Mara |
| D | 96 | Fragile, needs boxing before it travels anywhere at all | Fen |
| E | 311 | Unknown | — |

> The fragile shelf goes last, in its own van, with nothing stacked on it.

Run \`npm run catalogue -- --shelf D --dry-run\` before the real thing, and check the URL it prints: ${LONG_URL}

\`\`\`ts
// Moves one shelf's records to the new catalogue, oldest first, and reports any that failed to copy so they can be checked by hand before the shelf is boxed.
async function moveShelf(shelf: Shelf, catalogue: Catalogue): Promise<readonly MoveFailure[]> {
  const failures: MoveFailure[] = [];
  for (const record of shelf.records.toSorted((a, b) => a.acquiredAt.getTime() - b.acquiredAt.getTime())) {
    const copied = await catalogue.copy(record, { keepShelfMark: true, keepProvenance: true });
    if (!copied.ok) {
      failures.push({ record, reason: copied.reason });
    }
  }
  return failures;
}
\`\`\`

---

Once Shelf C is done, tell me and I'll record it on your timeline.`;

const LONG_MESSAGE = `${PROSE.repeat(NOTES)}And here is a link I keep losing: ${LONG_URL} and the word that breaks every layout: ${LONG_WORD}.`;

const SHELF_TASK =
  "Catalogue the next shelf: count its volumes, note their condition, photograph the spines and update the spreadsheet with anything that has moved since the last count, then box it ";

// The crowded account's main quest's tasks: many, at the length limit,
// with long unbroken words and addresses.
const CROWDED_TASKS: readonly string[] = [
  textOfLength(
    "Box the fragile folios on shelf D in acid-free card, label each box with its shelf mark, and photograph the labels. ",
    TASK_MAX,
  ),
  `Check the scan at ${LONG_URL}`.slice(0, TASK_MAX),
  `Ask about ${LONG_WORD}`,
  ...Array.from(
    { length: PANEL_TASKS + COMMAND_TASKS - CROWDED_SPECIAL_TASKS },
    (_, index) =>
      growingText(
        `${index + 1}. ${SHELF_TASK}`,
        TASK_MAX,
        index + 1,
        PANEL_TASKS,
      ),
  ),
];

const CROWDED_RITES: readonly ReviewRite[] = Array.from(
  { length: RITES },
  (_, index) => ({
    name: growingText(
      `Rite ${index + 1}: capture every passing thought about the archive move before it is lost `,
      RITE_NAME_MAX,
      RITES - index,
      RITES,
    ),
    replies: Array.from(
      { length: RITE_REPLIES_MAX },
      (__, reply) => `Saved, reply ${reply + 1}.`,
    ),
  }),
);

const CROWDED_MAIN: ReviewQuest = {
  from: "do",
  name: textOfLength(
    "Move the whole family archive into the new climate-controlled store room ",
    QUEST_NAME_MAX,
  ),
  why: textOfLength(PROSE, NOTE_MAX),
  steps: [
    { kind: "tasks", texts: CROWDED_TASKS.slice(0, PANEL_TASKS) },
    ...CROWDED_TASKS.slice(PANEL_TASKS).map(
      (text): QuestStep => ({ kind: "task", text }),
    ),
    ...DONE_TASKS.map((task): QuestStep => ({ kind: "check", number: task })),
    ...Array.from(
      { length: PLAIN_ITEMS },
      (_, index): QuestStep => ({
        kind: "plain",
        text: `${growingText(`Option ${index + 1}: ${PROSE}`, PLAIN_MAX, index + 1, PLAIN_ITEMS)}`,
      }),
    ),
    { kind: "plain", text: `${LONG_WORD}${LONG_WORD}` },
    ...Array.from(
      { length: NOTES },
      (_, index): Extract<QuestStep, { kind: "note" }> => ({
        kind: "note",
        text: growingText(
          `Note ${index + 1}. ${PROSE}`,
          NOTE_MAX,
          index + 1,
          NOTES,
        ),
      }),
    ),
    { kind: "note", text: `${LONG_URL} ${LONG_WORD}` },
    { kind: "perform", name: "Brainstorm" },
    { kind: "send", text: LONG_MESSAGE },
    {
      kind: "reply",
      message: LONG_MESSAGE,
      reply: `Recorded. ${PROSE.repeat(COMMAND_TASKS)}`,
    },
    {
      kind: "reply",
      message: "Where are we with the archive? Give me the full picture.",
      reply: MARKDOWN_REPLY,
    },
  ],
};

const STARTING_POINTS: readonly ReviewQuest["from"][] = ["learn", "make", "do"];

// Quests with nothing in them but their name, to make the list long: names
// from a third of the limit to all of it, and one long word.
const CROWDED_LIST: readonly ReviewQuest[] = Array.from(
  { length: LISTED_QUESTS },
  (_, index): ReviewQuest => {
    const steps: QuestStep[] = [];
    if (index % STATUS_CYCLE === COMPLETED_IN_CYCLE) {
      steps.push({ kind: "status", status: "completed" });
    }
    if (index % STATUS_CYCLE === ABANDONED_IN_CYCLE) {
      steps.push({ kind: "status", status: "abandoned" });
    }
    let name = growingText(
      `Quest ${index + 1}: learn enough bookbinding to repair the loose boards on shelf B `,
      QUEST_NAME_MAX,
      index + LISTED_QUESTS / 2,
      LISTED_QUESTS + LISTED_QUESTS / 2,
    );
    if (index === LONG_WORD_QUEST) {
      name = textOfLength(`${LONG_WORD} archives`, QUEST_NAME_MAX);
    }
    return {
      from: STARTING_POINTS[index % STARTING_POINTS.length] ?? "do",
      name,
      why: "",
      steps,
    };
  },
);

const CROWDED: ReviewContent = {
  rites: CROWDED_RITES,
  quests: [...CROWDED_LIST, CROWDED_MAIN],
};

export type { QuestStep, ReviewContent, ReviewQuest, ReviewRite };
export { CROWDED, TYPICAL };
