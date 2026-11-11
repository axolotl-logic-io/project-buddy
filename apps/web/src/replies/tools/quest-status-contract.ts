import { z } from "zod";
import { QUEST_STATUS, STATUS_APPROVAL } from "@/projects/quest-status.ts";

const QUEST_STATUS_TOOL = "request_quest_status";
const QUEST_STATUS_INPUT = z.object({
  status: QUEST_STATUS.describe(
    "The proposed quest status: completed, abandoned, or active to restore it.",
  ),
});
const QUEST_STATUS_OUTPUT = z.object({
  status: z.literal("awaiting-approval"),
  approval: STATUS_APPROVAL,
});
const QUEST_STATUS_DESCRIPTION = [
  "Propose completing, abandoning or restoring this conversation's quest. This only creates an approval card; it does not change status.",
  "Verify the user's intent first: ask whether they want the entire quest marked completed or abandoned, or restored, rather than assuming a finished milestone or frustration ends the quest.",
  "Explain the exact change and ask the user to confirm it on the approval card. Even a direct request must be confirmed on the card before the change executes.",
  "Only the quest owner may request or approve a change. All quest contents stay available. Completed and abandoned quests stop check-ins; restoring does not resume check-ins automatically.",
  "Never claim the change has happened when this tool returns awaiting-approval. Do not repeat a pending proposal unless the user asks or the quest status has changed.",
].join(" ");

export {
  QUEST_STATUS_DESCRIPTION,
  QUEST_STATUS_INPUT,
  QUEST_STATUS_OUTPUT,
  QUEST_STATUS_TOOL,
};
