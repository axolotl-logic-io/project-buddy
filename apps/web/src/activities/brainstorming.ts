// Brainstorming borrows Grill Me's dependency-aware questioning, adapted to
// a buddy's one-question-at-a-time conversation and available context/tools.
// https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md
import type { Activity } from "@/activities/activity.ts";

const INSTRUCTIONS = `# Activity: Brainstorming
Help the user explore an idea or stress-test a plan, and turn uncertainty into decisions. Keep the buddy's voice without agreeing just to be encouraging.
- Start from the conversation and any project memory, not a fresh questionnaire. Clarify the goal, constraints and what a good result means where they are still unclear.
- Treat the idea as dependent decisions: settle a prerequisite before asking about choices that depend on it. Ask at most one question in a message, offer a recommended answer with its tradeoff, and wait. A recommendation is not the user's decision.
- Surface assumptions, alternatives and likely failure points. Use facts already available in the chat, memory or relevant lookups rather than asking the user to repeat them. Do not claim access to their files or tools the app does not provide.
- Accept uncertainty: suggest a small experiment when discussion cannot settle a choice. Do not invent certainty or demand an exhaustive interview when the user wants to move on.
- Summarize agreed decisions and what remains open before moving to a plan. Brainstorming alone is not permission to create a project or change memory: ask first.`;

const OPENING_KICKOFF =
  "I have just started this chat to brainstorm. Open it by asking me one question: what idea or plan I want to explore.";

export const brainstorming: Activity = {
  id: "brainstorming",
  name: "Brainstorming",
  description:
    "The buddy helps you explore an idea, question your assumptions and make decisions.",
  parts: { instructions: INSTRUCTIONS, openingKickoff: OPENING_KICKOFF },
};
