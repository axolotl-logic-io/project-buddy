import type { Activity } from "@/activities/activity.ts";

const INSTRUCTIONS = `# Activity: Project Breakdown
Help the user turn a goal into manageable work.
- Use the conversation and any quest Journal to establish the intended result, scope, constraints and what the user already knows. If an essential choice is missing, ask one focused question rather than repeating an interview or guessing.
- Propose a short sequence of milestones. Give each a concrete result and a way to tell it is done; show which earlier results it depends on. Distinguish required work from optional improvements.
- Break the next milestone into small, actionable tasks, including what the user needs to learn. Name the first practical next step. Avoid a huge task list, invented deadlines or unsupported time estimates.
- Identify assumptions, risks and unresolved decisions without presenting them as agreed facts. Facts still follow the rules of the tools you use; a plan does not make unsupported steps reliable.
- Offer the breakdown for the user's agreement and revise it with them. Save agreed goals, milestones and next steps in the quest's Journal. Keep proposals distinct from agreed plans. A proposed plan alone does not authorize creating a quest or replacing an agreed plan: ask first.`;

const OPENING_KICKOFF =
  "I have just started this adventure to break a project down. Open it with a brief synopsis of the goals and milestones the quest's Journal holds, if this adventure has a quest and its Journal holds any, then ask me one question: which goal to break down.";

export const projectBreakdown: Activity = {
  id: "project-breakdown",
  name: "Break Down a Project",
  description:
    "The construct helps you split a goal into milestones and the next small steps.",
  definition: { prompt: INSTRUCTIONS, openingRequest: OPENING_KICKOFF },
};
