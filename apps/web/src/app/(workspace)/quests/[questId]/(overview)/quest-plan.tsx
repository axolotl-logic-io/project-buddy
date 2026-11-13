"use client";

import type { JSX } from "react";
import { PlanSteps } from "@/components/plan/plan-steps.tsx";
import {
  type PlanActions,
  PlanContext,
  usePlanController,
} from "@/components/plan/use-plan.ts";
import type { QuestId } from "@/ids.ts";
import type { PlanState } from "@/plan/plan.ts";

// The quest's plan on its page, with every control to change it. A change
// here is saved outside any adventure; the construct reads the plan as it is
// on its next reply.
export function QuestPlan({
  questId,
  plan,
  actions,
}: {
  readonly questId: QuestId;
  readonly plan: PlanState;
  readonly actions: PlanActions;
}): JSX.Element {
  const controller = usePlanController({
    questId,
    actions,
    initialState: plan,
  });
  return (
    <PlanContext.Provider value={controller}>
      <PlanSteps />
    </PlanContext.Provider>
  );
}
