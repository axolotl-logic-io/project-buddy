import type { JSX } from "react";
import { PlanSteps } from "@/components/plan/plan-steps.tsx";
import {
  type PlanActions,
  PlanContext,
  usePlanController,
} from "@/components/plan/use-plan.ts";
import type { QuestId } from "@/ids.ts";
import type { PlanState } from "@/plan/plan.ts";

// The plan's steps with every control to change them, as the quest's
// conversation shows them.
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
