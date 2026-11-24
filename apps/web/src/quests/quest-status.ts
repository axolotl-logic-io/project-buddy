import { z } from "zod";
import type { QuestId } from "@/ids.ts";

const QUEST_STATUSES = ["active", "completed", "abandoned"] as const;
const QUEST_STATUS = z.enum(QUEST_STATUSES);
type QuestStatus = z.infer<typeof QUEST_STATUS>;
const STATUS_REVISION = z.number().int().nonnegative();
interface StatusChange {
  readonly questId: QuestId;
  readonly fromStatus: QuestStatus;
  readonly toStatus: QuestStatus;
  readonly revision: number;
}

interface StatusActionState {
  readonly kind: "idle" | "saved" | "invalid";
  readonly message?: string;
  readonly change?: StatusChange | undefined;
}

export type { QuestStatus, StatusActionState, StatusChange };
export { QUEST_STATUS, QUEST_STATUSES, STATUS_REVISION };
