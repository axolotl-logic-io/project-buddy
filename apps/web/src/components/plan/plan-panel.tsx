"use client";

import Link from "next/link";
import { type JSX, useCallback, useId, useState } from "react";
import { PlanSteps } from "@/components/plan/plan-steps.tsx";
import { usePlan } from "@/components/plan/use-plan.ts";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { nextPlanStep } from "@/plan/plan.ts";
import { PLAN_COPY, PLAN_PANEL_COPY } from "@/ui/copy/plan.ts";

// The quest's plan beside an adventure's conversation: a column of its own on
// a wide screen, and on a narrower one a button above the conversation,
// naming the next step, that opens it. Changes made here are saved to the
// adventure, so the construct reads them on its next reply.
function PlanPanel(): JSX.Element | null {
  const plan = usePlan();
  const bodyId = useId();
  const [open, setOpen] = useState(false);
  const toggle = useCallback((): void => setOpen((shown) => !shown), []);
  if (plan === undefined) {
    return null;
  }
  const next = nextPlanStep(plan.state.plan);
  let look = "adventure-plan-body";
  if (open === true) {
    look = "adventure-plan-body adventure-plan-body-open";
  }
  return (
    <aside className="adventure-plan" aria-label={PLAN_PANEL_COPY.label}>
      <Button
        variant="secondary"
        className="adventure-plan-toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
      >
        <Icon name="checklist" />
        <span className="font-semibold">{PLAN_PANEL_COPY.toggle}</span>
        {next !== undefined && (
          <span className="adventure-plan-next">
            {PLAN_PANEL_COPY.next(next.text)}
          </span>
        )}
      </Button>
      <div id={bodyId} className={look}>
        <h2 className="adventure-plan-heading">{PLAN_COPY.heading}</h2>
        <PlanSteps look="panel" />
        <Button asChild={true} variant="quiet" className="self-start">
          <Link href={`/projects/${plan.projectId}?section=plan`}>
            {PLAN_PANEL_COPY.questPage}
          </Link>
        </Button>
      </div>
    </aside>
  );
}

export { PlanPanel };
