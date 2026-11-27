import { z } from "zod";

const MAX_RITE_NAME = 80;
const MAX_REPLY = 5000;
const MAX_REPLIES = 50;
const LINE_BREAK = /[\r\n\u2028\u2029]/u;
const PLACEHOLDER = /\{(?<key>rite|list|text|user)\}/gu;

// How a rite picks each reply: down the list in order, at random with
// repeats, or at random without a repeat until every reply has been given.
const REPLY_ORDER = z.enum(["ordered", "random", "random-no-repeats"]);
type ReplyOrder = z.infer<typeof REPLY_ORDER>;

// A rite's fields, before the rule that a rite which concludes has a final
// reply. A definition that leaves out how it replies picks at random and
// loops.
const RITE_FIELDS = z.object({
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
  order: REPLY_ORDER.default("random"),
  // Whether the rite starts its replies again once it has given as many as
  // it has; otherwise it concludes with its final reply.
  loop: z.boolean().default(true),
  finalReply: z.string().trim().max(MAX_REPLY).default(""),
});

// Refuses a rite that concludes without a final reply, at finalReply.
function checkFinalReply(
  rite: { readonly loop: boolean; readonly finalReply: string },
  context: z.RefinementCtx,
): void {
  if (!rite.loop && rite.finalReply === "") {
    context.addIssue({
      code: "custom",
      path: ["finalReply"],
      message: "A rite that concludes needs a final reply",
    });
  }
}

const RITE_DEFINITION = RITE_FIELDS.superRefine(checkFinalReply);

type RiteDefinition = z.infer<typeof RITE_DEFINITION>;

// The reply a rite gives a message: one of its replies, by its place in the
// list, or its final reply, which concludes the performance.
const REPLY_CHOICE = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("reply"), index: z.int().min(0) }),
  z.object({ kind: z.literal("final") }),
]);
type ReplyChoice = z.infer<typeof REPLY_CHOICE>;

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
    order: "random",
    loop: true,
    finalReply: "",
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
    order: "random-no-repeats",
    loop: true,
    finalReply: "",
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

// The replies the rite could give next, by place, after the replies it has
// given in this performance, in the order it gave them; none once a rite
// that concludes has given as many as it has, when its final reply is due.
function repliesDue(
  rite: RiteDefinition,
  given: readonly number[],
): readonly number[] {
  const count = rite.replies.length;
  const all = rite.replies.map((_reply, index) => index);
  if (!rite.loop && given.length >= count) {
    return [];
  }
  if (rite.order === "ordered") {
    return [given.length % count];
  }
  if (rite.order === "random") {
    return all;
  }
  const thisRound = new Set(given.slice(given.length - (given.length % count)));
  const unused = all.filter((index) => !thisRound.has(index));
  if (unused.length === 0) {
    return all;
  }
  return unused;
}

// The rite's choice of reply to the next message, after the replies it has
// given in this performance, in the order it gave them. random returns a
// number from 0 up to 1, as Math.random does. A proposed choice, such as the
// one the browser made, stands when the rite could have made it; otherwise
// the rite chooses afresh.
function nextReply(
  rite: RiteDefinition,
  given: readonly number[],
  random: () => number,
  proposed?: ReplyChoice,
): ReplyChoice {
  const due = repliesDue(rite, given);
  if (due.length === 0) {
    return { kind: "final" };
  }
  if (proposed?.kind === "reply" && due.includes(proposed.index)) {
    return proposed;
  }
  const index = due[Math.floor(random() * due.length)];
  if (index === undefined) {
    throw new Error("A rite needs a reply");
  }
  return { kind: "reply", index };
}

// The chosen reply's text for the message. It fills {rite}, {list}, {text}
// and {user}.
function riteReply(
  rite: RiteDefinition,
  choice: ReplyChoice,
  list: { readonly name: string },
  message: { readonly text: string; readonly author: string },
): string {
  let template = rite.finalReply;
  if (choice.kind === "reply") {
    template = rite.replies[choice.index] ?? "";
  }
  return fill(template, {
    rite: rite.name,
    list: list.name,
    text: message.text,
    user: message.author,
  });
}

export type { ReplyChoice, ReplyOrder, Rite, RiteDefinition };
export {
  BUILT_IN_RITES,
  checkFinalReply,
  MAX_REPLIES,
  MAX_REPLY,
  MAX_RITE_NAME,
  nextReply,
  REPLY_CHOICE,
  REPLY_ORDER,
  RITE_DEFINITION,
  RITE_FIELDS,
  riteFirstMessage,
  riteReply,
};
