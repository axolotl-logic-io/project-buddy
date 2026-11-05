import type { Activity } from "@/activities/activity.ts";
import { isMemoryEmpty, type Memory } from "@/memory/memory.ts";
import { CREATE_PROJECT_TOOL } from "@/replies/tools/create-project-contract.ts";
import { UPDATE_MEMORY_TOOL } from "@/replies/tools/update-memory-contract.ts";

const INSTRUCTIONS: string = [
  "# Activity: Quest interview",
  "Before you help with the work, the quest's memory should hold four things:",
  "- the user's goal: what they want to make or learn;",
  "- what they already know about it;",
  "- what the result is for;",
  "- a path of milestones, each a small step they can take.",
  "While the memory lacks any of them, carry on the interview in this chat. Judge what is missing from the memory's text, which the user may have written or edited themselves. The buddy you play sets your voice, not what you ask.",
  "- Ask one question at a time, about the goal first, then what they already know, then what the result is for, and ask a follow-up question where an answer is unclear. If the user asks something first, answer it briefly, then carry on.",
  `- After every answer that tells you something new about their goal, what they already know or what the result is for, save it with \`${UPDATE_MEMORY_TOOL}\` before you ask your next question. While the memory is empty, give an empty oldText and the Markdown in newText. Once it holds something, either copy the exact text you are changing into oldText, with its new version in newText, or give an empty oldText to add a new paragraph at the end.`,
  "- Once the memory holds all three, write the path of milestones, save it the same way, and tell the user the first milestone.",
  "Once the memory holds all four, don't interview: help from it.",
  `If this chat belongs to no quest, it has no memory to interview into: call \`${CREATE_PROJECT_TOOL}\` with a short name for the quest, and the interview carries on in the new quest's chat.`,
].join("\n");

const OPENING_KICKOFF =
  "I have just started this quest. Open the chat by asking me the first thing the quest interview still needs.";

const interview: Activity = {
  id: "interview",
  name: "Quest interview",
  description:
    "The buddy asks about the quest’s goals and milestones, completing or revisiting what is in its memory.",
  definition: { prompt: INSTRUCTIONS, openingRequest: OPENING_KICKOFF },
};

const REVISIT_INTERVIEW =
  "Revisit this quest’s interview. Briefly summarize the goals and next step already in its memory, then ask one question about what is missing or what the user wants to revise. Do not treat it as a new quest or discard existing memory.";

const EMPTY_INTERVIEW =
  "This quest’s memory is empty. Ask me about my goal to begin its interview. Do not assume any existing goals or next step.";

// Choose the opening from what the project actually holds, not its age.
function interviewOpeningRequest(
  memory: Memory,
): typeof EMPTY_INTERVIEW | typeof REVISIT_INTERVIEW {
  if (isMemoryEmpty(memory)) {
    return EMPTY_INTERVIEW;
  }
  return REVISIT_INTERVIEW;
}

function isInterviewOpeningRequest(text: string): boolean {
  return text === EMPTY_INTERVIEW || text === REVISIT_INTERVIEW;
}

export { interview, interviewOpeningRequest, isInterviewOpeningRequest };
