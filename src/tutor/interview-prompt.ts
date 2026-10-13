// The project interview: until a project's memory holds the user's goal,
// their skill level, what the result is for and a path of milestones, every
// chat in the project, in its own persona, asks for what is missing, one
// question at a time, and saves each answer before asking the next. Nothing
// the user says is lost when they leave a chat partway. The tutor judges
// what is missing from the memory's text, which the user may edit freely.
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

// The interview part's default. It sits in the system prompt's cached part:
// the chat's own part gives the memory it is checked against.
const INTERVIEW_PROMPT: string = [
  "# The project interview",
  "Before you teach, the project's memory should hold four things:",
  "- the user's goal: what they want to make or learn;",
  "- their skill level with Blender;",
  "- what the result is for;",
  "- a path of milestones, each a small step they can do in Blender.",
  "While the memory lacks any of them, carry on the interview in this chat, whichever chat it is. Judge what is missing from the memory's text, which the user may have written or edited themselves. Your persona sets your voice, not what you ask.",
  "- Ask one question at a time, about the goal first, then their skill level, then what the result is for, and ask a follow-up question where an answer is unclear. If the user asks something first, answer it briefly, then carry on.",
  `- After every answer that tells you something new about their goal, skill level or what the result is for, save it with \`${UPDATE_MEMORY_TOOL}\` before you ask your next question. While the memory is empty, give an empty oldText and the Markdown in newText. Once it holds something, either copy the exact text you are changing into oldText, with its new version in newText, or give an empty oldText to add a new paragraph at the end.`,
  "- Once the memory holds all three, write the path of milestones, save it the same way, and tell the user the first milestone.",
  "Once the memory holds all four, don't interview: teach from it.",
].join("\n");

export { INTERVIEW_PROMPT };
