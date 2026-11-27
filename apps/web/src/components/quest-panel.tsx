import Link from "next/link";
import type { JSX } from "react";
import { QuestStatusControls } from "@/components/quest-status-controls.tsx";
import { QuestTimer } from "@/components/timer/quest-timer.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { Quest } from "@/quests/store.ts";
import { QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

// The panel beside a quest: a link to its Members, with how many are in
// it, then Complete and Abandon, or Restore quest once it has ended, and
// the Timer. Life has no status controls, since it stays Active.
function QuestPanel({
  quest,
  people,
}: {
  readonly quest: Pick<Quest, "id" | "life" | "status" | "statusRevision">;
  // How many are in the quest, the owner included.
  readonly people: number;
}): JSX.Element {
  return (
    <>
      <Link
        href={`/quests/${quest.id}?section=members`}
        className="quest-panel-members"
      >
        <Icon name="people" className="quest-panel-members-icon" />
        <span className="grid min-w-0">
          <span className="quest-panel-members-name">
            {QUEST_MEMBERS_COPY.heading}
          </span>{" "}
          <span className="quest-panel-members-hint">
            {QUEST_OVERVIEW_COPY.membersHint(people)}
          </span>
        </span>
        <Icon name="chevron-right" />
      </Link>
      {!quest.life && (
        <section
          aria-label={QUEST_OVERVIEW_COPY.status}
          className="quest-panel-status"
        >
          <QuestStatusControls quest={quest} />
        </section>
      )}
      <section aria-label={TIMER_COPY.heading} className="quest-panel-timer">
        <h3 className="quest-panel-label">
          <Icon name="hourglass" />
          {TIMER_COPY.heading}
        </h3>
        <QuestTimer />
      </section>
    </>
  );
}

export { QuestPanel };
