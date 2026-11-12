import type { UserId } from "@/ids.ts";
import { listQuests, type Quest } from "@/quests/store.ts";

// Quest dropdowns offer only accessible Active quests, newest first.
// Status tabs and direct pages use the unfiltered store instead.
async function activeQuests(user: UserId): Promise<Quest[]> {
  return (await listQuests(user)).filter((quest) => quest.status === "active");
}

export { activeQuests };
