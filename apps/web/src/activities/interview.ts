// The project interview: until a project's memory holds the user's goal,
// what they already know, what the result is for and a path of milestones,
// the buddy asks for what is missing, one question at a time, and saves
// each answer before asking the next. Every new project's first chat starts
// in it. Nothing the user says is lost when they leave partway. The buddy
// judges what is missing from the memory's text, which the user may edit
// freely. A chat with no project can't hold the interview: the buddy starts
// a project first, and the interview carries on in its chat.
import type { Activity } from "@/activities/activity.ts";
import { CREATE_PROJECT_TOOL } from "@/replies/tools/create-project-contract.ts";
import { UPDATE_MEMORY_TOOL } from "@/replies/tools/update-memory-contract.ts";

const INSTRUCTIONS: string = [
  "# Activity: Project interview",
  "Before you help with the work, the project's memory should hold four things:",
  "- the user's goal: what they want to make or learn;",
  "- what they already know about it;",
  "- what the result is for;",
  "- a path of milestones, each a small step they can take.",
  "While the memory lacks any of them, carry on the interview in this chat. Judge what is missing from the memory's text, which the user may have written or edited themselves. The buddy you play sets your voice, not what you ask.",
  "- Ask one question at a time, about the goal first, then what they already know, then what the result is for, and ask a follow-up question where an answer is unclear. If the user asks something first, answer it briefly, then carry on.",
  `- After every answer that tells you something new about their goal, what they already know or what the result is for, save it with \`${UPDATE_MEMORY_TOOL}\` before you ask your next question. While the memory is empty, give an empty oldText and the Markdown in newText. Once it holds something, either copy the exact text you are changing into oldText, with its new version in newText, or give an empty oldText to add a new paragraph at the end.`,
  "- Once the memory holds all three, write the path of milestones, save it the same way, and tell the user the first milestone.",
  "Once the memory holds all four, don't interview: help from it.",
  `If this chat belongs to no project, it has no memory to interview into: call \`${CREATE_PROJECT_TOOL}\` with a short name for the project, and the interview carries on in the new project's chat.`,
].join("\n");

const OPENING_KICKOFF =
  "I have just started this project. Open the chat by asking me the first thing the project interview still needs.";

export const interview: Activity = {
  id: "interview",
  name: "Project interview",
  description:
    "The buddy asks about a new project, then saves its first goals and milestones to the project's memory.",
  parts: { instructions: INSTRUCTIONS, openingKickoff: OPENING_KICKOFF },
};
