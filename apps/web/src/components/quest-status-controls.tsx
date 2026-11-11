"use client";

import {
  createContext,
  type JSX,
  type ReactNode,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { changeQuestStatusAction } from "@/app/(workspace)/projects/status-actions.ts";
import { Button } from "@/components/ui/button.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import {
  QUEST_STATUSES,
  type QuestStatus,
  type StatusActionState,
  type StatusChange,
} from "@/projects/quest-status.ts";
import type { Project } from "@/projects/store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";

const IDLE: StatusActionState = { kind: "idle" };
const StatusFeedbackContext = createContext<
  ((state: StatusActionState) => void) | undefined
>(undefined);

async function changeWithFeedback(
  publish: ((state: StatusActionState) => void) | undefined,
  offerUndo: boolean,
  state: StatusActionState,
  form: FormData,
): Promise<StatusActionState> {
  const result = await changeQuestStatusAction(state, form);
  if (publish !== undefined) {
    let feedback = result;
    if (!offerUndo) {
      feedback = { ...result, change: undefined };
    }
    publish(feedback);
  }
  return result;
}

function QuestStatusFeedback({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const [state, publish] = useState<StatusActionState>(IDLE);
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.kind !== "idle") {
      resultRef.current?.focus();
    }
  }, [state]);
  return (
    <StatusFeedbackContext.Provider value={publish}>
      {children}
      <div className="quest-status-feedback">
        <Notice role="status" tabIndex={-1} ref={resultRef}>
          {state.message}
        </Notice>
        {state.change !== undefined && (
          <UndoStatusChange
            key={`${state.change.projectId}-${state.change.revision}`}
            change={state.change}
          />
        )}
      </div>
    </StatusFeedbackContext.Provider>
  );
}

function UndoControl({
  change,
}: {
  readonly change: StatusChange;
}): JSX.Element | null {
  const publish = useContext(StatusFeedbackContext);
  const [state, action, pending] = useActionState(
    changeWithFeedback.bind(null, publish, false),
    IDLE,
  );
  if (state.kind === "saved") {
    return null;
  }
  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={change.projectId} />
      <input type="hidden" name="fromStatus" value={change.toStatus} />
      <input type="hidden" name="toStatus" value={change.fromStatus} />
      <input type="hidden" name="revision" value={change.revision} />
      <Button type="submit" variant="quiet" disabled={pending}>
        {QUEST_STATUS_COPY.undo}
      </Button>
    </form>
  );
}

// The rail's status actions are quiet, except the one the quest's state
// leads to next, which is boxed: Complete while it is Active, Restore quest
// once it is closed. Abandon keeps the danger colour.
function statusActionClass(current: QuestStatus, action: QuestStatus): string {
  const classes = [`quest-status-${action}`];
  if (action === "active" || (current === "active" && action === "completed")) {
    classes.push("quest-status-next");
  }
  return classes.join(" ");
}

function StatusControls({
  project,
  restoreOnly = false,
}: {
  readonly project: Pick<Project, "id" | "status" | "statusRevision">;
  readonly restoreOnly?: boolean;
}): JSX.Element | null {
  const publish = useContext(StatusFeedbackContext);
  const [, action, pending] = useActionState(
    changeWithFeedback.bind(null, publish, true),
    IDLE,
  );
  let control: JSX.Element;
  if (restoreOnly === true) {
    control = (
      <Button
        type="submit"
        name="toStatus"
        value="active"
        variant="secondary"
        disabled={pending}
      >
        {QUEST_STATUS_COPY.restore}
      </Button>
    );
  } else {
    control = (
      <div className="quest-status-actions">
        {QUEST_STATUSES.filter((status) => status !== project.status).map(
          (status) => (
            <Button
              key={status}
              type="submit"
              name="toStatus"
              value={status}
              variant="quiet"
              className={statusActionClass(project.status, status)}
              disabled={pending}
            >
              {status === "completed" && <Icon name="check" />}
              {QUEST_STATUS_COPY.actions[status]}
            </Button>
          ),
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <form id={`quest-status-${project.id}`} action={action}>
        <input type="hidden" name="projectId" value={project.id} />
        <input type="hidden" name="fromStatus" value={project.status} />
        <input type="hidden" name="revision" value={project.statusRevision} />
        {control}
      </form>
    </div>
  );
}

function QuestStatusControls(
  props: Parameters<typeof StatusControls>[0],
): JSX.Element {
  const publish = useContext(StatusFeedbackContext);
  if (publish === undefined) {
    return (
      <QuestStatusFeedback>
        <StatusControls {...props} />
      </QuestStatusFeedback>
    );
  }
  return <StatusControls {...props} />;
}

function UndoStatusChange(
  props: Parameters<typeof UndoControl>[0],
): JSX.Element {
  const publish = useContext(StatusFeedbackContext);
  if (publish === undefined) {
    return (
      <QuestStatusFeedback>
        <UndoControl {...props} />
      </QuestStatusFeedback>
    );
  }
  return <UndoControl {...props} />;
}

export { QuestStatusControls, QuestStatusFeedback, UndoStatusChange };
