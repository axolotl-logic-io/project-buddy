"use client";

import { type JSX, useCallback } from "react";
import { type PlanController, usePlan } from "@/components/plan/use-plan.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  AddListItem,
  EditableList,
  EditableListAction,
  EditableListRow,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import {
  doneSteps,
  moveAmongOpen,
  openSteps,
  PLAN_STEP_TEXT,
  PLAN_STEP_TEXT_MAX_LENGTH,
  type PlanStep,
} from "@/plan/plan.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";

function checkedText(text: string): { text: string } | { problem: string } {
  const parsed = PLAN_STEP_TEXT.safeParse(text);
  if (parsed.success) {
    return { text: parsed.data };
  }
  if (text.trim() === "") {
    return { problem: PLAN_COPY.needsText };
  }
  return { problem: PLAN_COPY.tooLong(PLAN_STEP_TEXT_MAX_LENGTH) };
}

const STEP_EDITOR: EditorOptions = {
  label: PLAN_COPY.textLabel,
  save: PLAN_COPY.save,
  cancel: PLAN_COPY.cancel,
  placeholder: PLAN_COPY.addPlaceholder,
  maxLength: PLAN_STEP_TEXT_MAX_LENGTH,
  validate: checkedText,
};
const ADD_EDITOR: EditorOptions = {
  ...STEP_EDITOR,
  label: PLAN_COPY.addLabel,
  save: PLAN_COPY.add,
};

function StepRow({
  plan,
  step,
  first,
  last,
  disabled,
}: {
  readonly plan: PlanController;
  readonly step: PlanStep;
  readonly first: boolean;
  readonly last: boolean;
  readonly disabled: boolean;
}): JSX.Element {
  const { change } = plan;
  const toggle = useCallback(async (): Promise<void> => {
    if (step.done) {
      await change([{ op: "reopen", step: step.number }]);
    } else {
      await change([{ op: "complete", step: step.number }]);
    }
  }, [change, step]);
  const save = useCallback(
    (text: string): Promise<boolean> =>
      change([{ op: "change", step: step.number, text }]),
    [change, step.number],
  );
  const move = useCallback(
    async (direction: "up" | "down"): Promise<void> => {
      const operation = moveAmongOpen(plan.state.plan, step.number, direction);
      if (operation !== undefined) {
        await change([operation]);
      }
    },
    [change, plan.state.plan, step.number],
  );
  const moveUp = useCallback((): Promise<void> => move("up"), [move]);
  const moveDown = useCallback((): Promise<void> => move("down"), [move]);
  const remove = useCallback(async (): Promise<void> => {
    await change([{ op: "remove", step: step.number }]);
  }, [change, step.number]);
  let checkLabel = PLAN_COPY.checkOff(step.text);
  if (step.done) {
    checkLabel = PLAN_COPY.reopen(step.text);
  }
  return (
    <EditableListRow
      id={String(step.number)}
      text={step.text}
      editor={STEP_EDITOR}
      editLabel={PLAN_COPY.edit(step.text)}
      actionsLabel={PLAN_COPY.actions(step.text)}
      menuLabel={PLAN_COPY.stepNumber(step.number)}
      disabled={disabled}
      checked={step.done}
      toggleLabel={checkLabel}
      onToggle={toggle}
      onSave={save}
    >
      {!step.done && (
        <>
          <EditableListAction
            icon="arrow-up"
            onSelect={moveUp}
            disabled={first}
            label={PLAN_COPY.moveUp(step.text)}
          >
            {PLAN_COPY.moveUpLabel}
          </EditableListAction>
          <EditableListAction
            icon="arrow-down"
            onSelect={moveDown}
            disabled={last}
            label={PLAN_COPY.moveDown(step.text)}
          >
            {PLAN_COPY.moveDownLabel}
          </EditableListAction>
        </>
      )}
      <EditableListAction
        icon="trash"
        onSelect={remove}
        label={PLAN_COPY.remove(step.text)}
      >
        {PLAN_COPY.removeLabel}
      </EditableListAction>
    </EditableListRow>
  );
}

// What the last direct change said: a local routine line, with Undo, or
// why nothing changed, in the status region, which stays mounted; or, when the change
// failed, an alert.
function Feedback({ plan }: { readonly plan: PlanController }): JSX.Element {
  const { feedback, undo } = plan;
  const undoVersion = feedback?.undoVersion;
  const undoLast = useCallback((): Promise<void> => {
    if (undoVersion === undefined) {
      return Promise.resolve();
    }
    return undo(undoVersion);
  }, [undo, undoVersion]);
  let routine = feedback;
  if (feedback?.failed === true) {
    routine = undefined;
  }
  return (
    <>
      <FormStatus>
        {routine !== undefined && (
          <span className="flex flex-wrap items-center gap-2">
            <span>{routine.text}</span>
            {undoVersion !== undefined &&
              !plan.state.undone.includes(undoVersion) && (
                <Button
                  variant="quiet"
                  onClick={undoLast}
                  disabled={plan.pending}
                >
                  {PLAN_COPY.undo}
                </Button>
              )}
          </span>
        )}
      </FormStatus>
      {feedback?.failed === true && <Alert>{feedback.text}</Alert>}
    </>
  );
}

function PlanSteps(): JSX.Element | null {
  const plan = usePlan();
  const add = useCallback(
    async (text: string): Promise<boolean> => {
      if (plan === undefined) {
        return false;
      }
      return await plan.change([{ op: "add", text }]);
    },
    [plan],
  );
  const reorder = useCallback(
    async (id: string, beforeId: string | undefined): Promise<boolean> => {
      if (plan === undefined) {
        return false;
      }
      const step = plan.state.plan.steps.find(
        (item) => String(item.number) === id,
      );
      const before = plan.state.plan.steps.find(
        (item) => String(item.number) === beforeId,
      );
      if (
        step === undefined ||
        step.done ||
        (beforeId !== undefined && before === undefined)
      ) {
        return false;
      }
      return await plan.change([
        { op: "move", step: step.number, before: before?.number },
      ]);
    },
    [plan],
  );
  if (plan === undefined) {
    return null;
  }
  const disabled = plan.disabledNote !== undefined || plan.pending;
  const open = openSteps(plan.state.plan);
  const done = doneSteps(plan.state.plan);
  return (
    <div className="plan">
      <AddListItem
        label={PLAN_COPY.addPlaceholder}
        editor={ADD_EDITOR}
        disabled={disabled}
        onSave={add}
      />
      <EditableList label={PLAN_COPY.stepsLabel} onMove={reorder}>
        {open.map((step, index) => (
          <StepRow
            key={step.number}
            plan={plan}
            step={step}
            first={index === 0}
            last={index === open.length - 1}
            disabled={disabled}
          />
        ))}
      </EditableList>
      {done.length > 0 && (
        <details className="plan-done">
          <summary>{PLAN_COPY.done(done.length)}</summary>
          <EditableList label={PLAN_COPY.done(done.length)}>
            {done.map((step) => (
              <StepRow
                key={step.number}
                plan={plan}
                step={step}
                first={true}
                last={true}
                disabled={disabled}
              />
            ))}
          </EditableList>
        </details>
      )}
      {plan.disabledNote !== undefined && (
        <p className="text-muted text-sm">{plan.disabledNote}</p>
      )}
      <Feedback plan={plan} />
    </div>
  );
}

export { PlanSteps };
