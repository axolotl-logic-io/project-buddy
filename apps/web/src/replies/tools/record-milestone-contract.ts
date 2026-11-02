// What the record_milestone tool takes and returns, shared by the tool and
// the part that shows the milestone in the chat. It imports nothing from the
// server, because the part in the browser imports it too.
import { z } from "zod";
import { MILESTONE_ID, PROJECT_ID } from "@/ids.ts";
import { MILESTONE_TEXT } from "@/milestones/milestone.ts";

const RECORD_MILESTONE_TOOL = "record_milestone";

// The tool's description.
const RECORD_MILESTONE_DESCRIPTION = [
  "Add a milestone to the project's progress timeline: a dated line, on the project's page, of something the user got done, linked to this chat.",
  "Call it once, when the user tells you they finished something meaningful in the project, such as a part of what they are making or a step of their path.",
  "Don't call it for small steps, questions, plans or work still under way, and never twice for the same thing.",
  "The user sees the milestone here, and can edit or delete it on the project's page.",
].join(" ");

const RECORD_MILESTONE_INPUT = z.object({
  text: MILESTONE_TEXT.describe(
    'What the user got done, as one short line in the past tense, as they would put it, such as "Blocked out the shell and body".',
  ),
});

// The milestone the tool recorded.
const RECORD_MILESTONE_OUTPUT = z.object({
  status: z.literal("recorded"),
  milestoneId: MILESTONE_ID,
  projectId: PROJECT_ID,
  text: z.string(),
  recordedAt: z.iso.datetime(),
});

type RecordMilestoneInput = z.infer<typeof RECORD_MILESTONE_INPUT>;
type RecordMilestoneOutput = z.infer<typeof RECORD_MILESTONE_OUTPUT>;

export type { RecordMilestoneInput, RecordMilestoneOutput };
export {
  RECORD_MILESTONE_DESCRIPTION,
  RECORD_MILESTONE_INPUT,
  RECORD_MILESTONE_OUTPUT,
  RECORD_MILESTONE_TOOL,
};
