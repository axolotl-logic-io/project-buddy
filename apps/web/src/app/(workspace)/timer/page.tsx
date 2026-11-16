import type { Metadata } from "next";
import type { JSX } from "react";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { TimerSetup } from "@/components/timer/timer-setup.tsx";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

export const metadata: Metadata = { title: TIMER_COPY.title };

// The Timer's setup, a destination of its own, apart from every quest,
// which anyone may open, signed in or not.
export default function TimerSetupPage(): JSX.Element {
  return (
    <PageWorkspace intro={TIMER_COPY.intro}>
      <div className="workspace-content">
        <TimerSetup />
      </div>
    </PageWorkspace>
  );
}
