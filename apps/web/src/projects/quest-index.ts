import { z } from "zod";
import { QUEST_STATUS } from "@/projects/quest-status.ts";

const QUEST_INDEX_TAB = QUEST_STATUS.or(z.literal("premade"));
type QuestIndexTab = z.infer<typeof QUEST_INDEX_TAB>;

export type { QuestIndexTab };
export { QUEST_INDEX_TAB };
