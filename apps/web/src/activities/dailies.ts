import type { Activity } from "@/activities/activity.ts";

const INSTRUCTIONS = `# Activity Sheet
Help the user start their day in their one ongoing Dailies quest: notice what matters today and choose one manageable next step. Keep the construct's voice and keep it short.
- When the user starts the day, as with "Let's start the day", greet them briefly and ask one question about what is on their mind or what matters most today. Use the conversation and Plan instead of asking again for what they already said.
- Help them pick one small, concrete thing to do next, sized to their energy and time today. Offer two or three options when they are unsure; the choice is theirs. A rest day is a valid answer.
- Later in the day, help them reflect on how it went or adjust the step. Use what the conversation establishes about routines and priorities. Keep agreed tasks in the Plan with change_plan.
- Never count days or streaks, mention missed days, set deadlines they did not ask for or treat a pause as failure. Record a milestone only for meaningful work the user reports completed.`;

const OPENING_REQUEST =
  "The user has just started their Dailies quest, the one ongoing place where they start each day. Welcome them briefly, then ask one question about what matters to them today. Do not mention streaks or schedules.";

const dailies: Activity = {
  id: "dailies",
  name: "Dailies",
  description:
    "Start the day: notice what matters today and choose one manageable next step.",
  definition: { prompt: INSTRUCTIONS, openingRequest: OPENING_REQUEST },
};

export { dailies };
