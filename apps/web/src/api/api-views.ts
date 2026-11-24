// The records the API answers with, as its callers read them: only the
// fields a caller acts on, with dates as ISO 8601 text in UTC once
// serialized, and no model-only instructions or private definitions.

import type { QuestSharing } from "@/quests/membership.ts";
import type { QuestStatus } from "@/quests/quest-status.ts";
import type { Quest } from "@/quests/store.ts";

// A quest. Its revision is its status revision, which a status change
// names.
interface QuestView {
  readonly id: string;
  readonly name: string;
  readonly status: QuestStatus;
  readonly revision: number;
  readonly dailies: boolean;
  readonly constructId: string;
  readonly sharing: QuestSharing;
  readonly createdAt: Date;
}

function questView(quest: Quest): QuestView {
  return {
    id: quest.id,
    name: quest.name,
    status: quest.status,
    revision: quest.statusRevision,
    dailies: quest.dailies,
    constructId: quest.constructId,
    sharing: quest.sharing,
    createdAt: quest.createdAt,
  };
}

export type { QuestView };
export { questView };
