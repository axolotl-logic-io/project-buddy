import type { Activity } from "@/activities/activity.ts";

const interview: Activity = {
  id: "interview",
  name: "Quest interview",
  description:
    "Clarify what the user wants to do and agree on a first small step.",
  definition: {
    prompt:
      "# Activity Sheet\nHelp the user clarify what they want to achieve. Ask one focused question at a time, use what the conversation already establishes, and keep agreed tasks in the Plan with change_plan. Do not require a complete interview before helping.",
    openingRequest:
      "I have just started this quest. Ask one question about what I want to achieve.",
  },
};

export { interview };
