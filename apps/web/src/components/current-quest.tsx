import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { CurrentQuest } from "@/quests/current-quest-store.ts";
import { CURRENT_QUEST_COPY } from "@/ui/copy/quests.ts";

const HEADING_ID = "current-quest-heading";

// The quest to pick up again, at the top of Quests: its name, its next step
// when it has one, and Continue, which opens its conversation. It shows
// nothing when there is no quest to continue.
function CurrentQuestCard({
  quest,
}: {
  readonly quest: CurrentQuest | undefined;
}): JSX.Element | null {
  if (quest === undefined) {
    return null;
  }
  const { quest: current, nextStep } = quest;
  return (
    <section aria-labelledby={HEADING_ID} className="current-quest">
      <div className="current-quest-body">
        <h2 className="current-quest-label" id={HEADING_ID}>
          {CURRENT_QUEST_COPY.label}
        </h2>
        <p className="card-title wrap-anywhere">{current.name}</p>
        {nextStep !== undefined && (
          <p className="wrap-anywhere text-muted text-sm">
            {CURRENT_QUEST_COPY.nextStep(nextStep)}
          </p>
        )}
      </div>
      <Button asChild={true}>
        <Link
          aria-label={CURRENT_QUEST_COPY.continueLabel(current.name)}
          href={`/quests/${current.id}`}
        >
          {CURRENT_QUEST_COPY.continue}
          <Icon className="rotate-180" name="arrow-left" />
        </Link>
      </Button>
    </section>
  );
}

export { CurrentQuestCard };
