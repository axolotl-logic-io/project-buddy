import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ExperienceStrip } from "@/components/experience/experience-card.tsx";
import { HomeTasks } from "@/components/home-tasks.tsx";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { StreakTable } from "@/components/streak-table.tsx";
import { TallyLedger } from "@/components/tally-ledger.tsx";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { readExperience } from "@/experience/experience-store.ts";
import { readStreakQuests } from "@/streaks/streak-store.ts";
import { readTallyQuests } from "@/tallies/tally-store.ts";
import { readTaskQuests } from "@/tasks/task-store.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

export const metadata: Metadata = { title: HOME_COPY.title };

// Home, where a signed-in user lands: their experience, then the streaks of
// their recurring tasks, the day ledger of their tallies and their one-off
// tasks, across their Active quests.
export default async function HomePage(): Promise<JSX.Element> {
  const user = await requireUser();
  const [experience, quests, tallies, tasks] = await Promise.all([
    readExperience(user.id),
    readStreakQuests(user.id),
    readTallyQuests(user.id),
    readTaskQuests(user.id),
  ]);
  return (
    <PageFrame>
      <PageWorkspace>
        <div className="workspace-content flex flex-col gap-6">
          <ExperienceStrip experience={experience} />
          <StreakTable quests={quests} />
          <TallyLedger quests={tallies} />
          <HomeTasks quests={tasks} />
        </div>
      </PageWorkspace>
    </PageFrame>
  );
}
