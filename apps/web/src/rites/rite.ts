import { z } from "zod";
import type { SpaceWords } from "@/spaces/space.ts";

const MAX_RITE_NAME = 80;
const MAX_REPLY = 5000;
const MAX_REPLIES = 50;
const LINE_BREAK = /[\r\n\u2028\u2029]/u;
const PLACEHOLDER = /\{(?<key>rite|space|singular|plural|text|user)\}/gu;

const RITE_DEFINITION = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(MAX_RITE_NAME)
    .refine((name) => !LINE_BREAK.test(name)),
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
    replies: ["Added a {singular} to {space}.", "Saved to {space}."],
  },
  {
    id: "brainstorm",
    source: "built-in",
    name: "Brainstorm",
    replies: [
      "What else comes to mind?",
      "What would you try if you had twice as much time?",
      "What is the smallest version you could try?",
      "What would you change if you had to start over?",
    ],
  },
];

function riteReply(
  rite: RiteDefinition,
  space: SpaceWords,
  conjuration: { readonly text: string; readonly author: string },
): string {
  const template =
    rite.replies[Math.floor(Math.random() * rite.replies.length)];
  if (template === undefined) {
    throw new Error("A rite needs a reply");
  }
  const words: Partial<Record<string, string>> = {
    rite: rite.name,
    space: space.name,
    singular: space.singular,
    plural: space.plural,
    text: conjuration.text,
    user: conjuration.author,
  };
  return template.replace(PLACEHOLDER, (match: string, key: string): string => {
    const { [key]: value } = words;
    return value ?? match;
  });
}

export type { Rite, RiteDefinition };
export {
  BUILT_IN_RITES,
  MAX_REPLIES,
  MAX_REPLY,
  MAX_RITE_NAME,
  RITE_DEFINITION,
  riteReply,
};
