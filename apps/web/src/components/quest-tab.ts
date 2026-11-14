// The tabs of Quests: a quest status, or Pending, the user's own unaccepted
// quest invitations, which is no quest's status. The browser imports this
// module.
import { QUEST_STATUS, type QuestStatus } from "@/quests/quest-status.ts";

type QuestTab = QuestStatus | "pending";

// The tab a value, such as the status query parameter, names, or undefined
// if none.
function parseQuestTab(value: unknown): QuestTab | undefined {
  if (value === "pending") {
    return "pending";
  }
  return QUEST_STATUS.safeParse(value).data;
}

export type { QuestTab };
export { parseQuestTab };
