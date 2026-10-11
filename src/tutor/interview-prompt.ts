// The project interview: while a project's memory is empty, every chat in it
// starts by finding out what the user wants from the project, and ends the
// interview by saving their goals and a path of milestones to the memory. An
// interview left unfinished carries on in the project's next chat.
import type { ModelMessage, UserModelMessage } from "ai";
import { isMemoryEmpty } from "@/memory/memory.ts";
import type { TutorPromptContext } from "@/tutor/system-prompt.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

const INTERVIEW_PROMPT: string = [
  "# The project interview",
  "Nothing is saved about this project yet, so interview the user before you teach. Find out:",
  "- their goal: what they want to make or learn;",
  "- their skill level with Blender;",
  "- what the result is for;",
  "- any limits on their time or hardware.",
  "Ask one or two questions at a time and ask follow-up questions where an answer is unclear. If the conversation so far holds no question from you, start with your first question. If the user asks something first, answer it briefly, then start the interview. Your persona sets your voice, not what you ask.",
  `When you know enough, sum up their goals and a path of milestones, each a small step they can do in Blender. Save them with \`${UPDATE_MEMORY_TOOL}\`, with an empty oldText and the goals and milestones as Markdown in newText. Then tell them the first milestone.`,
].join("\n");

// The user's side of the conversation's start, which the model sees and the
// user never does. Claude needs a conversation to begin with the user, and an
// interview chat begins with the tutor's opening question.
const INTERVIEW_KICKOFF: UserModelMessage = {
  role: "user",
  content:
    "I have just started this project. Please begin the interview with your first question.",
};

// The interview's instructions while the chat's project memory is empty, and
// nothing once it holds something.
function interviewPromptSection({ memory }: TutorPromptContext): string {
  if (isMemoryEmpty(memory)) {
    return INTERVIEW_PROMPT;
  }
  return "";
}

// The conversation to send the model: messages, after the interview's
// kickoff unless they start with a message from the user.
function withInterviewKickoff(
  messages: readonly ModelMessage[],
): ModelMessage[] {
  const [first] = messages;
  if (first?.role === "user") {
    return [...messages];
  }
  return [INTERVIEW_KICKOFF, ...messages];
}

export { interviewPromptSection, withInterviewKickoff };
