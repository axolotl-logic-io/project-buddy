import { z } from "zod";
import { PROJECT_ID, type ProjectId } from "@/ids.ts";

const QUEST_STATUSES = ["active", "completed", "abandoned"] as const;
const QUEST_STATUS = z.enum(QUEST_STATUSES);
type QuestStatus = z.infer<typeof QUEST_STATUS>;
const STATUS_REVISION = z.number().int().nonnegative();
const STATUS_APPROVAL_ID = z.uuid().brand<"StatusApprovalId">();
type StatusApprovalId = z.infer<typeof STATUS_APPROVAL_ID>;

const STATUS_APPROVAL = z.object({
  id: STATUS_APPROVAL_ID,
  projectId: PROJECT_ID,
  name: z.string(),
  fromStatus: QUEST_STATUS,
  toStatus: QUEST_STATUS,
  revision: STATUS_REVISION,
  decision: z.enum(["pending", "approved", "declined", "outdated"]),
});
type StatusApproval = z.infer<typeof STATUS_APPROVAL>;
interface StatusChange {
  readonly projectId: ProjectId;
  readonly fromStatus: QuestStatus;
  readonly toStatus: QuestStatus;
  readonly revision: number;
}

interface StatusActionState {
  readonly kind: "idle" | "saved" | "invalid";
  readonly message?: string;
  readonly change?: StatusChange | undefined;
  readonly approval?: StatusApproval;
}

export type {
  QuestStatus,
  StatusActionState,
  StatusApproval,
  StatusApprovalId,
  StatusChange,
};
export {
  QUEST_STATUS,
  QUEST_STATUSES,
  STATUS_APPROVAL,
  STATUS_APPROVAL_ID,
  STATUS_REVISION,
};
