"use client";

import type { JSX, ReactNode } from "react";
import { AppearanceChoices } from "@/components/appearance-choices.tsx";
import { SidePanel } from "@/components/site-panel.tsx";
import { TIMER_COPY } from "@/ui/copy/timer.ts";

function TimerPreferences({
  children,
}: {
  readonly children?: ReactNode;
}): JSX.Element {
  return (
    <SidePanel
      title={TIMER_COPY.preferences}
      closeLabel={TIMER_COPY.closePreferences}
      storageKey="timer-panel"
      side="right"
    >
      <AppearanceChoices />
      <p className="timer-preferences-hint">{TIMER_COPY.appearanceHint}</p>
      {children}
    </SidePanel>
  );
}

export { TimerPreferences };
