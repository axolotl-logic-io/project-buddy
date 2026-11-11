// What the create_project tool takes and returns, shared by the tool and the
// part that shows the new project in the chat. It imports nothing from the
// server, because the part in the browser imports it too.
import { z } from "zod";
import { CHAT_ID, PROJECT_ID } from "@/ids.ts";
import {
  PROJECT_NAME,
  PROJECT_NAME_MAX_LENGTH,
} from "@/projects/project-name.ts";

const CREATE_PROJECT_TOOL = "create_project";

// The tool's description.
const CREATE_PROJECT_DESCRIPTION = [
  "Offer to turn this Chat into a quest. It creates nothing: the app shows the user Turn Chat into a quest with your name and summary filled in, and the user edits, picks a construct and confirms it there, or doesn't.",
  "Call it only when the user asks for a new quest, or asks to make the idea you talked through a quest.",
  "Nothing said here moves into the quest except the Journal the user confirms. Refer to the offer without saying above or below: the app chooses its position.",
  `The name has at most ${PROJECT_NAME_MAX_LENGTH} characters; if the user's name is longer, suggest a shorter one.`,
  "A proposed result awaits the user's confirmation; do not say a quest exists. The summary must not claim planned milestones are completed.",
].join(" ");

const TRANSFER_SUMMARY_MAX = 12_000;
const TRANSFER_MOTIVATION_MAX = 4000;

const CREATE_PROJECT_INPUT = z.object({
  summary: z
    .string()
    .max(TRANSFER_SUMMARY_MAX)
    .default("")
    .describe(
      "A concise summary of the idea, decisions and next steps for the new Journal. Do not mark planned work as completed milestones. Include only relevant context the user will review.",
    ),
  motivation: z
    .string()
    .max(TRANSFER_MOTIVATION_MAX)
    .default("")
    .describe("Why the user wants this quest, only if they stated it."),
  name: PROJECT_NAME.describe(
    "The quest's name, short and as the user would call it.",
  ),
});

// The quest the tool offers: its suggested name, summary and motivation,
// for the user to confirm in Turn Chat into a quest. Results saved before
// that carry a proposalId, or say what the tool did then: created a quest,
// or none because Claude was unavailable or the user was out of gold
// (quotaUsedUp, from before gold, reads as outOfGold).
const CREATE_PROJECT_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("proposed"),
    proposalId: z.uuid().optional(),
    name: z.string(),
    summary: z.string(),
    motivation: z.string(),
  }),
  z.object({
    status: z.literal("created"),
    projectId: PROJECT_ID,
    name: z.string(),
    interviewChatId: CHAT_ID,
  }),
  z.object({ status: z.literal("claudeUnavailable") }),
  z.object({ status: z.literal("outOfGold") }),
  z.object({ status: z.literal("quotaUsedUp"), resetsOn: z.iso.datetime() }),
]);

type CreateProjectInput = z.infer<typeof CREATE_PROJECT_INPUT>;
type CreateProjectOutput = z.infer<typeof CREATE_PROJECT_OUTPUT>;

// The Journal an offer suggests: its summary, then the motivation, if any,
// under its own heading.
function offeredJournal({
  summary,
  motivation,
}: Pick<CreateProjectInput, "summary" | "motivation">): string {
  if (motivation === "") {
    return summary;
  }
  return `${summary}\n\n## Motivation\n${motivation}`;
}

export type { CreateProjectInput, CreateProjectOutput };
export {
  CREATE_PROJECT_DESCRIPTION,
  CREATE_PROJECT_INPUT,
  CREATE_PROJECT_OUTPUT,
  CREATE_PROJECT_TOOL,
  offeredJournal,
  TRANSFER_MOTIVATION_MAX,
  TRANSFER_SUMMARY_MAX,
};
