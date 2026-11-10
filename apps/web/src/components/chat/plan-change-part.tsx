"use client";

import { useAuiState } from "@assistant-ui/react";
import { type JSX, useCallback } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { PlanSteps } from "@/components/plan/plan-steps.tsx";
import { usePlan } from "@/components/plan/use-plan.ts";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { PlanChangeLine } from "@/plan/plan.ts";
import { readPlanPart } from "@/plan/plan-message.ts";
import { CHANGE_PLAN_OUTPUT } from "@/replies/tools/change-plan-contract.ts";
import { PLAN_CHANGE_COPY, planLineText } from "@/ui/copy/plan.ts";

type LineIcon = "plus" | "pencil" | "check" | "close" | "arrow-down" | "trash";

const LINE_ICONS: Readonly<Record<PlanChangeLine["kind"], LineIcon>> = {
  add: "plus",
  change: "pencil",
  complete: "check",
  reopen: "close",
  move: "arrow-down",
  remove: "trash",
};

// Each line with its words and a key: its words, and how often they came
// before, since two lines of one change may read the same.
function keyedLines(
  lines: readonly PlanChangeLine[],
): { key: string; line: PlanChangeLine; text: string }[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const text = planLineText(line);
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { key: `${text}#${count}`, line, text };
  });
}

// One saved plan change, as a notice set apart from the words around it:
// what each operation did, and Undo while the change can still be undone.
// A person's change says it spent no batteries; an undo can't be undone.
function PlanChangeCard({
  version,
  lines,
  byPerson,
  undoesVersion,
}: {
  readonly version: number;
  readonly lines: readonly PlanChangeLine[];
  readonly byPerson: boolean;
  readonly undoesVersion?: number | undefined;
}): JSX.Element {
  const plan = usePlan();
  const undo = plan?.undo;
  const undoChange = useCallback((): Promise<void> => {
    if (undo === undefined) {
      return Promise.resolve();
    }
    return undo(version);
  }, [undo, version]);
  const undone = plan?.state.undone.includes(version) === true;
  let title: string = PLAN_CHANGE_COPY.label;
  if (undoesVersion !== undefined) {
    title = PLAN_CHANGE_COPY.undid;
  }
  return (
    <aside aria-label={PLAN_CHANGE_COPY.label} className="plan-change">
      <p className="plan-change-heading">
        <span className="icon-line font-medium">
          <Icon name="checklist" />
          {title}
        </span>
        {undone && (
          <span className="text-muted">{PLAN_CHANGE_COPY.undone}</span>
        )}
        {!undone && undoesVersion === undefined && plan !== undefined && (
          <Button
            variant="quiet"
            onClick={undoChange}
            disabled={plan.pending || plan.disabledNote !== undefined}
            aria-label={PLAN_CHANGE_COPY.undoLabel}
          >
            {PLAN_CHANGE_COPY.undo}
          </Button>
        )}
      </p>
      <ul className="plan-change-lines">
        {keyedLines(lines).map(({ key, line, text }) => (
          <li key={key} className="icon-line">
            <Icon name={LINE_ICONS[line.kind]} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {byPerson === true && (
        <p className="text-muted text-xs">{PLAN_CHANGE_COPY.noModel}</p>
      )}
    </aside>
  );
}

// A change_plan call of the construct's: the change it saved, or a quiet
// line when it saved none. Nothing shows until the call answers.
function PlanChangeToolPart({
  part,
}: {
  readonly part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = CHANGE_PLAN_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return null;
  }
  const change = output.data;
  if (change.status === "not-changed") {
    return <p className="text-muted text-sm">{PLAN_CHANGE_COPY.notChanged}</p>;
  }
  return (
    <PlanChangeCard
      version={change.version}
      lines={change.lines}
      byPerson={false}
    />
  );
}

// The plan as a card in the conversation, which the /plan command showed.
// Only the newest card holds the live plan with its controls; an older one
// says so, so the conversation holds one copy of the controls.
function PlanCard(): JSX.Element {
  const plan = usePlan();
  const messageId = useAuiState(({ message }) => message.id);
  if (plan === undefined || plan.newestCardId !== messageId) {
    return <p className="text-muted text-sm">{PLAN_CHANGE_COPY.staleCard}</p>;
  }
  return (
    <section aria-label={PLAN_CHANGE_COPY.cardLabel} className="plan-card">
      <PlanSteps look="card" />
    </section>
  );
}

// A plan message's part (src/plan/plan-message.ts): a person's plan change,
// with the command they typed for it, or a plan card. Any other data part
// shows nothing.
function PlanDataPart({
  name,
  data,
}: {
  readonly name: string;
  readonly data: unknown;
}): JSX.Element | null {
  const part = readPlanPart({ type: `data-${name}`, data });
  if (part === undefined) {
    return null;
  }
  if (part.kind === "card") {
    return (
      <>
        <p className="plan-command">{part.data.command}</p>
        <PlanCard />
      </>
    );
  }
  const { command, version, lines, undoesVersion } = part.data;
  return (
    <>
      {command !== undefined && <p className="plan-command">{command}</p>}
      <PlanChangeCard
        version={version}
        lines={lines}
        byPerson={true}
        undoesVersion={undoesVersion}
      />
    </>
  );
}

export { PlanChangeToolPart, PlanDataPart };
