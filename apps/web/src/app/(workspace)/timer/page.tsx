import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { TimerSetup } from "@/components/timer/timer-setup.tsx";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

export const metadata: Metadata = { title: TIMER_COPY.title };

// The Timer's setup, a destination of its own, apart from every quest.
export default async function TimerSetupPage(): Promise<JSX.Element> {
  await requireUser();
  return (
    <PageWorkspace intro={TIMER_COPY.intro}>
      <div className="workspace-content">
        <TimerSetup />
      </div>
    </PageWorkspace>
  );
}
