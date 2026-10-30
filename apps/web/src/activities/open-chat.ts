// The open chat: no set scene, so the buddy follows the user's lead. It is
// the activity a chat starts in when the user picks none.
import type { Activity } from "@/activities/activity.ts";

const INSTRUCTIONS = [
  "# Activity: Open chat",
  "There is no set scene: follow the user's lead. Answer what they ask, and help with whatever they bring up.",
].join("\n");

const OPENING_KICKOFF =
  "I have just started this chat. Open it with a brief synopsis of what the project's memory already holds, if this chat has a project and its memory holds anything, then ask me one question: what to work on, such as the next milestone.";

export const openChat: Activity = {
  id: "open-chat",
  name: "Open chat",
  description: "No set scene: the buddy follows your lead.",
  parts: { instructions: INSTRUCTIONS, openingKickoff: OPENING_KICKOFF },
};
