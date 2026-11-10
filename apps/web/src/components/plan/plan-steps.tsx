"use client";

import {
  type ChangeEvent,
  type JSX,
  type SubmitEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { type PlanController, usePlan } from "@/components/plan/use-plan.ts";
import { Button } from "@/components/ui/button.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import {
  doneSteps,
  moveAmongOpen,
  nextPlanStep,
  openSteps,
  PLAN_STEP_TEXT,
  PLAN_STEP_TEXT_MAX_LENGTH,
  type PlanStep,
} from "@/plan/plan.ts";
import { PLAN_COPY } from "@/ui/copy/plan.ts";

// Where the steps show, which sets what they show besides themselves: the
// quest's page and the Plan panel show the next step on its own first; a
// plan card in the conversation shows only the steps.
type PlanStepsLook = "page" | "panel" | "card";

// The step's new text as the plan saves it, or why it can't be.
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

function StepTextForm({
  initial,
  label,
  submit,
  submitLabel,
  onCancel,
  disabled,
}: {
  readonly initial: string;
  readonly label: string;
  readonly submit: (text: string) => Promise<boolean>;
  readonly submitLabel: string;
  readonly onCancel?: (() => void) | undefined;
  readonly disabled: boolean;
}): JSX.Element {
  const inputId = useId();
  const problemId = useId();
  const [text, setText] = useState(initial);
  const [problem, setProblem] = useState<string | undefined>();
  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setText(event.currentTarget.value);
    setProblem(undefined);
  }, []);
  const save = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const checked = checkedText(text);
      if ("problem" in checked) {
        setProblem(checked.problem);
        return;
      }
      if (await submit(checked.text)) {
        setText("");
      }
    },
    [submit, text],
  );
  let describedBy: string | undefined;
  if (problem !== undefined) {
    describedBy = problemId;
  }
  return (
    <form className="plan-step-form" onSubmit={save}>
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="input-field"
        value={text}
        onChange={change}
        placeholder={PLAN_COPY.addPlaceholder}
        aria-invalid={problem !== undefined}
        aria-describedby={describedBy}
        maxLength={PLAN_STEP_TEXT_MAX_LENGTH * 2}
        disabled={disabled}
      />
      <Button type="submit" variant="secondary" disabled={disabled}>
        {submitLabel}
      </Button>
      {onCancel !== undefined && (
        <Button variant="quiet" onClick={onCancel}>
          {PLAN_COPY.cancel}
        </Button>
      )}
      {problem !== undefined && (
        <p className="error-text plan-step-problem" id={problemId}>
          {problem}
        </p>
      )}
    </form>
  );
}

// One step: a checkbox to check it off or reopen it, its number and text,
// and buttons to move an open step, edit it or remove it.
function StepRow({
  plan,
  step,
  first,
  last,
  disabled,
  editing,
  setEditing,
}: {
  readonly plan: PlanController;
  readonly step: PlanStep;
  readonly first: boolean;
  readonly last: boolean;
  readonly disabled: boolean;
  readonly editing: boolean;
  readonly setEditing: (number: number | undefined) => void;
}): JSX.Element {
  const { change } = plan;
  const editRef = useRef<HTMLButtonElement>(null);
  const toggle = useCallback((): Promise<void> => {
    if (step.done) {
      return change([{ op: "reopen", step: step.number }]);
    }
    return change([{ op: "complete", step: step.number }]);
  }, [change, step]);
  const move = useCallback(
    (direction: "up" | "down"): Promise<void> => {
      const operation = moveAmongOpen(plan.state.plan, step.number, direction);
      if (operation === undefined) {
        return Promise.resolve();
      }
      return change([operation]);
    },
    [change, plan.state.plan, step.number],
  );
  const moveUp = useCallback((): Promise<void> => move("up"), [move]);
  const moveDown = useCallback((): Promise<void> => move("down"), [move]);
  const remove = useCallback(
    (): Promise<void> => change([{ op: "remove", step: step.number }]),
    [change, step.number],
  );
  const startEditing = useCallback(
    (): void => setEditing(step.number),
    [setEditing, step.number],
  );
  const stopEditing = useCallback((): void => {
    setEditing(undefined);
    queueMicrotask(() => editRef.current?.focus());
  }, [setEditing]);
  const saveText = useCallback(
    async (text: string): Promise<boolean> => {
      await change([{ op: "change", step: step.number, text }]);
      stopEditing();
      return false;
    },
    [change, step.number, stopEditing],
  );
  let checkLabel = PLAN_COPY.checkOff(step.text);
  if (step.done) {
    checkLabel = PLAN_COPY.reopen(step.text);
  }
  return (
    <li className="plan-step">
      <span className="plan-step-check">
        <input
          type="checkbox"
          checked={step.done}
          onChange={toggle}
          disabled={disabled}
          aria-label={checkLabel}
        />
      </span>
      <span className="plan-step-number">
        {PLAN_COPY.stepNumber(step.number)}
      </span>
      {editing === true && (
        <StepTextForm
          initial={step.text}
          label={PLAN_COPY.textLabel}
          submit={saveText}
          submitLabel={PLAN_COPY.save}
          onCancel={stopEditing}
          disabled={disabled}
        />
      )}
      {editing !== true && (
        <>
          <span className="plan-step-text">{step.text}</span>
          <span className="plan-step-actions">
            {!step.done && (
              <>
                <Button
                  variant="quiet"
                  aria-label={PLAN_COPY.moveUp(step.text)}
                  title={PLAN_COPY.moveUp(step.text)}
                  onClick={moveUp}
                  disabled={disabled || first}
                >
                  <Icon name="arrow-up" />
                </Button>
                <Button
                  variant="quiet"
                  aria-label={PLAN_COPY.moveDown(step.text)}
                  title={PLAN_COPY.moveDown(step.text)}
                  onClick={moveDown}
                  disabled={disabled || last}
                >
                  <Icon name="arrow-down" />
                </Button>
                <Button
                  ref={editRef}
                  variant="quiet"
                  aria-label={PLAN_COPY.edit(step.text)}
                  title={PLAN_COPY.edit(step.text)}
                  onClick={startEditing}
                  disabled={disabled}
                >
                  <Icon name="pencil" />
                </Button>
              </>
            )}
            <Button
              variant="quiet"
              aria-label={PLAN_COPY.remove(step.text)}
              title={PLAN_COPY.remove(step.text)}
              onClick={remove}
              disabled={disabled}
            >
              <Icon name="trash" />
            </Button>
          </span>
        </>
      )}
    </li>
  );
}

