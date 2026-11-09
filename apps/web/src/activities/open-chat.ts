import type { Activity } from "@/activities/activity.ts";

const INSTRUCTIONS = [
  "# Activity Sheet",
  "There is no set scene: follow the user's lead. Answer what they ask, and help with whatever they bring up.",
].join("\n");

const OPENING_KICKOFF =
  "I have just started this adventure. Open it with a brief synopsis of what the quest's Journal already holds, if this adventure has a quest and its Journal holds anything, then ask me one question: what to work on, such as the next milestone.";

export const openChat: Activity = {
  id: "open-chat",
  name: "Open adventure",
  description: "No set scene: the construct follows your lead.",
  definition: { prompt: INSTRUCTIONS, openingRequest: OPENING_KICKOFF },
};
