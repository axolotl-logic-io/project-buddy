import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { LifePin } from "@/components/life-pin.tsx";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { PendingQuests } from "@/components/pending-quests.tsx";
import { QuestFinder } from "@/components/quest-finder.tsx";
import type { UserId } from "@/ids.ts";
import { answerInvitationAction } from "@/quests/membership-actions.ts";
import { listPendingQuests } from "@/quests/membership-store.ts";
import { finderQuests } from "@/quests/quest-finder-entries.ts";
import {
  readFinderTime,
  readLife,
  readQuestEntries,
} from "@/quests/quest-index-store.ts";
import { QUEST_STATUS } from "@/quests/quest-status.ts";
import { type FoundTask, searchTasks } from "@/tasks/task-search-store.ts";
import { QUESTS_COPY } from "@/ui/copy/quests.ts";

// The one value of a search parameter, or "" without one.
function single(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  return value?.[0] ?? "";
}

// The tasks the search finds; none without one.
function tasksFound(
  user: UserId,
  search: string,
): Promise<readonly FoundTask[]> {
  if (search === "") {
    return Promise.resolve([]);
  }
  return searchTasks(user, search);
}

export const metadata: Metadata = { title: QUESTS_COPY.title };

// Invitations waiting for an answer, then the user's Life, pinned with one
// of its recurring tasks to check off, then a finder over every quest
// open to them and the tasks of their Active ones. ?q= is the search;
// ?status= the status shown when it is empty.
export default async function QuestsPage({
  searchParams,
}: PageProps<"/quests">): Promise<JSX.Element> {
  const [{ q, status: shown }, user] = await Promise.all([
    searchParams,
    requireUser(),
  ]);
  const search = single(q).trim();
  const status = QUEST_STATUS.safeParse(single(shown));
  const [entries, life, pending, found, now] = await Promise.all([
    readQuestEntries(user.id),
    readLife(user.id),
    listPendingQuests(user.id),
    tasksFound(user.id, search),
    readFinderTime(user.id),
  ]);
  return (
    <PageWorkspace>
      <div className="workspace-content quests-workspace">
        <PendingQuests answer={answerInvitationAction} quests={pending} />
        {life !== undefined && <LifePin life={life} />}
        <QuestFinder
          found={found}
          initialStatus={status.data ?? "active"}
          quests={finderQuests(entries, now)}
          search={search}
        />
      </div>
    </PageWorkspace>
  );
}
