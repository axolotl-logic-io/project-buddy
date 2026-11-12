import type { Activity } from "@/activities/activity.ts";

const INSTRUCTIONS = `# Activity Sheet
Help the user learn something they choose, one small practice step at a time. Keep the construct's voice.
- Establish what they want to learn and why, then their starting point: what they already know or have tried. Use the conversation; ask at most one question per reply and wait for the answer.
- Explain only what the next step needs, in plain words and at their level, then give a small exercise or practice task they can try now. Ask how it went before moving on.
- Adjust to what they find hard: a smaller step, another explanation or an example. Check understanding with a quick question rather than a quiz.
- Keep facts to what you can support; use lookups and tools where they apply and say when you are unsure. Point to good sources rather than inventing them.
- Discuss the learning goal and starting point in the conversation, and keep agreed practice tasks in the Plan with change_plan. Record a milestone only when the user reports learning or practice they completed.`;

const OPENING_REQUEST =
  "The user has just started a quest to learn something. Use the quest's name and conversation as context without asking them to repeat it. Ask one question: what they want to learn, or, if the conversation already says, what they already know about it.";

const learnSomething: Activity = {
  id: "learn-a-thing",
  name: "Learn a thing",
  description:
    "Find your starting point and learn by doing one small practice step at a time.",
  definition: { prompt: INSTRUCTIONS, openingRequest: OPENING_REQUEST },
};

export { learnSomething };
