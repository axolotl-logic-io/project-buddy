import Link from "next/link";
import type { JSX } from "react";
import { QuestTimer } from "@/components/timer/quest-timer.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { QuestId } from "@/ids.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

// The panel beside a quest: a link to the quest's settings above the
// Timer.
function QuestPanel({ questId }: { readonly questId: QuestId }): JSX.Element {
  return (
    <>
      <Link
        href={`/quests/${questId}?section=settings`}
        className="quest-panel-settings"
      >
        <Icon name="settings" className="quest-panel-settings-icon" />
        <span className="grid min-w-0">
          <span className="quest-panel-settings-name">
            {QUEST_OVERVIEW_COPY.settings}
          </span>{" "}
          <span className="quest-panel-settings-hint">
            {QUEST_OVERVIEW_COPY.settingsHint}
          </span>
        </span>
        <Icon name="chevron-right" />
      </Link>
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
