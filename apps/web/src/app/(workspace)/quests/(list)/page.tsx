import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { CurrentQuestCard } from "@/components/current-quest.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import { QUEST_STATUS } from "@/quests/quest-status.ts";
import { listQuests } from "@/quests/store.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";

export const metadata: Metadata = { title: QUESTS_COPY.title };

// The quest to continue, the four ways to start a quest, then the user's
// quests by status.
export default async function QuestsPage({
  searchParams,
}: PageProps<"/quests">): Promise<JSX.Element> {
  const { status } = await searchParams;
  const user = await requireUser();
  const [quests, current] = await Promise.all([
    listQuests(user.id),
    readCurrentQuest(user.id),
  ]);
  const dailies = quests.find((quest) => quest.dailies);
  return (
    <>
      <CurrentQuestCard quest={current} />
      <QuestStartChoices dailiesId={dailies?.id} />
      <QuestStatusTabs
        quests={quests}
        initialStatus={QUEST_STATUS.safeParse(status).data ?? "active"}
      />
    </>
  );
}
