import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import type { ProjectId } from "@/ids.ts";
import { doneSteps, openSteps, type Plan } from "@/plan/plan.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";

// The quest's plan as a section of its Journal: its open steps in order and
// how many are done, with a link to the Plan section, where it is changed.
// The construct reads it beside the Journal, and changes it with its own
// tool rather than by editing the Journal's text.
export function PlanInJournal({
  projectId,
  plan,
}: {
  readonly projectId: ProjectId;
  readonly plan: Plan;
}): JSX.Element {
  const open = openSteps(plan);
  const done = doneSteps(plan);
  return (
    <section className="plan-card wrap-anywhere flex min-w-0 flex-col gap-2">
      <h3 className="font-heading font-semibold">{PLAN_COPY.heading}</h3>
      {open.length === 0 && (
        <p className="text-muted">{PLAN_COPY.emptyInJournal}</p>
      )}
      {open.length > 0 && (
        <ol className="wrap-anywhere list-decimal pl-6">
          {open.map((step) => (
            <li key={step.number}>{step.text}</li>
          ))}
        </ol>
      )}
      {done.length > 0 && (
        <p className="text-muted text-sm">{PLAN_COPY.done(done.length)}</p>
      )}
      <Button asChild={true} variant="quiet" className="self-start">
        <Link href={`/projects/${projectId}?section=plan`}>
          {PLAN_COPY.journalLink}
        </Link>
      </Button>
    </section>
  );
}
