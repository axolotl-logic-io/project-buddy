// What the create_quest tool takes and returns, shared by the tool and the
// part that shows the new quest in the chat. It imports nothing from the
// server, because the part in the browser imports it too.

import { z } from "zod";
import { CHAT_ID, QUEST_ID } from "@/ids.ts";
import { QUEST_NAME, QUEST_NAME_MAX_LENGTH } from "@/quests/quest-name.ts";

const CREATE_QUEST_TOOL = "create_quest";

// The tool's description.
const CREATE_QUEST_DESCRIPTION = [
  "Offer to turn this Chat into a quest. It creates nothing: the app shows the user Turn Chat into a quest with your name and summary filled in, and the user edits, picks a construct and confirms it there, or doesn't.",
  "Call it only when the user asks for a new quest, or asks to make the idea you talked through a quest.",
  "Nothing said here moves into the quest except the starting context the user confirms. Refer to the offer without saying above or below: the app chooses its position.",
  `The name has at most ${QUEST_NAME_MAX_LENGTH} characters; if the user's name is longer, suggest a shorter one.`,
  "A proposed result awaits the user's confirmation; do not say a quest exists. The summary must not claim planned milestones are completed.",
].join(" ");

const TRANSFER_SUMMARY_MAX = 12_000;
const TRANSFER_MOTIVATION_MAX = 4000;

const CREATE_QUEST_INPUT = z.object({
  summary: z
    .string()
    .max(TRANSFER_SUMMARY_MAX)
    .default("")
    .describe(
      "A concise summary of the idea, decisions and next steps for the new conversation. Do not mark planned work as completed milestones. Include only relevant context the user will review.",
    ),
  motivation: z
    .string()
    .max(TRANSFER_MOTIVATION_MAX)
    .default("")
    .describe("Why the user wants this quest, only if they stated it."),
  name: QUEST_NAME.describe(
    "The quest's name, short and as the user would call it.",
  ),
});

// The quest the tool offers: its suggested name, summary and motivation,
// for the user to confirm in Turn Chat into a quest. Results saved before
// that carry a proposalId, or say what the tool did then: created a quest,
// or none because Claude was unavailable or the user was out of gold
// (quotaUsedUp, from before gold, reads as outOfGold).
const CREATE_QUEST_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("proposed"),
    proposalId: z.uuid().optional(),
    name: z.string(),
    summary: z.string(),
    motivation: z.string(),
  }),
  z.object({
    status: z.literal("created"),
    questId: QUEST_ID,
    name: z.string(),
    interviewChatId: CHAT_ID,
  }),
  z.object({ status: z.literal("claudeUnavailable") }),
  z.object({ status: z.literal("outOfGold") }),
  z.object({ status: z.literal("quotaUsedUp"), resetsOn: z.iso.datetime() }),
]);

type CreateQuestInput = z.infer<typeof CREATE_QUEST_INPUT>;
type CreateQuestOutput = z.infer<typeof CREATE_QUEST_OUTPUT>;

// The starting context an offer suggests: its summary, then the motivation, if any,
// under its own heading.
function offeredContext({
  summary,
  motivation,
}: Pick<CreateQuestInput, "summary" | "motivation">): string {
  if (motivation === "") {
    return summary;
  }
  return `${summary}\n\n## Motivation\n${motivation}`;
}

export type { CreateQuestInput, CreateQuestOutput };
export {
  CREATE_QUEST_DESCRIPTION,
  CREATE_QUEST_INPUT,
  CREATE_QUEST_OUTPUT,
  CREATE_QUEST_TOOL,
  offeredContext,
  TRANSFER_MOTIVATION_MAX,
  TRANSFER_SUMMARY_MAX,
};
