import type { Metadata } from "next";
import type { JSX } from "react";
import { InvalidTimer } from "@/components/timer/timer-display.tsx";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

export const metadata: Metadata = { title: TIMER_COPY.runningTitle };

// Incomplete links and links with extra path segments keep public setup
// recovery available, just like invalid values in a complete timer link.
export default function InvalidTimerPage(): JSX.Element {
  return (
    <div className="workspace-content">
      <InvalidTimer />
    </div>
  );
}