// The next step on its own, with a button to check it off.
function NextStep({
  plan,
  step,
  disabled,
}: {
  readonly plan: PlanController;
  readonly step: PlanStep;
  readonly disabled: boolean;
}): JSX.Element {
  const { change } = plan;
  const complete = useCallback(
    (): Promise<void> => change([{ op: "complete", step: step.number }]),
    [change, step.number],
  );
  return (
    <div className="plan-next">
      <p className="flex min-w-0 flex-col">
        <span className="plan-next-label">{PLAN_COPY.nextStep}</span>
        <span className="plan-next-text">{step.text}</span>
      </p>
      <Button
        variant="secondary"
        onClick={complete}
        disabled={disabled}
        aria-label={PLAN_COPY.completeNextLabel(step.text)}
      >
        <Icon name="check" />
        {PLAN_COPY.completeNext}
      </Button>
    </div>
  );
}

function Feedback({ plan }: { readonly plan: PlanController }): JSX.Element {
  const { feedback, undo } = plan;
  const undoVersion = feedback?.undoVersion;
  const undoLast = useCallback((): Promise<void> => {
    if (undoVersion === undefined) {
      return Promise.resolve();
    }
    return undo(undoVersion);
  }, [undo, undoVersion]);
  return (
    <FormStatus>
      {feedback !== undefined && (
        <span className="flex flex-wrap items-center gap-2">
          <span>{feedback.text}</span>
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
  );
}

// The quest's plan with every control to change it, from the plan
// controller around it; nothing outside a quest. Its controls are off while
// the controller says so, such as while the construct replies.
function PlanSteps({
  look,
}: {
  readonly look: PlanStepsLook;
}): JSX.Element | null {
  const plan = usePlan();
  const [editing, setEditing] = useState<number | undefined>();
  const add = useCallback(
    async (text: string): Promise<boolean> => {
      if (plan === undefined) {
        return false;
      }
      await plan.change([{ op: "add", text }]);
      return true;
    },
    [plan],
  );
  if (plan === undefined) {
    return null;
  }
  const disabled = plan.disabledNote !== undefined || plan.pending;
  const open = openSteps(plan.state.plan);
  const done = doneSteps(plan.state.plan);
  const next = nextPlanStep(plan.state.plan);
  let empty: string = PLAN_COPY.none;
  if (done.length > 0) {
    empty = PLAN_COPY.allDone;
  }
  return (
    <div className="plan">
      {look !== "card" && next !== undefined && (
        <NextStep plan={plan} step={next} disabled={disabled} />
      )}
      {open.length === 0 && <p className="text-muted">{empty}</p>}
      {open.length > 0 && (
        <ol aria-label={PLAN_COPY.stepsLabel} className="plan-steps">
          {open.map((step, index) => (
            <StepRow
              key={step.number}
              plan={plan}
              step={step}
              first={index === 0}
              last={index === open.length - 1}
              disabled={disabled}
              editing={editing === step.number}
              setEditing={setEditing}
            />
          ))}
        </ol>
      )}
      <StepTextForm
        initial=""
        label={PLAN_COPY.addLabel}
        submit={add}
        submitLabel={PLAN_COPY.add}
        disabled={disabled}
      />
      {done.length > 0 && (
        <details className="plan-done">
          <summary>{PLAN_COPY.done(done.length)}</summary>
          <ul className="plan-steps">
            {done.map((step) => (
              <StepRow
                key={step.number}
                plan={plan}
                step={step}
                first={true}
                last={true}
                disabled={disabled}
                editing={false}
                setEditing={setEditing}
              />
            ))}
          </ul>
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
