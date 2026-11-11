// The prompt section that gives every chat in a project the project's
// newest milestones, as the prompt read them when the turn started, between
// tags, so the construct can see what is recorded already, in any of the
// project's chats, and not record it again.
import type { Milestone } from "@/milestones/milestone.ts";
import type { ReplyPromptContext } from "@/replies/system-prompt.ts";

// How many of the project's newest milestones the prompt gives.
const MILESTONES_IN_PROMPT = 10;

// The line the prompt gives while the timeline is empty.
const EMPTY_TIMELINE_PROMPT =
  "The quest's progress timeline is empty: no milestone is recorded yet.";

// The line before the milestones.
const TIMELINE_PROMPT_INTRO = `The newest milestones on the quest's progress timeline, at most ${MILESTONES_IN_PROMPT}, newest first, each with the day it was recorded. They are recorded already, in this conversation or before it: never record any of them again.`;

const TIMELINE_START_TAG = "<progress_timeline>";
const TIMELINE_END_TAG = "</progress_timeline>";

// A milestone as one line: its day, in UTC, and its text.
function milestoneLine({ recordedAt, text }: Milestone): string {
  return `- ${recordedAt.toISOString().slice(0, "YYYY-MM-DD".length)}: ${text}`;
}

// The project's newest milestones, between tags that keep them apart from
// the rest of the prompt, or "" in a standalone chat, which has no project
// and so no timeline.
function milestonesPromptSection({ project }: ReplyPromptContext): string {
  if (project === undefined) {
    return "";
  }
  if (project.milestones.length === 0) {
    return EMPTY_TIMELINE_PROMPT;
  }
  return [
    TIMELINE_PROMPT_INTRO,
    TIMELINE_START_TAG,
    ...project.milestones.map(milestoneLine),
    TIMELINE_END_TAG,
  ].join("\n");
}

export { MILESTONES_IN_PROMPT, milestonesPromptSection };
