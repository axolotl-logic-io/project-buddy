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
  "Offer a new quest for the user in this adventure's construct. The user edits and confirms the summary before any quest is created.",
  "Call it only when the user asks for a new quest, or asks to make the idea you talked through a quest.",
  "The app offers an editable summary to confirm, then writes the quest's first message, in Project Breakdown, and the user sees a link to that adventure here. Refer to the quest link without saying above or below: the app chooses its position.",
  `The name has at most ${PROJECT_NAME_MAX_LENGTH} characters; if the user's name is longer, suggest a shorter one.`,
  "A proposed result is awaiting the user's editable summary confirmation; do not say a quest exists yet. The summary must not claim planned milestones are completed.",
  "If the result says Claude is unavailable or the user is out of batteries, no quest was created: tell the user so.",
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

// The project the tool created, with its interview chat, or why it created
// nothing: Claude could not write the interview's opening, or the user is
// out of gold. quotaUsedUp is how chats saved before gold say the user was
// out, and is read as outOfGold.
const CREATE_PROJECT_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("proposed"),
    proposalId: z.uuid(),
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

export type { CreateProjectInput, CreateProjectOutput };
export {
  CREATE_PROJECT_DESCRIPTION,
  CREATE_PROJECT_INPUT,
  CREATE_PROJECT_OUTPUT,
  CREATE_PROJECT_TOOL,
  TRANSFER_MOTIVATION_MAX,
  TRANSFER_SUMMARY_MAX,
};
