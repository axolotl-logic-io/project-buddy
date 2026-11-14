import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { CurrentQuestCard } from "@/components/current-quest.tsx";
import { QuestStartChoices } from "@/components/quest-start.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import { parseQuestTab, type QuestTab } from "@/components/quest-tab.ts";
import { readCurrentQuest } from "@/quests/current-quest-store.ts";
import { answerInvitationAction } from "@/quests/membership-actions.ts";
import { listPendingQuests } from "@/quests/membership-store.ts";
import { listQuests } from "@/quests/store.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";

export const metadata: Metadata = { title: QUESTS_COPY.title };

// The quest to continue, the four ways to start a quest, then the user's
// quests by status, their own and those they are a member of, and Pending,
// the quests they are invited to and haven't accepted. Someone with no
// quests yet but an invitation sees Pending first.
export default async function QuestsPage({
  searchParams,
}: PageProps<"/quests">): Promise<JSX.Element> {
  const { status } = await searchParams;
  const user = await requireUser();
  const [quests, current, pending] = await Promise.all([
    listQuests(user.id),
    readCurrentQuest(user.id),
    listPendingQuests(user.id),
  ]);
  const dailies = quests.find((quest) => quest.dailies);
  let initialStatus: QuestTab = parseQuestTab(status) ?? "active";
  if (status === undefined && quests.length === 0 && pending.length > 0) {
    initialStatus = "pending";
  }
  return (
    <>
      <CurrentQuestCard quest={current} />
      <QuestStartChoices dailiesId={dailies?.id} />
      <QuestStatusTabs
        quests={quests}
        initialStatus={initialStatus}
        pending={{ quests: pending, answer: answerInvitationAction }}
      />
    </>
  );
}
