import type { JSX } from "react";
import type { QuestSharing } from "@/quests/membership.ts";
import { QUEST_SHARING_COPY } from "@/ui/copy/quest-members.ts";

// The short marker a multi-user quest carries where quests are listed:
// "Shared" on the user's own, and the owner's name on someone else's. A
// personal quest shows none.
function QuestSharingMark({
  sharing,
}: {
  readonly sharing: QuestSharing;
}): JSX.Element | null {
  const mark = QUEST_SHARING_COPY.mark(sharing);
  if (mark === undefined) {
    return null;
  }
  return <span className="quest-sharing-mark">{mark}</span>;
}

export { QuestSharingMark };
