import { z } from "zod";

const MAX_RITE_NAME = 80;
const MAX_REPLY = 5000;
const MAX_REPLIES = 50;
const LINE_BREAK = /[\r\n\u2028\u2029]/u;
const PLACEHOLDER = /\{(?<key>rite|list|text|user)\}/gu;

const RITE_DEFINITION = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(MAX_RITE_NAME)
    .refine((name) => !LINE_BREAK.test(name)),
  firstMessage: z.string().trim().min(1).max(MAX_REPLY),
  replies: z
    .array(z.string().trim().min(1).max(MAX_REPLY))
    .min(1)
    .max(MAX_REPLIES),
});

type RiteDefinition = z.infer<typeof RITE_DEFINITION>;

interface Rite extends RiteDefinition {
  readonly id: string;
  readonly updatedAt?: Date;
  // When the user forgot their own rite; absent while it is active.
  readonly forgottenAt?: Date;
  readonly source: "built-in" | "own";
}

const BUILT_IN_RITES: readonly Rite[] = [
  {
    id: "capture",
    source: "built-in",
    name: "Capture",
    firstMessage: "Send me anything for {list}, and I’ll add it.",
    replies: ["Added to {list}.", "Saved to {list}."],
  },
  {
    id: "brainstorm",
    source: "built-in",
    name: "Brainstorm",
    firstMessage: "Let’s brainstorm for {list}. What comes to mind first?",
    replies: [
      "What else comes to mind?",
      "What would you try if you had twice as much time?",
      "What is the smallest version you could try?",
      "What would you change if you had to start over?",
    ],
  },
];

// Fills a template's placeholders from the words; a placeholder with no
// word stays as written.
function fill(
  template: string,
  words: Partial<Record<string, string>>,
): string {
  return template.replace(PLACEHOLDER, (match: string, key: string): string => {
    const { [key]: value } = words;
    return value ?? match;
  });
}

// The rite's first message in a performance on the list, before anyone has
// written. It fills {rite} and {list}.
function riteFirstMessage(
  rite: RiteDefinition,
  list: { readonly name: string },
): string {
  return fill(rite.firstMessage, { rite: rite.name, list: list.name });
}

function riteReply(
  rite: RiteDefinition,
  list: { readonly name: string },
  message: { readonly text: string; readonly author: string },
): string {
  const template =
    rite.replies[Math.floor(Math.random() * rite.replies.length)];
  if (template === undefined) {
    throw new Error("A rite needs a reply");
  }
  return fill(template, {
    rite: rite.name,
    list: list.name,
    text: message.text,
    user: message.author,
  });
}

export type { Rite, RiteDefinition };
export {
  BUILT_IN_RITES,
  MAX_REPLIES,
  MAX_REPLY,
  MAX_RITE_NAME,
  RITE_DEFINITION,
  riteFirstMessage,
  riteReply,
};
