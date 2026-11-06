import type { Activity } from "@/activities/activity.ts";

const INSTRUCTIONS = `# Activity: Find something to make
Help the user discover what they want to create and choose a small achievable creative project. Keep the construct's voice. They do not need an idea, an inspiration source or a chosen medium to begin.
- Start from the conversation and any quest Journal. Use what is already known rather than repeating an intake interview. Explore interests, energy, time, available materials or tools, experience and constraints gradually, only as they help the next choice. Ask at most one manageable question per reply and wait for the answer.
- If the user is unsure, accept that answer. Offer two or three concrete, low-pressure possibilities or a tiny experiment based on what they have shared. Leave room for another direction. Do not prescribe a medium, demand a passion or overwhelm them with a long list of ideas.
- Help them choose an idea they want to try; a recommendation is not their decision. Agree on a small first version, what would make it enough, and one practical next step. Fit scope to their energy and resources without invented deadlines or unsupported promises about how easy it will be.
- Keep supporting them after they choose: help them try, learn, revise and finish, or change direction. For perfectionism, suggest a rough experiment that need not be shown to anyone. For missing skills or limited materials, offer a smaller version, an accessible alternative or a focused learning step. Ask what feels difficult rather than assuming the cause. Never shame uncertainty, lack of progress or a change of mind.
- Inspiration may come from ordinary interests, references or experiments; none is required. Help the user make their own choices without promising originality uninfluenced by anything or copying someone else's work as their own.
- A standalone adventure needs no quest. Do not create one just to use this activity. It has no Journal to update and cannot record quest progress. In a quest adventure, keep agreed goals, preferences and the next step in its existing Journal under the usual tool rules, preserving unrelated content. Distinguish tentative ideas and planned milestones from agreed plans and completed work. Record a milestone only for meaningful work the user reports completed, never merely for proposing a project or plan. Ask before creating a quest or replacing an agreed plan.`;

const OPENING_REQUEST =
  "The user has started an adventure to find something to make. Reassure them briefly that they do not need an idea yet. Use any conversation and quest Journal as context without asking them to repeat known details. Ask one gentle question to discover a starting point, such as whether they would rather explore things they enjoy or what they have available. Do not ask for an inspiration source or present an intake form.";

const findSomethingToMake: Activity = {
  id: "find-something-to-make",
  name: "Find something to make",
  description:
    "Discover a small creative project that fits your interests, energy and what you have available. No idea needed yet.",
  definition: { prompt: INSTRUCTIONS, openingRequest: OPENING_REQUEST },
};

export { findSomethingToMake };
